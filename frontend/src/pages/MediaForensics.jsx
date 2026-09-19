import { useState, useEffect } from 'react'
import { analyzeMedia, captureMediaEvidence, listMediaEvidence, getMediaEvidence, deleteMediaEvidence } from '../services/api'
import { FiSearch, FiShield, FiCamera, FiVideo, FiMapPin, FiSave, FiFileText, FiClock, FiTag, FiCheck, FiDownload, FiEye, FiTrash2, FiCopy, FiTerminal } from 'react-icons/fi'

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
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Media Metadata Report - ${escapeHtml(f.filename || '')}</title>
<style>body{font-family:monospace;background:#0f172a;color:#e2e8f0;max-width:900px;margin:2em auto;padding:0 1em}h1,h2{color:#60a5fa}table{width:100%;border-collapse:collapse;margin:1em 0}td{border:1px solid #334155;padding:6px 10px;font-size:13px;word-break:break-all}td:first-child{color:#94a3b8;width:30%}</style></head><body>
<h1>Media Metadata Report</h1><p>Generated ${escapeHtml(analysis.analyzed_at || '')} | ${escapeHtml(analysis.tool || '')}</p>
<h2>Risk: ${escapeHtml(risk.score ?? '?')} / 100 — ${escapeHtml(risk.risk_level || '')}</h2>
<ul>${(risk.flags || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('') || '<li>No flags</li>'}</ul>
<h2>File</h2><table>${kv({ filename: f.filename, size: f.size_human, mime: f.mime_type, sha256: f.sha256, md5: f.md5 })}</table>
<h2>Location</h2>${gps ? `<p>Lat ${gps.latitude}, Lon ${gps.longitude} <a href="${gps.maps_url}">View on Google Maps</a></p>` : '<p>No GPS coordinates embedded.</p>'}
<h2>EXIF / Image tags</h2><table>${kv(exif.GPSInfo ? { ...exif, GPSInfo: '[see Location]' } : exif)}</table>
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

  useEffect(() => { fetchEvidenceList() }, [])

  const fetchEvidenceList = async () => {
    try { setEvidenceList(await listMediaEvidence()) } catch { console.error('Failed to fetch media evidence') }
  }

  const handleFile = (f) => { setFile(f); setSaved(false); setResults(null) }

  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true); setSaved(false)
    try { setResults(await analyzeMedia(file)) }
    catch (err) { alert(err.response?.data?.detail || 'Error analyzing file') }
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
                  <button onClick={() => window.open(`/api/media/evidence/${ev.evidence_id}/export?format=html`, '_blank')} className="text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1"><FiDownload /> HTML</button>
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
