import { useState, useEffect } from 'react'
import { analyzeMedia, clientAnalyzeMedia, captureMediaEvidence, listMediaEvidence, getMediaEvidence, deleteMediaEvidence, mediaExportUrl } from '../services/api'
import { FiSearch, FiShield, FiCamera, FiVideo, FiMapPin, FiSave, FiFileText, FiClock, FiTag, FiCheck, FiDownload, FiEye, FiTrash2, FiCopy, FiTerminal, FiCrosshair } from 'react-icons/fi'

function downloadFile(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function buildHtmlReport(analysis) {
  const f = analysis.file || {}
  const gps = analysis.gps
  const exif = analysis.exif || {}
  const tags = (analysis.video && analysis.video.tags) || {}
  const risk = analysis.risk || {}
  const kv = (obj) => Object.entries(obj).map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`).join('') || '<tr><td colspan="2">None</td></tr>'
  // Extract origin fields for the report
  const captureDate = exif.DateTimeOriginal || exif.CreateDate || exif.DateTimeDigitized || exif.DateTime || exif.ModifyDate || null
  const make = exif.Make || null
  const model = exif.Model || null
  const lensModel = exif.LensModel || null
  const software = exif.Software || null
  const iso = exif.ISOSpeedRatings || null
  const aperture = exif.FNumber || null
  const focal = exif.FocalLength || null
  const exposure = exif.ExposureTime || null
  const serial = exif.SerialNumber || exif.CameraSerialNumber || null
  const owner = exif.OwnerName || exif.Artist || null
  const originRows = [
    captureDate && `<tr><td>Captured</td><td>${escapeHtml(String(captureDate))}</td></tr>`,
    gps && `<tr><td>Latitude</td><td>${escapeHtml(String(gps.latitude))}°</td></tr>`,
    gps && `<tr><td>Longitude</td><td>${escapeHtml(String(gps.longitude))}° <a href="${gps.maps_url}">View on Maps</a></td></tr>`,
    gps?.altitude_m && `<tr><td>Altitude</td><td>${escapeHtml(String(gps.altitude_m))} m</td></tr>`,
    make && `<tr><td>Camera Make</td><td>${escapeHtml(make)}</td></tr>`,
    model && `<tr><td>Camera Model</td><td>${escapeHtml(model)}</td></tr>`,
    lensModel && `<tr><td>Lens</td><td>${escapeHtml(lensModel)}</td></tr>`,
    software && `<tr><td>Software</td><td>${escapeHtml(software)}</td></tr>`,
    iso && `<tr><td>ISO</td><td>${escapeHtml(String(iso))}</td></tr>`,
    aperture && `<tr><td>Aperture</td><td>f/${escapeHtml(String(aperture))}</td></tr>`,
    focal && `<tr><td>Focal Length</td><td>${escapeHtml(String(focal))}</td></tr>`,
    exposure && `<tr><td>Exposure</td><td>${escapeHtml(String(exposure))}s</td></tr>`,
    serial && `<tr><td>Serial Number</td><td style="color:#f87171">${escapeHtml(serial)}</td></tr>`,
    owner && `<tr><td>Owner</td><td style="color:#f87171">${escapeHtml(owner)}</td></tr>`,
  ].filter(Boolean).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Media Metadata Report - ${escapeHtml(f.filename || '')}</title>
<style>body{font-family:monospace;background:#0f172a;color:#e2e8f0;max-width:900px;margin:2em auto;padding:0 1em}h1,h2{color:#60a5fa}h2.purple{color:#a78bfa}table{width:100%;border-collapse:collapse;margin:1em 0}td{border:1px solid #334155;padding:6px 10px;font-size:13px;word-break:break-all}td:first-child{color:#94a3b8;width:30%}.red{color:#f87171}</style></head><body>
<h1>Media Metadata Report</h1><p>Generated ${escapeHtml(analysis.analyzed_at || '')} | ${escapeHtml(analysis.tool || '')}</p>
<h2>Risk: ${escapeHtml(risk.score ?? '?')} / 100 — ${escapeHtml(risk.risk_level || '')}</h2>
<ul>${(risk.flags || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('') || '<li>No flags</li>'}</ul>
<h2>File</h2><table>${kv({ filename: f.filename, size: f.size_human, mime: f.mime_type, sha256: f.sha256, md5: f.md5 })}</table>
${originRows ? `<h2 class="purple">DATA ORIGIN — Where, When & With What</h2><p style="color:#94a3b8;font-size:12px">Real metadata embedded in the file by the capture device. Not fabricated.</p><table>${originRows}</table>` : ''}
<h2>EXIF / Image tags</h2><table>${kv(exif.GPSInfo ? { ...exif, GPSInfo: '[see Origin above]' } : exif)}</table>
<h2>Video container tags</h2><table>${kv(tags)}</table></body></html>`
}

function MediaForensics() {
  const [file, setFile] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [priority, setPriority] = useState('medium')
  const [caseId, setCaseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [evidenceList, setEvidenceList] = useState([])
  const [showEvidence, setShowEvidence] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [clientMode, setClientMode] = useState(false)

  useEffect(() => { fetchEvidenceList() }, [])

  const fetchEvidenceList = async () => {
    try { setEvidenceList(await listMediaEvidence()) } catch { console.error('Failed to fetch media evidence') }
  }

  const handleFile = (f) => { setFile(f); setSaved(false); setResults(null) }

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true); setSaved(false); setError(''); setClientMode(false)
    try {
      setResults(await analyzeMedia(file))
    } catch (err) {
      // Backend unavailable — fall back to client-side EXIF extraction
      try {
        setClientMode(true)
        setResults(await clientAnalyzeMedia(file))
      } catch (clientErr) {
        setClientMode(false)
        setError(`Client-side scan failed: ${clientErr.message || 'Could not parse file'}`)
      }
    }
    setLoading(false)
  }

  const handleCapture = async () => {
    if (!results) return
    setSaving(true)
    try {
      await captureMediaEvidence({
        filename: results.file?.filename || file?.name || 'upload',
        analysis: results, notes,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        priority, case_id: caseId,
      })
      setSaved(true); fetchEvidenceList()
    } catch { alert('Error saving evidence') }
    setSaving(false)
  }

  const handleViewSaved = async (evidenceId) => {
    try {
      const ev = await getMediaEvidence(evidenceId)
      if (ev.data) { setResults(ev.data); setFile(null); window.scrollTo(0, 0) }
    } catch { alert('Error loading evidence') }
  }

  const handleExportJSON = () => {
    if (!results) return
    downloadFile(`media-report-${results.file?.filename || 'analysis'}.json`, JSON.stringify(results, null, 2), 'application/json')
  }

  const handleExportHTML = () => {
    if (!results) return
    downloadFile(`media-report-${results.file?.filename || 'analysis'}.html`, buildHtmlReport(results), 'text/html')
  }

  const handleCopy = async () => {
    if (!results) return
    try { await navigator.clipboard.writeText(JSON.stringify(results, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { alert('Copy failed') }
  }

  const riskColor = (level) => {
    if (level === 'LOW') return 'text-blue-400 glow-text'
    if (level === 'MEDIUM') return 'text-yellow-400'
    if (level === 'HIGH') return 'text-orange-400'
    return 'text-red-400 glow-text-red'
  }

  const exifEntries = results ? Object.entries(results.exif || {}).filter(([k]) => k !== 'GPSInfo') : []
  const tagEntries = results ? Object.entries(results.video?.tags || {}) : []

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-blue-400" />
          <h1 className="title-cyber text-2xl font-bold text-blue-400 glow-text">MEDIA FORENSICS</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Photo & video metadata scan - EXIF, GPS, device IDs + report export</p>
      </div>

      <form onSubmit={handleAnalyze} className="mb-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]) }}
          className={`card-cyber p-6 rounded-lg text-center cursor-pointer transition-all ${dragOver ? 'border-blue-400' : ''}`}
          onClick={() => document.getElementById('media-file-input').click()}
        >
          <FiCamera className="mx-auto text-blue-400 text-3xl mb-2" />
          <p className="text-slate-300 text-sm font-mono">{file ? file.name : 'Drop photo/video here or click to browse'}</p>
          <p className="text-slate-600 text-[11px] font-mono mt-1">JPG PNG TIFF WEBP HEIC · MP4 MOV AVI MKV WEBM · max 25 MB</p>
          <input id="media-file-input" type="file" className="hidden"
            accept=".jpg,.jpeg,.png,.tiff,.tif,.webp,.bmp,.gif,.heic,.heif,.mp4,.mov,.avi,.mkv,.webm,.3gp,.m4v"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
        <button type="submit" disabled={loading || !file} className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm mt-3 disabled:opacity-50">
          <FiSearch /> {loading ? 'SCANNING...' : 'SCAN METADATA'}
        </button>
      </form>

      {error && (
        <div className="card-cyber p-4 rounded-lg mb-6 border border-red-500/40 bg-red-950/20">
          <p className="text-red-400 text-xs font-mono">! SCAN FAILED: {error}</p>
        </div>
      )}

      {clientMode && results && (
        <div className="card-cyber p-3 rounded-lg mb-5 border border-yellow-500/30 bg-yellow-950/10">
          <p className="text-yellow-300 text-xs font-mono">⚡ Scanned in-browser — backend offline, results are from local EXIF extraction</p>
        </div>
      )}

      {results && (
        <>
          <div className="card-cyber p-5 rounded-lg mb-5">
            <h2 className="title-cyber text-lg font-bold mb-3 flex items-center gap-2 text-blue-400"><FiShield /> PRIVACY RISK</h2>
            <div className="flex items-center gap-6 mb-3">
              <div className="text-5xl font-bold title-cyber text-white">{results.risk?.score}</div>
              <div className={`text-2xl font-bold title-cyber ${riskColor(results.risk?.risk_level)}`}>{results.risk?.risk_level} RISK</div>
              <span className="text-xs font-mono text-slate-500">{results.kind?.toUpperCase()} · {results.file?.size_human} · {results.file?.mime_type}</span>
            </div>
            {(results.risk?.flags?.length > 0) && (
              <div className="mt-2 p-3 bg-red-950/20 rounded border border-red-500/20">
                {results.risk.flags.map((fl, i) => <p key={i} className="text-red-300 text-xs font-mono ml-4">- {fl}</p>)}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={handleExportJSON} className="btn-cyber px-4 py-2 rounded text-xs font-mono flex items-center gap-2"><FiDownload /> EXPORT JSON</button>
              <button onClick={handleExportHTML} className="btn-cyber px-4 py-2 rounded text-xs font-mono flex items-center gap-2"><FiDownload /> EXPORT HTML</button>
              <button onClick={handleCopy} className="px-4 py-2 rounded text-xs font-mono flex items-center gap-2 bg-slate-800/60 text-slate-300 border border-slate-700"><FiCopy /> {copied ? 'COPIED!' : 'COPY JSON'}</button>
            </div>
          </div>

          {/* ── DATA ORIGIN PANEL ── */}
          {(() => {
            const exif = results.exif || {}
            const gps = results.gps

            // Date & Time: try multiple EXIF fields in priority order
            const captureDate = exif.DateTimeOriginal || exif.CreateDate || exif.DateTimeDigitized
              || exif['Exif.DateTimeOriginal'] || exif['Exif.CreateDate'] || exif.DateTime
              || exif['EXIF.DateTimeOriginal'] || exif['EXIF.DateTime'] || exif.ModifyDate
              || exif['XMP.CreateDate'] || exif['XMP.DateTimeOriginal'] || null
            const gpsDate = exif.GPSDateStamp || (gps?.gps_date) || null
            const gpsTime = exif.GPSTimeStamp || null

            // Camera / Device
            const make = exif.Make || exif['Exif.Make'] || exif['EXIF.Make'] || null
            const model = exif.Model || exif['Exif.Model'] || exif['EXIF.Model'] || null
            const lensMake = exif.LensMake || exif['Exif.LensMake'] || null
            const lensModel = exif.LensModel || exif['Exif.LensModel'] || exif['EXIF.LensModel'] || null
            const software = exif.Software || exif['Exif.Software'] || exif['EXIF.Software'] || null
            const firmware = exif.Firmware || null

            // Capture settings
            const focalLength = exif.FocalLength || exif['Exif.FocalLength'] || null
            const aperture = exif.FNumber || exif.ApertureValue || exif['Exif.FNumber'] || null
            const iso = exif.ISOSpeedRatings || exif['Exif.ISOSpeedRatings'] || null
            const exposure = exif.ExposureTime || exif['Exif.ExposureTime'] || null
            const flash = exif.Flash || exif['Exif.Flash'] || null
            const wb = exif.WhiteBalance || exif['Exif.WhiteBalance'] || null
            const colorSpace = exif.ColorSpace || null

            // Serial / Owner (sensitive)
            const serial = exif.SerialNumber || exif.CameraSerialNumber || exif['Exif.BodySerialNumber'] || null
            const lensSerial = exif.LensSerialNumber || exif['Exif.LensSerialNumber'] || null
            const owner = exif.OwnerName || exif.Artist || exif.Author || null
            const copyright = exif.Copyright || null

            const hasOrigin = captureDate || make || model || gps || serial || owner || software
            if (!hasOrigin) return null

            const fmtDate = (d) => {
              if (!d) return null
              const s = String(d)
              // exifr may return Date object or ISO string or EXIF format "YYYY:MM:DD HH:MM:SS"
              if (d instanceof Date) return d.toLocaleString()
              if (/^\d{4}-/.test(s)) return s  // ISO
              if (/^\d{4}:\d{2}:\d{2}/.test(s)) return s.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
              return s
            }

            return (
              <div className="card-cyber p-5 rounded-lg mb-5 border border-purple-500/30">
                <h2 className="title-cyber text-lg font-bold mb-4 flex items-center gap-2 text-purple-400"><FiCrosshair /> DATA ORIGIN — Where, When & With What</h2>
                <p className="text-slate-500 text-[11px] font-mono mb-4 -mt-2">Real metadata embedded in the file by the capture device. Not fabricated.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* ── WHEN ── */}
                  <div className="bg-slate-900/60 p-4 rounded cyber-border">
                    <p className="text-[10px] text-purple-400 font-mono font-bold mb-3 tracking-wider">📅 WHEN CAPTURED</p>
                    {captureDate ? (
                      <div className="space-y-2 text-xs font-mono">
                        <div><span className="text-slate-500">date_time:</span><br/><span className="text-white text-sm">{fmtDate(captureDate)}</span></div>
                        {gpsDate && <div><span className="text-slate-500">gps_date:</span><br/><span className="text-blue-400">{fmtDate(gpsDate)}</span></div>}
                        {exif.OffsetTimeOriginal && <div><span className="text-slate-500">timezone_offset:</span><br/><span className="text-cyan-400">{exif.OffsetTimeOriginal}</span></div>}
                      </div>
                    ) : <p className="text-slate-600 font-mono text-xs">No capture timestamp found.</p>}
                  </div>

                  {/* ── WHERE ── */}
                  <div className="bg-slate-900/60 p-4 rounded cyber-border">
                    <p className="text-[10px] text-purple-400 font-mono font-bold mb-3 tracking-wider">📍 WHERE CAPTURED</p>
                    {gps ? (
                      <div className="space-y-2 text-xs font-mono">
                        <div><span className="text-slate-500">latitude:</span><br/><span className="text-yellow-400 text-sm">{gps.latitude}°</span></div>
                        <div><span className="text-slate-500">longitude:</span><br/><span className="text-yellow-400 text-sm">{gps.longitude}°</span></div>
                        {gps.altitude_m != null && <div><span className="text-slate-500">altitude:</span><br/><span className="text-white">{gps.altitude_m} m</span></div>}
                        <a href={gps.maps_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 px-2 py-1 bg-purple-900/30 rounded text-purple-400 hover:text-purple-300 text-[10px]">▸ VIEW ON GOOGLE MAPS</a>
                      </div>
                    ) : <p className="text-slate-600 font-mono text-xs">No GPS coordinates — location stripped or never recorded.</p>}
                  </div>

                  {/* ── DEVICE ── */}
                  <div className="bg-slate-900/60 p-4 rounded cyber-border">
                    <p className="text-[10px] text-purple-400 font-mono font-bold mb-3 tracking-wider">📷 DEVICE USED</p>
                    {(make || model || lensModel) ? (
                      <div className="space-y-2 text-xs font-mono">
                        {make && <div><span className="text-slate-500">camera_make:</span><br/><span className="text-white text-sm">{make}</span></div>}
                        {model && <div><span className="text-slate-500">camera_model:</span><br/><span className="text-white text-sm">{model}</span></div>}
                        {lensMake && <div><span className="text-slate-500">lens_make:</span><br/><span className="text-slate-300">{lensMake}</span></div>}
                        {lensModel && <div><span className="text-slate-500">lens_model:</span><br/><span className="text-slate-300">{lensModel}</span></div>}
                        {software && <div><span className="text-slate-500">software:</span><br/><span className="text-cyan-400">{software}</span></div>}
                        {firmware && <div><span className="text-slate-500">firmware:</span><br/><span className="text-slate-400">{firmware}</span></div>}
                      </div>
                    ) : <p className="text-slate-600 font-mono text-xs">No camera identifiers found.</p>}
                  </div>
                </div>

                {/* ── CAPTURE SETTINGS ── */}
                {(focalLength || aperture || iso || exposure || flash || wb || colorSpace) && (
                  <div className="mt-4 bg-slate-900/40 p-4 rounded cyber-border">
                    <p className="text-[10px] text-purple-400 font-mono font-bold mb-3 tracking-wider">⚙️ CAPTURE SETTINGS</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                      {focalLength && <div className="bg-slate-900/50 p-2 rounded"><span className="text-slate-500">focal_length:</span><br/><span className="text-white">{String(focalLength)}</span></div>}
                      {aperture && <div className="bg-slate-900/50 p-2 rounded"><span className="text-slate-500">aperture:</span><br/><span className="text-white">f/{String(aperture)}</span></div>}
                      {iso && <div className="bg-slate-900/50 p-2 rounded"><span className="text-slate-500">iso:</span><br/><span className="text-white">{String(iso)}</span></div>}
                      {exposure && <div className="bg-slate-900/50 p-2 rounded"><span className="text-slate-500">exposure:</span><br/><span className="text-white">{String(exposure)}s</span></div>}
                      {flash && <div className="bg-slate-900/50 p-2 rounded"><span className="text-slate-500">flash:</span><br/><span className="text-white">{String(flash)}</span></div>}
                      {wb && <div className="bg-slate-900/50 p-2 rounded"><span className="text-slate-500">white_balance:</span><br/><span className="text-white">{String(wb)}</span></div>}
                      {colorSpace && <div className="bg-slate-900/50 p-2 rounded"><span className="text-slate-500">color_space:</span><br/><span className="text-white">{String(colorSpace)}</span></div>}
                    </div>
                  </div>
                )}

                {/* ── SERIAL / OWNER (SENSITIVE) ── */}
                {(serial || lensSerial || owner || copyright) && (
                  <div className="mt-4 bg-red-950/20 p-4 rounded border border-red-500/20">
                    <p className="text-[10px] text-red-400 font-mono font-bold mb-3 tracking-wider">⚠️ SENSITIVE IDENTIFIERS — Unique Device / Owner Info</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                      {serial && <div className="bg-slate-900/50 p-2 rounded border border-red-500/30"><span className="text-red-400">body_serial:</span><br/><span className="text-white">{serial}</span></div>}
                      {lensSerial && <div className="bg-slate-900/50 p-2 rounded border border-red-500/30"><span className="text-red-400">lens_serial:</span><br/><span className="text-white">{lensSerial}</span></div>}
                      {owner && <div className="bg-slate-900/50 p-2 rounded border border-red-500/30"><span className="text-red-400">owner:</span><br/><span className="text-white">{owner}</span></div>}
                      {copyright && <div className="bg-slate-900/50 p-2 rounded border border-red-500/30"><span className="text-red-400">copyright:</span><br/><span className="text-white">{String(copyright)}</span></div>}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 text-blue-400">FILE & HASHES</h2>
              <div className="space-y-2 text-xs font-mono">
                {[['filename', results.file?.filename], ['size', results.file?.size_human], ['mime', results.file?.mime_type],
                  ['dimensions', results.file?.width ? `${results.file.width}x${results.file.height} ${results.file.format || ''}` : 'N/A'],
                  ['sha256', results.file?.sha256], ['md5', results.file?.md5]].map(([k, v], i) => (
                  <div key={i} className="flex justify-between gap-2 bg-slate-900/50 p-2 rounded"><span className="text-slate-500">{k}:</span><span className="text-slate-200 break-all text-right">{v}</span></div>
                ))}
              </div>
            </div>
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiMapPin /> LOCATION</h2>
              {results.gps ? (
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">latitude:</span><span className="text-yellow-400">{results.gps.latitude}</span></div>
                  <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">longitude:</span><span className="text-yellow-400">{results.gps.longitude}</span></div>
                  {results.gps.altitude_m != null && <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">altitude:</span><span className="text-white">{results.gps.altitude_m} m</span></div>}
                  <a href={results.gps.maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs font-mono inline-block hover:text-blue-300">▸ VIEW ON GOOGLE MAPS</a>
                </div>
              ) : <p className="text-slate-500 font-mono text-xs">No GPS coordinates embedded — location not disclosed by this file.</p>}
            </div>
          </div>

          <div className="card-cyber p-4 rounded-lg mb-5">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiCamera /> EXIF / IMAGE TAGS ({exifEntries.length})</h2>
            {exifEntries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {exifEntries.map(([k, v], i) => (
                  <div key={i} className="bg-slate-900/50 p-2 rounded text-xs font-mono"><span className="text-slate-500">{k}:</span> <span className="text-slate-200 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span></div>
                ))}
              </div>
            ) : <p className="text-slate-500 font-mono text-xs">No EXIF tags — stripped or never embedded.</p>}
          </div>

          {results.kind === 'video' && (
            <div className="card-cyber p-4 rounded-lg mb-5">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiVideo /> VIDEO CONTAINER ({tagEntries.length} tags)</h2>
              {tagEntries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                  {tagEntries.map(([k, v], i) => (
                    <div key={i} className="bg-slate-900/50 p-2 rounded text-xs font-mono"><span className="text-slate-500">{k}:</span> <span className="text-slate-200 break-all">{String(v)}</span></div>
                  ))}
                </div>
              ) : <p className="text-slate-500 font-mono text-xs">No container tags — minimal muxing or stripped.</p>}
              {results.video?.warning && <p className="text-yellow-400 font-mono text-xs mt-2">! {results.video.warning}</p>}
            </div>
          )}

          <div className="card-cyber p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="title-cyber text-sm font-bold flex items-center gap-2 text-blue-400"><FiSave /> EVIDENCE CAPTURE</h2>
              <button onClick={() => setShowEvidence(!showEvidence)} className="text-xs text-slate-500 hover:text-blue-400 font-mono flex items-center gap-1">
                <FiFileText /> {showEvidence ? 'HIDE' : 'SHOW'} SAVED ({evidenceList.length})
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">CASE ID</label>
                <input type="text" value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="CASE-2026-001" className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">PRIORITY</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border">
                  <option value="low">LOW</option><option value="medium">MEDIUM</option><option value="high">HIGH</option><option value="critical">CRITICAL</option>
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[10px] text-slate-500 font-mono block mb-1">NOTES</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Chain of custody notes, findings..." rows={2} className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
            </div>
            <div className="mb-3">
              <label className="text-[10px] text-slate-500 font-mono block mb-1">TAGS (comma separated)</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="exif, gps-leak, device-id" className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
            </div>
            <button onClick={handleCapture} disabled={saving} className={`px-4 py-2 rounded text-xs font-mono flex items-center gap-2 ${saved ? 'bg-green-600/30 text-green-400' : 'btn-cyber'}`}>
              {saved ? <><FiCheck /> SAVED</> : saving ? 'SAVING...' : <><FiSave /> CAPTURE EVIDENCE</>}
            </button>
          </div>
        </>
      )}

      {showEvidence && evidenceList.length > 0 && (
        <div className="card-cyber p-4 rounded-lg mb-6">
          <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiFileText /> SAVED MEDIA REPORTS ({evidenceList.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {evidenceList.map((ev, i) => (
              <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400">{ev.evidence_id}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-600/30 text-slate-400">{ev.priority?.toUpperCase()}</span>
                </div>
                <div className="text-slate-500 text-[10px] mt-1"><FiClock className="inline mr-1" />{ev.timestamp?.split('T')[0]}<FiCamera className="inline ml-2 mr-1" />{ev.target}</div>
                {ev.notes && <p className="text-slate-400 text-[10px] mt-1">{ev.notes}</p>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleViewSaved(ev.evidence_id)} className="text-blue-400 hover:text-blue-300 text-[10px] flex items-center gap-1"><FiEye /> VIEW</button>
                  <button onClick={async () => {
                    const data = await getMediaEvidence(ev.evidence_id)
                    if (data.data) downloadFile(`${ev.evidence_id}.json`, JSON.stringify(data, null, 2), 'application/json')
                  }} className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1"><FiDownload /> JSON</button>
                  <button onClick={() => window.open(mediaExportUrl(ev.evidence_id, 'html'), '_blank')} className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1"><FiDownload /> HTML</button>
                  <button onClick={async () => { await deleteMediaEvidence(ev.evidence_id); fetchEvidenceList() }} className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1"><FiTrash2 /> DELETE</button>
                </div>
                <div className="text-[9px] text-slate-600 mt-1">HASH: {ev.evidence_hash}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MediaForensics
