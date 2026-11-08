"""Deep media forensics: ELA, entropy, strings, carving, trailing-data checks.

Pure-Python implementation on top of Pillow. Every check degrades gracefully:
a failure in one analyzer never blocks the rest of the report.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import io
import math
import re
from typing import Any

try:
    from PIL import Image, ImageChops, ImageFilter
    _PIL = True
except ImportError:  # pragma: no cover
    _PIL = False

# ── File signatures for carving ──────────────────────────────────────────────
SIGNATURES: list[dict[str, Any]] = [
    {"name": "JPEG (JFIF)", "sig": b"\xff\xd8\xff", "ext": "jpg", "offset": 0},
    {"name": "PNG", "sig": b"\x89PNG\r\n\x1a\n", "ext": "png", "offset": 0},
    {"name": "GIF89a", "sig": b"GIF89a", "ext": "gif", "offset": 0},
    {"name": "GIF87a", "sig": b"GIF87a", "ext": "gif", "offset": 0},
    # Nested / embedded payloads
    {"name": "ZIP (OOXML/APK/JAR)", "sig": "PK\x03\x04", "ext": "zip", "offset": 0},
    {"name": "RAR archive", "sig": b"Rar!\x1a\x07", "ext": "rar", "offset": 0},
    {"name": "7z archive", "sig": b"7z\xbc\xaf'\x1c", "ext": "7z", "offset": 0},
    {"name": "PDF document", "sig": b"%PDF-", "ext": "pdf", "offset": 0},
    {"name": "ELF binary", "sig": b"\x7fELF", "ext": "elf", "offset": 0},
    {"name": "Windows PE (MZ)", "sig": b"MZ", "ext": "exe", "offset": 0},
    {"name": "SQLite DB", "sig": b"SQLite format 3\x00", "ext": "sqlite", "offset": 0},
]

HIGH_ENTROPY_THRESHOLD = 7.5          # bits/byte; >7.5 suggests encrypted/compressed payload
ENTROPY_BLOCK = 256                   # bytes per entropy block
MAX_EMBEDDED_FILES = 20               # cap carving to avoid memory blowup
MIN_CARVE_SIZE = 64                   # ignore sub-64-byte hits
MAX_STRINGS_SHOWN = 40                # cap embedded strings shown in the report

_URL_RE = re.compile(rb"https?://[^\s\"'<>\\]{4,300}")
_IP_RE = re.compile(rb"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_EMAIL_RE = re.compile(rb"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_CLI_RE = re.compile(
    rb"(?:curl|wget|python[23]?|powershell|cmd\.exe|/bin/(?:ba)?sh)\b[^\n\r]{0,200}",
    re.IGNORECASE,
)


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} B"
        n /= 1024
    return f"{n:.1f} GB"


# ═══ 1. ERROR LEVEL ANALYSIS (ELA) ═══════════════════════════════════════════
def error_level_analysis(data: bytes, filename: str) -> dict[str, Any]:
    """Re-save at JPEG quality 90 and diff. Tampered regions re-compress
    differently → high error levels. No NumPy required."""
    out: dict[str, Any] = {"available": False, "error": None, "ela_png": None,
                           "stats": {}, "findings": []}
    if not _PIL:
        out["error"] = "Pillow not installed"
        return out

    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "bmp"}:
        out["error"] = f"ELA supports raster images only (got .{ext})"
        return out

    try:
        img = Image.open(io.BytesIO(data))
        img.load()
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Run ELA at reduced resolution for speed on large files
        scale = 1.0
        if max(img.size) > 1600:
            scale = 1600 / max(img.size)
            img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))),
                             Image.LANCZOS)

        # Re-save as JPEG q90 and diff
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        buf.seek(0)
        recompressed = Image.open(buf)
        recompressed.load()

        ela = ImageChops.difference(img.convert("RGB"), recompressed.convert("RGB"))
        # Amplify so faint differences are visible
        ela = ela.point(lambda p: min(255, p * 12))
        ela = ela.convert("L")
        ela = ela.filter(ImageFilter.GaussianBlur(radius=1))

        hist = ela.histogram()
        total = sum(hist) or 1
        mean = sum(i * c for i, c in enumerate(hist)) / total
        bright = sum(c for i, c in enumerate(hist) if i >= 40) / total
        regions = sum(1 for i, c in enumerate(hist) if i >= 40)

        out["available"] = ran_ok = True
        out["stats"] = {
            "mean_error": round(mean, 2),
            "bright_ratio": round(bright, 4),
            "bright_regions": regions,
            "scale": round(scale, 3),
        }
        # Encode the ELA visualization as data URI for the frontend panel
        png = io.BytesIO()
        ela.save(png, format="PNG")
        out["ela_png"] = "data:image/png;base64," + base64.b64encode(png.getvalue()).decode()

        if mean > 40:
            out["findings"].append("Very high mean ELA error — image likely heavily re-saved or composited")
        elif mean > 18:
            out["findings"].append("Elevated ELA error — possible edited or re-compressed region")
        else:
            out["findings"].append("Low ELA error — image appears to be a single-generation encode")
        if bright > 0.15:
            out["findings"].append(f"Bright-region ratio {bright:.1%} — possible edited patch")
    except Exception as exc:
        out["error"] = f"ELA failed: {exc}"
    return out


# ═══ 2. BYTE ENTROPY MAP ═════════════════════════════════════════════════════
def entropy_map(data: bytes, block: int = ENTROPY_BLOCK) -> dict[str, Any]:
    """Sliding-window Shannon entropy over the file; flags encrypted/compressed
    regions that often hide appended payloads or steganography."""
    out: dict[str, Any] = {"available": True, "global": None, "blocks": [],
                           "high_entropy_regions": [], "max_block_entropy": 0.0}
    n = len(data)
    if n == 0:
        out["available"] = False
        return out

    def shannon(chunk: bytes) -> float:
        if not chunk:
            return 0.0
        freq: dict[int, int] = {}
        for b in chunk:
            freq[b] = freq.get(b, 0) + 1
        e = 0.0
        for c in freq.values():
            p = c / len(chunk)
            e -= p * math.log2(p)
        return round(e, 3)

    out["global"] = shannon(data)
    blocks: list[float] = []
    for i in range(0, n, block):
        chunk = data[i:i + block]
        e = shannon(chunk)
        blocks.append(e)
        if e > HIGH_ENTROPY_THRESHOLD:
            out["high_entropy_regions"].append(
                {"offset": i, "end": min(i + block, n), "entropy": e,
                 "offset_hex": hex(i), "size": len(chunk)}
            )
        out["max_block_entropy"] = max(out["max_block_entropy"], e)
    out["blocks"] = blocks[:1000]  # cap for the report
    out["block_count"] = len(blocks)
    return out


# ═══ 3. EMBEDDED STRINGS (URLs / IPs / emails / commands) ════════════════════
def extract_strings(data: bytes) -> dict[str, Any]:
    """ASCII/UTF-16 strings relevant to OSINT: URLs, IPs, emails, shell commands."""
    out: dict[str, Any] = {"urls": [], "ips": [], "emails": [], "commands": [], "count": 0}

    def _clean(seq: list[bytes]) -> list[str]:
        seen: set[str] = set()
        uniq: list[str] = []
        for raw in seq:
            s = raw.decode("utf-8", errors="ignore").strip().rstrip(".,;:!?)]}'\"")
            if s and s.lower() not in seen:
                seen.add(s.lower())
                uniq.append(s)
        return uniq

    out["urls"] = _clean(_URL_RE.findall(data))[:MAX_STRINGS_SHOWN]
    out["ips"] = _clean(_IP_RE.findall(data))[:MAX_STRINGS_SHOWN]
    out["emails"] = _clean(_EMAIL_RE.findall(data))[:MAX_STRINGS_SHOWN]
    out["commands"] = _clean(_CLI_RE.findall(data))[:MAX_STRINGS_SHOWN]
    out["count"] = len(out["urls"]) + len(out["ips"]) + len(out["emails"]) + len(out["commands"])
    return out


# ═══ 4. FILE SIGNATURE CARVING (embedded files / polyglots) ══════════════════
def carve_signatures(data: bytes) -> dict[str, Any]:
    """Scan for known file signatures to detect appended/embedded payloads,
    polyglot files, or steganographic containers."""
    out: dict[str, Any] = {"embedded_files": [], "count": 0, "suspicious": False}
    container_ext = {(filename := None) or "jpg", "jpeg", "png", "gif", "webp", "bmp"}
    seen: set[tuple[str, int]] = set()
    for spec in SIGNATURES:
        sig = spec["sig"]
        if isinstance(sig, str):
            sig = sig.encode("latin-1")
        start = 0
        while True:
            idx = data.find(sig, start)
            if idx < 0:
                break
            start = idx + 1
            # Skip the header of the container itself
            if idx == 0:
                continue
            key = (spec["name"], idx)
            if key in seen:
                continue
            seen.add(key)
            size_hint = None
            # For ZIP EOCD, the comment-length field lets us estimate payload size
            if spec["ext"] == "zip-eocd" and idx + 22 <= len(data):
                size_hint = int.from_bytes(data[idx + 20:idx + 22], "little")
            elif spec["ext"] == "png" and idx + 8 <= len(data):
                try:
                    w = int.from_bytes(data[idx + 8:idx + 12], "big")
                    size_hint = w
                except Exception:
                    pass
            out["embedded_files"].append({
                "type": spec["name"],
                "ext": spec["ext"],
                "offset": idx,
                "offset_hex": hex(idx),
                "relative_pos": f"{idx / max(1, len(data)):.1%} into file",
                "size_hint": size_hint,
            })
            if len(out["embedded_files"]) >= MAX_EMBEDDED_FILES:
                out["count"] = len(out["embedded_files"])
                out["suspicious"] = True
                return out
    out["count"] = len(out["embedded_files"])
    # An embedded executable, archive or second image inside a media file is suspicious
    suspicious_types = {"exe", "elf", "zip", "rar", "7z", "pdf", "sqlite"}
    out["suspicious"] = any(f["ext"] in suspicious_types for f in out["embedded_files"])
    return out


# ═══ 5. TRAILING DATA AFTER IMAGE EOF MARKER ═════════════════════════════════
def trailing_data(data: bytes, filename: str) -> dict[str, Any]:
    """Detect bytes appended after the image's End-Of-Image marker — a classic
    steganography / payload-hiding spot."""
    out: dict[str, Any] = {"present": False, "bytes": 0, "offset": None, "offset_hex": None,
                           "content_type": "unknown", "human_size": None, "preview": None}
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()

    eof_offset: int | None = None
    if ext in {"jpg", "jpeg"}:
        # FFD9 = End Of Image
        idx = data.rfind(b"\xff\xd9")
        if idx >= 0:
            eof_offset = idx + 2
    elif ext == "png":
        idx = data.rfind(b"IEND\xae\x42\x60\x82")
        if idx >= 0:
            eof_offset = idx + 8
    elif ext == "gif":
        idx = data.rfind(b"\x00\x3b")  # 0x3B trailer
        if idx >= 0:
            eof_offset = idx + 1
    elif ext == "webp":
        # RIFF size field at offset 4, + 8 header bytes
        if len(data) >= 12 and data[0:4] == b"RIFF":
            declared = int.from_bytes(data[4:8], "little") + 8
            if declared < len(data):
                eof_offset = declared
    if eof_offset is None:
        return out

    extra = len(data) - eof_offset
    if extra <= 0:
        return out
    tail = data[eof_offset:eof_offset + 512]
    out["present"] = True
    out["bytes"] = extra
    out["human_size"] = _human(extra)
    out["offset"] = eof_offset
    out["offset_hex"] = hex(eof_offset)

    # Identify what the trailing blob looks like
    if tail.startswith(b"PK"):
        out["content_type"] = "ZIP archive"
    elif tail.startswith(b"%PDF"):
        out["content_type"] = "PDF document"
    elif tail.startswith(b"\x7fELF"):
        out["content_type"] = "ELF executable"
    elif tail.startswith(b"MZ"):
        out["content_type"] = "Windows executable (PE)"
    elif tail.startswith(b"\x89PNG"):
        out["content_type"] = "Embedded PNG image"
    elif tail.startswith(b"\xff\xd8\xff"):
        out["content_type"] = "Embedded JPEG image"
    elif tail.startswith(b"Rar!"):
        out["content_type"] = "RAR archive"
    elif _URL_RE.search(tail) or _EMAIL_RE.search(tail):
        out["content_type"] = "Text/script with URLs or emails"
    else:
        printable = sum(1 for b in tail if 32 <= b < 127 or b in (9, 10, 13))
        ratio = printable / max(1, len(tail))
        out["content_type"] = ("Plain text / script" if ratio > 0.7
                               else "Binary (unknown type)")
    # Hex preview of the first 96 bytes
    out["preview"] = tail[:96].hex(" ")
    return out


# ═══ 6. METADATA INTEGRITY CROSS-CHECKS ══════════════════════════════════════
def integrity_checks(data: bytes, exif: dict[str, Any]) -> dict[str, Any]:
    """Sanity checks that catch sloppy edits and metadata fabrications."""
    out: dict[str, Any] = {"checks": [], "suspicious": False}
    add = out["checks"].append

    # Software tag often reveals the editor
    software = exif.get("Software") or exif.get("Exif.Software")
    if software:
        s = str(software).lower()
        editor_hints = ("photoshop", "gimp", "lightroom", "snapseed", "picsart", "canva",
                        "figma", "paint", "affinity", "pixlr", "faceapp", "meitu")
        hit = next((h for h in editor_hints if h in s), None)
        if hit:
            out["suspicious"] = True
            add({"name": "Editing software", "value": str(software),
                 "verdict": "SUSPICIOUS",
                 "note": f"Image processed with '{hit}' — content may be altered"})

    # ModifyDate vs DateTimeOriginal mismatch → re-save after capture
    dto = exif.get("DateTimeOriginal") or exif.get("Exif.DateTimeOriginal")
    mod = exif.get("ModifyDate") or exif.get("DateTime")
    if dto and mod and str(dto) != str(mod):
        out["suspicious"] = True
        add({"name": "Date mismatch", "value": f"original={dto} / modified={mod}",
             "verdict": "SUSPICIOUS",
             "note": "File was modified after the original capture"})

    # XMP-only tools (e.g. AI generators) leave no camera Make/Model but do leave Software
    if exif.get("Software") and not exif.get("Make") and not exif.get("Model"):
        out["suspicious"] = True
        add({"name": "No camera ID but Software present",
             "value": str(exif.get("Software")),
             "verdict": "SUSPICIOUS",
             "note": "Editing-software tag with no camera Make/Model — possibly generated or heavily edited"})

    # GPS accuracy sanity: absurd precision or 0/0
    gps = exif.get("GPSInfo")
    if isinstance(gps, dict):
        lat = gps.get("GPSLatitude")
        lon = gps.get("GPSLongitude")
        if lat and lon:
            try:
                la = float(lat[0]) if isinstance(lat, (list, tuple)) else float(lat)
                lo = float(lon[0]) if isinstance(lon, (list, tuple)) else float(lon)
                if la == 0.0 and lo == 0.0:
                    out["suspicious"] = True
                    add({"name": "GPS 0,0", "value": "0.000000, 0.000000",
                         "verdict": "SUSPICIOUS",
                         "note": "Null-island coordinates — GPS spoofed or cleared"})
            except (TypeError, ValueError, IndexError):
                pass

    # Hash of the raw bytes for chain-of-custody reference
    out["sha256_deep"] = _sha256(data)
    out["md5_deep"] = hashlib.md5(data).hexdigest()
    if not out["checks"]:
        add({"name": "Basic integrity", "value": "no anomalies detected",
             "verdict": "OK", "note": "No editing-software, date or GPS anomalies found"})
    return out


# ═══ AGGREGATOR ══════════════════════════════════════════════════════════════
def deep_analysis(data: bytes, filename: str, exif: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run all deep analyzers and produce one report + composite suspicion score."""
    exif = exif or {}
    ela = error_level_analysis(data, filename)
    entropy = entropy_map(data)
    strings = extract_strings(data)
    carved = carve_signatures(data)
    trailing = trailing_data(data, filename)
    integrity = integrity_checks(data, exif)

    # ── Composite suspicion score 0-100 ──
    score = 0
    if ela["available"]:
        mean = ela["stats"].get("mean_error", 0)
        score += min(30, int(mean / 2))
    if trailing["present"]:
        score += 20
    if carved["suspicious"]:
        score += 25
    if integrity["suspicious"]:
        score += 15
    if entropy["global"] is not None and entropy["global"] > HIGH_ENTROPY_THRESHOLD:
        score += 10
    if strings["count"] > 0:
        score += min(10, strings["count"])
    score = min(100, score)

    if score >= 70:
        level = "CRITICAL"
    elif score >= 45:
        level = "HIGH"
    elif score >= 20:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "ela": ela,
        "entropy": entropy,
        "strings": strings,
        "carved": carved,
        "trailing_data": trailing,
        "integrity": integrity,
        "suspicion_score": score,
        "suspicion_level": level,
        "summary": _summary(level, score, ela, trailing, carved, strings),
    }


def _summary(level: str, score: int, ela: dict, trailing: dict, carved: dict,
             strings: dict) -> str:
    bits: list[str] = []
    if level in {"HIGH", "CRITICAL"}:
        bits.append(f"DEEP SCAN: {level} suspicion ({score}/100)")
    else:
        bits.append(f"Deep scan: {level.lower()} suspicion ({score}/100)")
    if trailing["present"]:
        bits.append(f"{trailing['bytes']} trailing bytes after EOF ({trailing['content_type']})")
    if carved["count"]:
        bits.append(f"{carved['count']} embedded file signature(s)")
    if strings["count"]:
        bits.append(f"{strings['count']} OSINT string(s) extracted")
    if ela["available"] and ela["stats"].get("mean_error", 0) > 18:
        bits.append("ELA shows possible manipulation")
    return " · ".join(bits)
