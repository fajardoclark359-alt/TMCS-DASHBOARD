"""Photo & video metadata (EXIF / container tags) extraction for OSINT forensics.

Uses Pillow for images and mutagen for video/audio containers. Falls back
gracefully when a format has no embedded metadata.
"""
import hashlib
import io
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    from PIL import Image, ExifTags
    _PIL_AVAILABLE = True
except ImportError:  # pragma: no cover
    _PIL_AVAILABLE = False

try:
    import mutagen
    _MUTAGEN_AVAILABLE = True
except ImportError:  # pragma: no cover
    _MUTAGEN_AVAILABLE = False

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp", ".bmp", ".gif", ".heic", ".heif"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".3gp", ".m4v", ".mts"}

_GPS_TAGS = {"GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef", "GPSAltitude", "GPSAltitudeRef",
             "GPSTimeStamp", "GPSDateStamp", "GPSImgDirection", "GPSImgDirectionRef"}
_SENSITIVE_TAGS = {"GPSInfo", "MakerNote", "SerialNumber", "CameraSerialNumber", "LensSerialNumber",
                   "OwnerName", "Author", "Artist", "Copyright", "UserComment", "ImageDescription"}


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _md5(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def _human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} B"
        n /= 1024
    return f"{n:.1f} GB"


def _rational_to_float(value: Any) -> Optional[float]:
    try:
        if isinstance(value, (tuple, list)) and len(value) == 2:
            num, den = value
            return float(num) / float(den) if den else None
        return float(value)
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _dms_to_decimal(dms: Any, ref: Any) -> Optional[float]:
    try:
        d = _rational_to_float(dms[0])
        m = _rational_to_float(dms[1])
        s = _rational_to_float(dms[2])
        if d is None or m is None or s is None:
            return None
        dec = d + m / 60.0 + s / 3600.0
        if str(ref).upper() in ("S", "W"):
            dec = -dec
        return round(dec, 6)
    except (TypeError, IndexError):
        return None


def _decode_value(value: Any) -> Any:
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8", errors="replace")[:500]
        except Exception:
            return f"<{len(value)} bytes>"
    if isinstance(value, tuple):
        return [_decode_value(v) for v in value]
    if hasattr(value, "numerator") and hasattr(value, "denominator"):  # IFDRational
        try:
            return float(value)
        except Exception:
            return str(value)
    return value


def _decode_ifd(ifd: Any, tag_names: Dict[int, str]) -> Dict[str, Any]:
    decoded: Dict[str, Any] = {}
    try:
        items = list(ifd.items())
    except Exception:
        return decoded
    for tag_id, value in items:
        tag = tag_names.get(tag_id, f"Tag_{tag_id}")
        if tag in ("ExifOffset", "InteropOffset", "GPSInfo") and not hasattr(value, "items"):
            continue  # IFD offset pointer, not real metadata (real IFDs read via get_ifd)
        if hasattr(value, "items"):  # nested IFD object
            continue
        decoded[tag] = _decode_value(value)
    return decoded


def _decode_exif(image: "Image.Image") -> Dict[str, Any]:
    try:
        top = image.getexif()
    except Exception:
        return {}
    if not top:
        return {}
    decoded = _decode_ifd(top, ExifTags.TAGS)
    # EXIF sub-IFD holds DateTimeOriginal/LensModel/...; GPS IFD holds location.
    # Pillow exposes them via get_ifd(); top-level GPSInfo is just an offset int.
    for ifd_id in (0x8769, 0xA005):
        try:
            sub = top.get_ifd(ifd_id)
        except Exception:
            continue
        for k, v in _decode_ifd(sub, ExifTags.TAGS).items():
            decoded.setdefault(k, v)
    gps_raw: Dict[str, Any] = {}
    try:
        gps_ifd = top.get_ifd(0x8825)
        for k, v in list(gps_ifd.items()):
            gps_raw[ExifTags.GPSTAGS.get(k, f"GPS_{k}")] = _decode_value(v)
    except Exception:
        pass
    if gps_raw:
        decoded["GPSInfo"] = gps_raw
    return decoded


def _extract_gps(exif: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    gps = exif.get("GPSInfo")
    if not isinstance(gps, dict):
        return None
    lat = _dms_to_decimal(gps.get("GPSLatitude"), gps.get("GPSLatitudeRef"))
    lon = _dms_to_decimal(gps.get("GPSLongitude"), gps.get("GPSLongitudeRef"))
    if lat is None or lon is None:
        return None
    alt = _rational_to_float(gps.get("GPSAltitude"))
    out: Dict[str, Any] = {"latitude": lat, "longitude": lon,
                           "maps_url": f"https://www.google.com/maps?q={lat},{lon}"}
    if alt is not None:
        out["altitude_m"] = round(alt, 2)
    if gps.get("GPSDateStamp"):
        out["gps_date"] = str(gps.get("GPSDateStamp"))
    return out


def _extract_image_metadata(data: bytes) -> Dict[str, Any]:
    result: Dict[str, Any] = {"exif": {}, "gps": None, "image": {}}
    if not _PIL_AVAILABLE:
        result["warning"] = "Pillow not installed; EXIF extraction unavailable"
        return result
    try:
        with Image.open(io.BytesIO(data)) as img:
            result["image"] = {"format": img.format, "mode": img.mode,
                               "width": img.width, "height": img.height}
            exif = _decode_exif(img)
            result["exif"] = exif
            result["gps"] = _extract_gps(exif)
    except Exception as exc:
        result["warning"] = f"Could not parse image: {exc}"
    return result


def _extract_video_metadata(data: bytes, filename: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {"tags": {}, "streams": {}, "gps": None}
    if not _MUTAGEN_AVAILABLE:
        result["warning"] = "mutagen not installed; container tag extraction unavailable"
        return result
    import tempfile
    suffix = os.path.splitext(filename)[1] or ".mp4"
    tmp = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as fh:
            fh.write(data)
            tmp = fh.name
        media = mutagen.File(tmp, easy=False)
        if media is None:
            result["warning"] = "Unrecognized or unsupported video container"
            return result
        if getattr(media, "tags", None):
            for key in media.tags.keys():
                try:
                    val = media.tags[key]
                    text = str(val[0]) if isinstance(val, list) and val else str(val)
                    result["tags"][str(key)] = text[:500]
                except Exception:
                    continue
        info = getattr(media, "info", None)
        if info is not None:
            for attr in ("length", "bitrate", "sample_rate", "channels", "width", "height", "fps"):
                if hasattr(info, attr):
                    try:
                        result["streams"][attr] = getattr(info, attr)
                    except Exception:
                        continue
        result["container"] = type(media).__name__
    except Exception as exc:
        result["warning"] = f"Could not parse video: {exc}"
    finally:
        if tmp and os.path.exists(tmp):
            try:
                os.remove(tmp)
            except OSError:
                pass
    return result


def _assess_risk(exif: Dict[str, Any], gps: Optional[Dict[str, Any]],
                 tags: Dict[str, Any], kind: str) -> Dict[str, Any]:
    flags: List[str] = []
    score = 0
    if gps:
        flags.append("GPS coordinates embedded — exact location disclosed")
        score += 45
    flat_keys = set(exif.keys()) | set(tags.keys())
    device_bits = [str(exif.get(k, "")) for k in ("Make", "Model", "Software", "LensModel") if exif.get(k)]
    device_bits += [str(v) for k, v in tags.items() if any(s in k.lower() for s in ("make", "model", "encoder", "software", "tool"))]
    if any(device_bits):
        flags.append("Device/software identifiers present: " + "; ".join(b for b in device_bits if b)[:200])
        score += 20
    dt = exif.get("DateTimeOriginal") or exif.get("DateTime") or exif.get("CreateDate")
    if dt:
        flags.append(f"Capture timestamp present: {dt}")
        score += 10
    for sensitive in ("SerialNumber", "OwnerName", "Author", "Artist", "UserComment", "ImageDescription"):
        if exif.get(sensitive):
            flags.append(f"{sensitive} field present: {str(exif[sensitive])[:120]}")
            score += 10
    if kind == "image" and not exif:
        flags.append("No EXIF metadata found — already stripped or never embedded")
    if kind == "video" and not tags:
        flags.append("No container tags found — already stripped or minimal muxing")
    score = min(score, 100)
    level = "LOW" if score < 25 else "MEDIUM" if score < 50 else "HIGH" if score < 75 else "CRITICAL"
    return {"score": score, "risk_level": level, "flags": flags}


def analyze_media(data: bytes, filename: str, content_type: Optional[str] = None) -> Dict[str, Any]:
    ext = os.path.splitext(filename)[1].lower()
    if ext in IMAGE_EXTS:
        kind = "image"
    elif ext in VIDEO_EXTS:
        kind = "video"
    else:
        kind = "unknown"

    file_info = {"filename": os.path.basename(filename), "size_bytes": len(data),
                 "size_human": _human_size(len(data)),
                 "mime_type": content_type or "application/octet-stream",
                 "extension": ext, "kind": kind,
                 "sha256": _sha256(data), "md5": _md5(data)}

    exif: Dict[str, Any] = {}
    gps = None
    video: Dict[str, Any] = {}
    if kind == "image":
        parsed = _extract_image_metadata(data)
        exif, gps = parsed.get("exif", {}), parsed.get("gps")
        file_info.update(parsed.get("image", {}))
        if parsed.get("warning"):
            file_info["warning"] = parsed["warning"]
    elif kind == "video":
        video = _extract_video_metadata(data, filename)
        tags = video.get("tags", {})
        # best-effort GPS inside mp4 tags (e.g. com.apple.quicktime.location)
        for k, v in tags.items():
            if "location" in k.lower() and isinstance(v, str) and "," in v:
                try:
                    lat_s, lon_s = v.strip("+").split(",")[:2]
                    gps = {"latitude": float(lat_s), "longitude": float(lon_s),
                           "maps_url": f"https://www.google.com/maps?q={lat_s},{lon_s}",
                           "source": k}
                except (ValueError, IndexError):
                    pass

    risk = _assess_risk(exif, gps, video.get("tags", {}) if isinstance(video, dict) else {}, kind)

    return {"file": file_info, "kind": kind, "exif": exif, "gps": gps,
            "video": video, "risk": risk,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "tool": "OSINT TMC/CLARK media-forensics 1.0"}


def build_html_report(analysis: Dict[str, Any], title: str = "Media Metadata Report") -> str:
    f = analysis.get("file", {})
    gps = analysis.get("gps")
    exif = analysis.get("exif", {})
    video = analysis.get("video", {})
    risk = analysis.get("risk", {})

    def row(k: str, v: Any) -> str:
        return f"<tr><td>{k}</td><td>{v}</td></tr>"

    exif_rows = "".join(row(k, v) for k, v in exif.items() if k != "GPSInfo") or "<tr><td colspan=2>No EXIF tags</td></tr>"
    tag_rows = "".join(row(k, v) for k, v in video.get("tags", {}).items()) or "<tr><td colspan=2>No container tags</td></tr>"
    flags = "".join(f"<li>{x}</li>" for x in risk.get("flags", [])) or "<li>No risk flags</li>"
    gps_block = (f"<p>Latitude: {gps['latitude']}, Longitude: {gps['longitude']} "
                 f"<a href=\"{gps['maps_url']}\">View on Google Maps</a></p>" if gps
                 else "<p>No GPS coordinates embedded.</p>")
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title}</title>
<style>body{{font-family:monospace;background:#0f172a;color:#e2e8f0;max-width:900px;margin:2em auto;padding:0 1em}}
h1,h2{{color:#60a5fa}}table{{width:100%;border-collapse:collapse;margin:1em 0}}td{{border:1px solid #334155;padding:6px 10px;font-size:13px;word-break:break-all}}
td:first-child{{color:#94a3b8;width:30%}}.badge{{font-size:20px;font-weight:bold}}</style></head><body>
<h1>{title}</h1><p>Generated {analysis.get('analyzed_at','')} | {analysis.get('tool','')}</p>
<h2>Risk: <span class="badge">{risk.get('score','?')} / 100 — {risk.get('risk_level','')}</span></h2><ul>{flags}</ul>
<h2>File</h2><table>{row('filename', f.get('filename',''))}{row('size', f.get('size_human',''))}
{row('mime', f.get('mime_type',''))}{row('sha256', f.get('sha256',''))}{row('md5', f.get('md5',''))}</table>
<h2>Location</h2>{gps_block}<h2>EXIF / Image tags</h2><table>{exif_rows}</table>
<h2>Video container tags</h2><table>{tag_rows}</table></body></html>"""
