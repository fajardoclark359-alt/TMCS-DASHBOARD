/**
 * Client-side deep media forensics (pure browser, no backend needed).
 * Mirrors backend/app/services/media_deep.py: entropy, OSINT strings,
 * signature carving, trailing-data detection and metadata integrity checks.
 * Works entirely in the browser — GitHub Pages compatible.
 */

const SIGNATURES = [
  { name: "JPEG (JFIF)", sig: new Uint8Array([0xff, 0xd8, 0xff]), ext: "jpg", offset: 0 },
  { name: "PNG", sig: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ext: "png", offset: 0 },
  { name: "GIF89a", sig: new TextEncoder().encode("GIF89a"), ext: "gif", offset: 0 },
  { name: "GIF87a", sig: new TextEncoder().encode("GIF87a"), ext: "gif", offset: 0 },
  { name: "ZIP (OOXML/APK/JAR)", sig: new TextEncoder().encode("PK\x03\x04"), ext: "zip", offset: 0 },
  { name: "RAR archive", sig: new TextEncoder().encode("Rar!\x1a\x07"), ext: "rar", offset: 0 },
  { name: "7z archive", sig: new Uint8Array([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]), ext: "7z", offset: 0 },
  { name: "PDF document", sig: new TextEncoder().encode("%PDF-"), ext: "pdf", offset: 0 },
  { name: "ELF binary", sig: new Uint8Array([0x7f, 0x45, 0x4c, 0x46]), ext: "elf", offset: 0 },
  { name: "Windows PE (MZ)", sig: new TextEncoder().encode("MZ"), ext: "exe", offset: 0 },
  { name: "SQLite DB", sig: new TextEncoder().encode("SQLite format 3\x00"), ext: "sqlite", offset: 0 },
]

const HIGH_ENTROPY_THRESHOLD = 7.5        // bits/byte
const ENTROPY_BLOCK = 256                 // bytes per block
const MAX_EMBEDDED_FILES = 20             // cap carving
const MIN_CARVE_SIZE = 64                 // ignore sub-64-byte hits
const MAX_STRINGS_SHOWN = 40              // cap embedded strings shown

const _URL_RE = /https?:\/\/[^\s"'<>\\]{4,300}/g
const _IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const _EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const _CLI_RE = /(?:curl|wget|python[23]?|powershell|cmd\.exe|\/bin\/(?:ba)?sh)\b[\n\r]{0,200}/gi

async function sha256Hex(buffer) {
  const h = await crypto.subtle.digest("SHA-256", buffer)
  const a = Array.from(new Uint8Array(h))
  return a.map((b) => b.toString(16).padStart(2, "0")).join("")
}

function humanSize(n) {
  const units = ["B", "KB", "MB", "GB"]
  let i = 0, size = n
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return i === 0 ? `${size} B` : `${size.toFixed(1)} ${units[i]}`
}

function shannon(chunk) {
  if (!chunk.length) return 0.0
  const freq = {}
  for (let i = 0; i < chunk.length; i++) {
    const b = chunk[i]
    freq[b] = (freq[b] || 0) + 1
  }
  let e = 0.0
  for (const c of Object.values(freq)) {
    const p = c / chunk.length
    e -= p * Math.log2(p)
  }
  return Math.round(e * 1000) / 1000
}

function findAll(data, sig) {
  const hits = []
  const len = sig.length
  for (let i = 0; i <= data.length - len; i++) {
    let match = true
    for (let j = 0; j < len; j++) {
      if (data[i + j] !== sig[j]) { match = false; break }
    }
    if (match) hits.push(i)
  }
  return hits
}

// ═══ ENTROPY MAP ════════════════════════════════════════════════════════════════
async function entropyMap(data) {
  const out = { available: true, global: null, blocks: [], high_entropy_regions: [], max_block_entropy: 0.0 }
  if (data.length === 0) { out.available = false; return out }

  out.global = shannon(data)
  const blocks = []
  for (let i = 0; i < data.length; i += ENTROPY_BLOCK) {
    const chunk = data.slice(i, i + ENTROPY_BLOCK)
    const e = shannon(chunk)
    blocks.push(e)
    if (e > HIGH_ENTROPY_THRESHOLD) {
      out.high_entropy_regions.push({ offset: i, end: Math.min(i + ENTROPY_BLOCK, data.length), entropy: e, offset_hex: `0x${i.toString(16)}`, size: chunk.length })
    }
    out.max_block_entropy = Math.max(out.max_block_entropy, e)
  }
  out.blocks = blocks.slice(0, 1000)
  out.block_count = blocks.length
  return out
}

// ═══ EMBEDDED STRINGS ═══════════════════════════════════════════════════════════
function extractStrings(data) {
  const out = { urls: [], ips: [], emails: [], commands: [], count: 0 }
  const seen = new Set()
  const clean = (seqs) => {
    const uniq = []
    for (const raw of seqs) {
      const s = new TextDecoder().decode(raw).replace(/[.,;:!?)}\]]'"/g, "").trim()
      if (!s || seen.has(s.toLowerCase())) continue
      seen.add(s.toLowerCase())
      uniq.push(s)
    }
    return uniq
  }

  // ASCII strings of length >= 4
  const ascii = []
  let cur = []
  for (let i = 0; i < data.length; i++) {
    const b = data[i]
    if (b >= 32 && b < 127) { cur.push(b) }
    else { if (cur.length >= 4) ascii.push(new Uint8Array(cur)); cur = [] }
  }
  if (cur.length >= 4) ascii.push(new Uint8Array(cur))

  const text = ascii.map((a) => new TextDecoder().decode(a)).join("\n")
  const urlMatches = [...text.matchAll(_URL_RE)].map((m) => m[0])
  const ipMatches = [...text.matchAll(_IP_RE)].map((m) => m[0])
  const emailMatches = [...text.matchAll(_EMAIL_RE)].map((m) => m[0])
  const cmdMatches = [...text.matchAll(_CLI_RE)].map((m) => m[0])

  out.urls = clean(urlMatches).slice(0, MAX_STRINGS_SHOWN)
  out.ips = clean(ipMatches).slice(0, MAX_STRINGS_SHOWN)
  out.emails = clean(emailMatches).slice(0, MAX_STRINGS_SHOWN)
  out.commands = clean(cmdMatches).slice(0, MAX_STRINGS_SHOWN)
  out.count = out.urls.length + out.ips.length + out.emails.length + out.commands.length
  return out
}

// ═══ FILE SIGNATURE CARVING ═════════════════════════════════════════════════════
function carveSignatures(data) {
  const out = { embedded_files: [], count: 0, suspicious: false }
  const seen = new Set()
  const suspiciousTypes = new Set(["exe", "elf", "zip", "rar", "7z", "pdf", "sqlite"])

  for (const spec of SIGNATURES) {
    const hits = findAll(data, spec.sig)
    for (const idx of hits) {
      if (idx === 0) continue // skip container header itself
      const key = `${spec.name}:${idx}`
      if (seen.has(key)) continue
      seen.add(key)

      let sizeHint = null
      if (spec.ext === "png" && idx + 8 <= data.length) {
        try { sizeHint = new DataView(data.buffer, data.byteOffset + idx + 8, 4).getUint32(0, false) } catch {}
      }

      out.embedded_files.push({
        type: spec.name, ext: spec.ext, offset: idx, offset_hex: `0x${idx.toString(16)}`,
        relative_pos: `${((idx / Math.max(1, data.length)) * 100).toFixed(1)}% into file`, size_hint: sizeHint,
      })
      if (out.embedded_files.length >= MAX_EMBEDDED_FILES) { out.suspicious = true; break }
    }
    if (out.suspicious) break
  }
  out.count = out.embedded_files.length
  out.suspicious = out.suspicious || out.embedded_files.some((f) => suspiciousTypes.has(f.ext))
  return out
}

// ═══ TRAILING DATA AFTER EOF ═════════════════════════════════════════════════════
function trailingData(data, filename) {
  const out = { present: false, bytes: 0, offset: null, offset_hex: null, content_type: "unknown", human_size: null, preview: null }
  const ext = (filename || "").split(".").pop().toLowerCase()

  let eofOffset = null
  if (ext === "jpg" || ext === "jpeg") {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] === 0xff && data[i + 1] === 0xd9) { eofOffset = i + 2; break }
    }
  } else if (ext === "png") {
    const trailer = new Uint8Array([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]) // IEND + CRC
    for (let i = data.length - trailer.length; i >= 0; i--) {
      let match = true
      for (let j = 0; j < trailer.length; j++) { if (data[i + j] !== trailer[j]) { match = false; break } }
      if (match) { eofOffset = i + trailer.length; break }
    }
  } else if (ext === "gif") {
    for (let i = data.length - 1; i >= 0; i--) { if (data[i] === 0x00 && data[i + 1] === 0x3b) { eofOffset = i + 1; break } }
  } else if (ext === "webp" && data.length >= 12) {
    const riff = new TextDecoder().decode(data.slice(0, 4))
    if (riff === "RIFF") {
      const declared = new DataView(data.buffer, data.byteOffset + 4, 4).getUint32(0, true) + 8
      if (declared < data.length) eofOffset = declared
    }
  }
  if (eofOffset === null) return out

  const extra = data.length - eofOffset
  if (extra <= 0) return out

  const tail = data.slice(eofOffset, eofOffset + 512)
  out.present = true
  out.bytes = extra
  out.human_size = humanSize(extra)
  out.offset = eofOffset
  out.offset_hex = `0x${eofOffset.toString(16)}`

  const head = tail.slice(0, 4)
  const headStr = new TextDecoder().decode(head)
  if (head[0] === 0x50 && head[1] === 0x4b) out.content_type = "ZIP archive"
  else if (headStr === "%PDF") out.content_type = "PDF document"
  else if (head[0] === 0x7f && head[1] === 0x45 && head[2] === 0x4c && head[3] === 0x46) out.content_type = "ELF executable"
  else if (head[0] === 0x4d && head[1] === 0x5a) out.content_type = "Windows executable (PE)"
  else if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) out.content_type = "Embedded PNG image"
  else if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) out.content_type = "Embedded JPEG image"
  else if (headStr === "Rar!") out.content_type = "RAR archive"
  else if (_URL_RE.test(new TextDecoder().decode(tail)) || _EMAIL_RE.test(new TextDecoder().decode(tail))) out.content_type = "Text/script with URLs or emails"
  else {
    const printable = [...tail].filter((b) => (b >= 32 && b < 127) || b === 9 || b === 10 || b === 13).length
    const ratio = printable / Math.max(1, tail.length)
    out.content_type = ratio > 0.7 ? "Plain text / script" : "Binary (unknown type)"
  }

  out.preview = [...tail.slice(0, 96)].map((b) => b.toString(16).padStart(2, "0")).join(" ")
  return out
}

// ═══ METADATA INTEGRITY CROSS-CHECKS ══════════════════════════════════════════════
function integrityChecks(exif) {
  const out = { checks: [], suspicious: false }
  const add = (name, value, verdict, note) => { out.checks.push({ name, value, verdict, note }); if (verdict === "SUSPICIOUS") out.suspicious = true }

  const software = exif.Software || exif["Exif.Software"]
  if (software) {
    const s = String(software).toLowerCase()
    const hit = ["photoshop", "gimp", "lightroom", "snapseed", "picsart", "canva", "figma", "paint", "affinity", "pixlr", "faceapp", "meitu"].find((h) => s.includes(h))
    if (hit) add("Editing software", String(software), "SUSPICIOUS", `Image processed with '${hit}' — content may be altered`)
  }

  const dto = exif.DateTimeOriginal || exif["Exif.DateTimeOriginal"]
  const mod = exif.ModifyDate || exif.DateTime
  if (dto && mod && String(dto) !== String(mod)) {
    add("Date mismatch", `original=${dto} / modified=${mod}`, "SUSPICIOUS", "File was modified after the original capture")
  }

  if (exif.Software && !exif.Make && !exif.Model) {
    add("No camera ID but Software present", String(exif.Software), "SUSPICIOUS", "Editing-software tag with no camera Make/Model — possibly generated or heavily edited")
  }

  const gps = exif.GPSInfo
  if (gps && typeof gps === "object" && gps.GPSLatitude != null && gps.GPSLongitude != null) {
    try {
      const la = Array.isArray(gps.GPSLatitude) ? Number(gps.GPSLatitude[0]) : Number(gps.GPSLatitude)
      const lo = Array.isArray(gps.GPSLongitude) ? Number(gps.GPSLongitude[0]) : Number(gps.GPSLongitude)
      if (la === 0 && lo === 0) add("GPS 0,0", "0.000000, 0.000000", "SUSPICIOUS", "Null-island coordinates — GPS spoofed or cleared")
    } catch {}
  }

  if (!out.checks.length) add("Basic integrity", "no anomalies detected", "OK", "No editing-software, date or GPS anomalies found")
  return out
}

function summary(level, score, trailing, carved, strings) {
  const bits = []
  bits.push(["HIGH", "CRITICAL"].includes(level) ? `DEEP SCAN: ${level} suspicion (${score}/100)` : `Deep scan: ${level.toLowerCase()} suspicion (${score}/100)`)
  if (trailing.present) bits.push(`${trailing.bytes} trailing bytes after EOF (${trailing.content_type})`)
  if (carved.count) bits.push(`${carved.count} embedded file signature(s)`)
  if (strings.count) bits.push(`${strings.count} OSINT string(s) extracted`)
  return bits.join(" · ")
}

/**
 * Run client-side deep forensics on a file.
 * @param {File} file
 * @param {Object} base - result of clientAnalyzeMedia (for exif/risk)
 * @returns {Promise<Object>} deep report matching the backend deep-analysis shape
 */
export async function clientDeepAnalyzeMedia(file, base = {}) {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)
  const exif = base?.exif || {}
  const filename = file.name || "upload"

  const [entropy, strings, carved, trailing, integrity] = await Promise.all([
    entropyMap(data),
    extractStrings(data),
    carveSignatures(data),
    trailingData(data, filename),
    integrityChecks(exif),
  ])

  // Composite suspicion score 0-100 (mirrors backend media_deep.py)
  let score = 0
  // ELA unavailable client-side → use entropy as proxy
  if (entropy.global != null && entropy.global > HIGH_ENTROPY_THRESHOLD) score += 10
  if (trailing.present) score += 20
  if (carved.suspicious) score += 25
  if (integrity.suspicious) score += 15
  if (strings.count > 0) score += Math.min(10, strings.count)
  score = Math.min(100, score)

  let level = "LOW"
  if (score >= 70) level = "CRITICAL"
  else if (score >= 45) level = "HIGH"
  else if (score >= 20) level = "MEDIUM"

  const ela = { available: false, error: "ELA requires the backend (Pillow re-save diff)", stats: {}, findings: ["ELA not available client-side — install backend for JPEG re-save difference analysis"] }

  const deep = {
    ela,
    entropy,
    strings,
    carved,
    trailing_data: trailing,
    integrity,
    suspicion_score: score,
    suspicion_level: level,
    summary: summary(level, score, trailing, carved, strings),
    client_mode: true,
  }
  return deep
}
