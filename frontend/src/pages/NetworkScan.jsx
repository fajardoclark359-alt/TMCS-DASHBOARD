import { useState, useEffect } from 'react'
import { FiTerminal, FiWifi, FiPlay, FiRefreshCw, FiCopy, FiDownload } from 'react-icons/fi'
import { scanNetwork as apiScanNetwork, listProfiles } from '../services/api'

function NetworkScan() {
  const [profiles, setProfiles] = useState([])
  const [nmapAvailable, setNmapAvailable] = useState(false)
  const [engineNote, setEngineNote] = useState('')
  const [target, setTarget] = useState('')
  const [profile, setProfile] = useState('standard')
  const [ports, setPorts] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listProfiles().then((d) => {
      setProfiles(d.profiles)
      setNmapAvailable(d.nmap_available)
      setEngineNote(d.engine_note || '')
    }).catch(() => {})
  }, [])

  const handleScan = async (e) => {
    e.preventDefault()
    if (!target.trim()) { setError('Target required'); return }
    if (!authorized) { setError('Authorization not confirmed — tick the box'); return }
    setScanning(true); setResult(null); setError('')
    try {
      setResult(await apiScanNetwork(target.trim(), profile, ports || undefined, true))
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Scan failed')
    }
    setScanning(false)
  }

  const riskColor = (level) => {
    if (level === 'LOW') return 'text-blue-400 glow-text'
    if (level === 'MEDIUM') return 'text-yellow-400'
    if (level === 'HIGH') return 'text-orange-400'
    return 'text-red-400 glow-text-red'
  }

  const downloadFile = (filename, content, mime) => {
    const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-red-400" />
          <h1 className="title-cyber text-2xl font-bold text-red-400 glow-text">NMAP NETWORK SCAN</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Port &amp; service reconnaissance — real nmap binary with TCP-connect fallback</p>
      </div>

      <div className="card-cyber p-5 rounded-lg mb-6 border border-red-500/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-red-400 flex items-center gap-2"><FiWifi /> SCAN CONFIGURATION</h2>
          <span className={`px-2 py-1 rounded text-[10px] font-mono border ${nmapAvailable ? 'bg-green-900/20 text-green-400 border-green-500/40' : 'bg-yellow-900/20 text-yellow-400 border-yellow-500/40'}`}>
            {nmapAvailable ? 'NMAP BINARY READY' : 'TCP FALLBACK ENGINE'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] text-slate-500 font-mono block mb-1">TARGET (HOST / IP / CIDR)</label>
            <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="example.com or 1.2.3.4 or 10.0.0.0/24" className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-mono block mb-1">PROFILE</label>
            <select value={profile} onChange={(e) => setProfile(e.target.value)} className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border">
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {profiles.find((p) => p.id === profile)?.desc && <p className="text-slate-600 text-[10px] font-mono mt-1">{profiles.find((p) => p.id === profile).desc}</p>}
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-mono block mb-1">CUSTOM PORTS (optional)</label>
            <input type="text" value={ports} onChange={(e) => setPorts(e.target.value)} placeholder="22,80,443 or 1-1000" className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="rounded border-slate-600 text-red-500 focus:ring-red-500 bg-slate-900" />
            <label className="text-xs font-mono text-red-400 font-bold">I AUTHORIZE THIS SCAN</label>
          </div>
        </div>

        {engineNote && <div className="mb-3 p-3 bg-slate-900/40 rounded border border-slate-700/30"><p className="text-slate-500 text-xs font-mono">ℹ {engineNote}</p></div>}
        <button onClick={handleScan} disabled={scanning || !authorized} className={`w-full py-3 rounded font-bold text-xs font-mono flex items-center justify-center gap-2 ${scanning || !authorized ? 'bg-slate-700 text-slate-500' : 'bg-red-900/60 text-red-400 border border-red-500/40 hover:bg-red-800/60'}`}>
          {scanning ? <><FiRefreshCw className="animate-spin" /> SCANNING</> : <><FiPlay /> RUN SCAN</>}
        </button>
      </div>

      {error && (
        <div className="card-cyber p-4 rounded-lg mb-6 border border-red-500/40 bg-red-950/20">
          <p className="text-red-400 text-xs font-mono">! SCAN FAILED: {error}</p>
        </div>
      )}

      {result && (
        <>
          <div className="card-cyber p-5 rounded-lg mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-[10px] text-purple-400 font-mono font-bold mb-1">TARGET</div>
                  <div className="text-white text-sm font-mono">{result.target}</div>
                </div>
                <div>
                  <div className="text-[10px] text-purple-400 font-mono font-bold mb-1">HOSTS</div>
                  <div className="text-white text-sm font-mono">{result.host_count}</div>
                </div>
                <div>
                  <div className="text-[10px] text-purple-400 font-mono font-bold mb-1">OPEN PORTS</div>
                  <div className="text-white text-sm font-mono">{result.total_open}</div>
                </div>
                <div>
                  <div className="text-[10px] text-purple-400 font-mono font-bold mb-1">ELAPSED</div>
                  <div className="text-white text-sm font-mono">{result.elapsed_seconds}s</div>
                </div>
                <div>
                  <div className="text-[10px] text-purple-400 font-mono font-bold mb-1">ENGINE</div>
                  <div className="text-white text-sm font-mono">{result.engine}</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded text-[10px] font-bold ${riskColor(result.risk?.risk_level)}`}>
                {result.risk?.risk_level} — {result.risk?.score}/100
              </div>
            </div>

            {(result.risk?.flags?.length > 0) && (
              <div className="mb-4 p-3 bg-red-950/20 rounded border border-red-500/20">
                <div className="text-red-400 text-[10px] font-bold mb-2">RISK FLAGS</div>
                <div className="space-y-1 text-xs font-mono text-red-300">
                  {result.risk.flags.slice(0, 15).map((f, i) => <div key={i}>- {f}</div>)}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border border-slate-700/40">
                <thead>
                  <tr className="bg-slate-900/40 border-b border-slate-700/30">
                    <th className="p-2 text-left text-slate-400">IP</th>
                    <th className="p-2 text-left text-slate-400">STATUS</th>
                    <th className="p-2 text-left text-slate-400">OS GUESS</th>
                    <th className="p-2 text-left text-slate-400">PORTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {result.hosts.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-900/30">
                      <td className="p-2 text-cyan-400">{h.ip}</td>
                      <td className="p-2 text-slate-300">{h.status}</td>
                      <td className="p-2 text-slate-500">{h.os_guess || '—'}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {h.ports.map((p, j) => (
                            <span key={j} className="px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-500/20">
                              {p.port}/{p.proto} {p.service}
                            </span>
                          ))}
                          {h.ports.length === 0 && <span className="text-slate-600">none open</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => downloadFile(`network-scan-${result.target.replace(/[^a-z0-9]/gi,'_')}.json`, JSON.stringify(result, null, 2), 'application/json')} className="px-4 py-2 rounded text-xs font-mono border border-slate-600 text-slate-300 hover:bg-slate-800 flex items-center gap-2"><FiDownload /> EXPORT JSON</button>
              <button onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))} className="px-4 py-2 rounded text-xs font-mono bg-slate-800/60 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center gap-2"><FiCopy /> COPY JSON</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NetworkScan
