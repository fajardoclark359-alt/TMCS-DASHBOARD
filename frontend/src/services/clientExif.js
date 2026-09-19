/**
 * Client-side media metadata extraction using exifr.
 * Works entirely in the browser — no backend needed (GitHub Pages compatible).
 */

import exifr from 'exifr'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'bmp', 'gif', 'heic', 'heif']
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp', 'm4v']

function getExtension(filename) {
  const parts = (filename || '').split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function getKind(filename, mimeType) {
  const ext = getExtension(filename)
  if (IMAGE_EXTENSIONS.includes(ext) || (mimeType && mimeType.startsWith('image/'))) return 'image'
  if (VIDEO_EXTENSIONS.includes(ext) || (mimeType && mimeType.startsWith('video/'))) return 'video'
  return 'unknown'
}

function formatSize(bytes) {
  if (bytes == null) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

async function computeHash(file) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function buildGpsUrl(lat, lon) {
  return `https://www.google.com/maps?q=${lat},${lon}`
}

/**
 * Compute a risk score matching the backend logic:
 *   GPS embedded → +45
 *   Device identifiers (Make, Model, Software, LensModel, LensMake) → +20 each (cap at 20 total)
 *   Timestamps (DateTimeOriginal, CreateDate, ModifyDate) → +10 each (cap at 10)
 *   Sensitive fields (SerialNumber, OwnerName, Author, Artist, Copyright) → +10 each (cap at 30)
 *   Capped at 100
 */
function computeRisk(exifData, hasGps) {
  let score = 0
  const flags = []

  // GPS: +45
  if (hasGps) {
    score += 45
    flags.push('GPS coordinates embedded — exact location disclosed')
  }

  // Device identifiers: +20 (cap at 20)
  const deviceFields = ['Make', 'Model', 'Software', 'LensModel', 'LensMake']
  const foundDevice = deviceFields.filter((f) => exifData[f])
  if (foundDevice.length > 0) {
    score += 20
    flags.push(`Device/software identifiers present: ${foundDevice.join(', ')}`)
  }

  // Timestamps: +10 (cap at 10)
  const timeFields = ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSDateStamp']
  const foundTime = timeFields.filter((f) => exifData[f])
  if (foundTime.length > 0) {
    score += 10
    flags.push('Creation timestamp embedded — date/time of capture disclosed')
  }

  // Sensitive fields: +10 each, cap at 30
  const sensitiveFields = ['SerialNumber', 'OwnerName', 'Author', 'Artist', 'Copyright', 'ImageDescription', 'UserComment']
  const foundSensitive = sensitiveFields.filter((f) => exifData[f])
  if (foundSensitive.length > 0) {
    const add = Math.min(foundSensitive.length * 10, 30)
    score += add
    flags.push(`Sensitive metadata present: ${foundSensitive.join(', ')}`)
  }

  // Cap at 100
  score = Math.min(score, 100)

  let risk_level = 'LOW'
  if (score >= 70) risk_level = 'CRITICAL'
  else if (score >= 50) risk_level = 'HIGH'
  else if (score >= 25) risk_level = 'MEDIUM'

  return { score, risk_level, flags }
}

/**
 * Analyze a file entirely in the browser.
 * @param {File} file - The File object from an input or drag-and-drop
 * @returns {Promise<Object>} Analysis result matching the backend response shape
 */
export async function clientAnalyzeMedia(file) {
  const kind = getKind(file.name, file.type)
  const ext = getExtension(file.name)

  // Compute SHA-256 hash
  const sha256 = await computeHash(file)

  // Base file info
  const fileInfo = {
    filename: file.name,
    size_bytes: file.size,
    size_human: formatSize(file.size),
    mime_type: file.type || 'application/octet-stream',
    extension: ext,
    kind,
    sha256,
    md5: null, // MD5 requires a separate library; skip for client-side
  }

  const result = {
    file: fileInfo,
    kind,
    exif: {},
    gps: null,
    video: { tags: {}, streams: {} },
    risk: { score: 0, risk_level: 'LOW', flags: [] },
    analyzed_at: new Date().toISOString(),
    tool: 'OSINT TMC/CLARK media-forensics 1.0 (client-side)',
  }

  if (kind === 'image') {
    // Parse EXIF, IPTC, XMP, ICC, GPS — merged flat output (all fields at top level)
    const data = await exifr.parse(file, {
      exif: true,
      iptc: true,
      xmp: true,
      icc: true,
      gps: true,
      reviveValues: true,
      mergeOutput: true,
    })

    if (data) {
      const exifObj = {}
      const skipKeys = new Set([
        'latitude', 'longitude', 'altitude', 'altitudeRef',
        'GPSLatitude', 'GPSLongitude', 'GPSAltitude',
        'GPSLatitudeRef', 'GPSLongitudeRef',
        // exifr computed keys we don't want duplicated
        'rawValue', 'description',
      ])
      for (const [k, v] of Object.entries(data)) {
        if (skipKeys.has(k)) continue
        if (v === undefined || v === null) continue
        if (typeof v === 'object' && typeof v.byteLength !== 'undefined') continue // typed arrays
        exifObj[k] = v
      }

      result.exif = exifObj

      // Extract GPS from merged flat data
      if (data.latitude != null && data.longitude != null) {
        result.gps = {
          latitude: data.latitude,
          longitude: data.longitude,
          maps_url: buildGpsUrl(data.latitude, data.longitude),
          altitude_m: data.altitude ?? data.GPSAltitude ?? null,
          gps_date: data.GPSDateStamp || null,
        }
      }

      // Extract GPS from merged flat data
      if (data.latitude != null && data.longitude != null) {
        result.gps = {
          latitude: data.latitude,
          longitude: data.longitude,
          maps_url: buildGpsUrl(data.latitude, data.longitude),
          altitude_m: data.altitude ?? data.GPSAltitude ?? null,
          gps_date: data.GPSDateStamp || null,
        }
      }

      // Extract dimensions if available
      if (exifObj.ImageWidth || exifObj.ExifImageWidth) {
        fileInfo.width = exifObj.ImageWidth || exifObj.ExifImageWidth
        fileInfo.height = exifObj.ImageHeight || exifObj.ExifImageHeight
      }
      if (exifObj.format || exifObj.FileType) {
        fileInfo.format = exifObj.format || exifObj.FileType
      }
    }

    // Compute risk
    result.risk = computeRisk(result.exif, !!result.gps)

  } else if (kind === 'video') {
    // Browser cannot parse MP4/MOV metadata natively.
    // Extract basic file info as the "analysis".
    result.video = {
      tags: {
        filename: file.name,
        size: formatSize(file.size),
        mime_type: file.type,
        last_modified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
      },
      streams: {},
      warning: 'Client-side video metadata extraction is limited. Browser cannot parse MP4/MOV container tags. Deploy the backend for full video forensics.',
    }

    result.risk = { score: 0, risk_level: 'LOW', flags: ['No metadata could be extracted — browser cannot parse video containers'] }
  } else {
    result.risk = { score: 0, risk_level: 'LOW', flags: ['Unknown file type — limited analysis possible'] }
  }

  return result
}
