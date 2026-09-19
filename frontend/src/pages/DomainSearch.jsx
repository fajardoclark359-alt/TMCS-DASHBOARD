import { useState, useEffect } from 'react'
import { lookupDomain, subdomainEnum, captureDomainEvidence, listDomainEvidence } from '../services/api'
import { clientLookupDomain } from '../services/clientFallbacks'
import { FiSearch, FiServer, FiTerminal, FiGlobe, FiSave, FiFileText, FiClock, FiTag, FiCheck } from 'react-icons/fi'

function DomainSearch() {
  const [domain, setDomain] = useState('')
  const [results, setResults] = useState(null)
  const [subdomains, setSubdomains] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [priority, setPriority] = useState('medium')
  const [caseId, setCaseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [evidenceList, setEvidenceList] = useState([])
  const [showEvidence, setShowEvidence] = useState(false)
  const [clientMode, setClientMode] = useState(false)

  useEffect(() => {
    fetchEvidenceList()
  }, [])

  const fetchEvidenceList = async () => {
    try {
      const data = await listDomainEvidence()
      setEvidenceList(data)
    } catch (err) {
      console.error('Failed to fetch evidence list')
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!domain) return
    setLoading(true)
    setSaved(false)
    setClientMode(false)
    try {
      const [domainData, subData] = await Promise.all([
        lookupDomain(domain),
        subdomainEnum(domain)
      ])
      setResults(domainData)
      setSubdomains(subData)
    } catch (err) {
      console.error('Backend unavailable, using client-side fallback:', err.message)
      try {
        const data = await clientLookupDomain(domain)
        setResults({ whois: data.whois, dns: data.dns })
        setSubdomains(data.subdomains)
        setClientMode(true)
      } catch (clientErr) {
        console.error(clientErr)
        alert('Error looking up domain: ' + clientErr.message)
      }
    }
    setLoading(false)
  }

  const handleCaptureEvidence = async () => {
    if (!results) return
    setSaving(true)
    try {
      const data = await captureDomainEvidence({
        domain: domain,
        notes: notes,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        priority: priority,
        case_id: caseId
      })
      setSaved(true)
      fetchEvidenceList()
    } catch (err) {
      console.error(err)
      alert('Error saving evidence')
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-blue-400" />
          <h1 className="title-cyber text-2xl font-bold text-blue-400 glow-text">DOMAIN RECON</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Domain reconnaissance - WHOIS, DNS, subdomains + evidence</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
          placeholder="$ enter-target-domain.com..."
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'SCANNING...' : 'ENUMERATE'}
        </button>
      </form>

      {clientMode && (
        <div className="card-cyber p-3 rounded-lg mb-5 border border-yellow-500/30 bg-yellow-950/10">
          <p className="text-yellow-300 text-xs font-mono">⚡ Scanned in-browser — backend offline, DNS records from Cloudflare DoH</p>
        </div>
      )}

      {/* EVIDENCE CAPTURE FORM */}
      {results && (
        <div className="card-cyber p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="title-cyber text-sm font-bold flex items-center gap-2 text-blue-400">
              <FiSave /> EVIDENCE CAPTURE
            </h2>
            <button onClick={() => setShowEvidence(!showEvidence)}
              className="text-xs text-slate-500 hover:text-blue-400 font-mono flex items-center gap-1">
              <FiFileText /> {showEvidence ? 'HIDE' : 'SHOW'} SAVED ({evidenceList.length})
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">CASE ID</label>
              <input type="text" value={caseId} onChange={(e) => setCaseId(e.target.value)}
                placeholder="CASE-2026-001"
                className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">PRIORITY</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border">
                <option value="low">LOW</option>
                <option value="medium">MEDIUM</option>
                <option value="high">HIGH</option>
                <option value="critical">CRITICAL</option>
              </select>
            </div>
          </div>
          
          <div className="mb-3">
            <label className="text-[10px] text-slate-500 font-mono block mb-1">NOTES</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Investigation notes, context, findings..."
              rows={2}
              className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
          </div>
          
          <div className="mb-3">
            <label className="text-[10px] text-slate-500 font-mono block mb-1">TAGS (comma separated)</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="recon, phishing, infrastructure"
              className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleCaptureEvidence} disabled={saving}
              className={`px-4 py-2 rounded text-xs font-mono flex items-center gap-2 ${saved ? 'bg-green-600/30 text-green-400' : 'btn-cyber'}`}>
              {saved ? <><FiCheck /> SAVED</> : saving ? 'SAVING...' : <><FiSave /> CAPTURE EVIDENCE</>}
            </button>
            {saved && (
              <span className="text-green-400 text-xs font-mono">Evidence captured successfully</span>
            )}
          </div>
        </div>
      )}

      {/* EVIDENCE LIST */}
      {showEvidence && evidenceList.length > 0 && (
        <div className="card-cyber p-4 rounded-lg mb-6">
          <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400">
            <FiFileText /> SAVED EVIDENCE ({evidenceList.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {evidenceList.map((ev, i) => (
              <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400">{ev.evidence_id}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                    ev.priority === 'critical' ? 'bg-red-600/30 text-red-400' :
                    ev.priority === 'high' ? 'bg-orange-600/30 text-orange-400' :
                    ev.priority === 'medium' ? 'bg-yellow-600/30 text-yellow-400' :
                    'bg-slate-600/30 text-slate-400'
                  }`}>{ev.priority?.toUpperCase()}</span>
                </div>
                <div className="text-slate-500 text-[10px] mt-1">
                  <FiClock className="inline mr-1" />{ev.timestamp?.split('T')[0]}
                  <FiGlobe className="inline ml-2 mr-1" />{ev.target}
                </div>
                {ev.notes && <p className="text-slate-400 text-[10px] mt-1">{ev.notes}</p>}
                {ev.tags?.length > 0 && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {ev.tags.map((tag, j) => (
                      <span key={j} className="bg-blue-600/20 text-blue-400 px-1 rounded text-[9px]">
                        <FiTag className="inline" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-[9px] text-slate-600 mt-1">HASH: {ev.evidence_hash}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-5">
          <div className="card-cyber p-5 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiGlobe /> WHOIS INTEL</h2>
            {results.whois.error ? (
              <p className="text-red-400 font-mono text-sm">! {results.whois.error}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-slate-900/50 p-2 rounded cyber-border"><span className="text-slate-500">registrar:</span> <span className="text-white">{results.whois.registrar}</span></div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border"><span className="text-slate-500">org:</span> <span className="text-white">{results.whois.org}</span></div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border"><span className="text-slate-500">created:</span> <span className="text-blue-400">{results.whois.creation_date}</span></div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border"><span className="text-slate-500">expires:</span> <span className="text-yellow-400">{results.whois.expiration_date}</span></div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border"><span className="text-slate-500">country:</span> <span className="text-white">{results.whois.country}</span></div>
                {results.whois.emails?.length > 0 && (
                  <div className="bg-slate-900/50 p-2 rounded cyber-border"><span className="text-slate-500">emails:</span> <span className="text-cyan-400">{results.whois.emails.join(', ')}</span></div>
                )}
                {results.whois.name_servers?.length > 0 && (
                  <div className="col-span-2 bg-slate-900/50 p-2 rounded cyber-border"><span className="text-slate-500">nameservers:</span> <span className="text-slate-300">{results.whois.name_servers.join(', ')}</span></div>
                )}
              </div>
            )}
          </div>

          <div className="card-cyber p-5 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-3 text-blue-400">&#9656; DNS RECORDS</h2>
            <div className="space-y-2">
              {Object.entries(results.dns.records).map(([type, records]) => (
                <div key={type}>
                  <p className="text-blue-400 font-bold text-xs font-mono">[{type}]</p>
                  {records.map((record, idx) => (
                    <p key={idx} className="font-mono text-xs ml-4 text-slate-400">{record}</p>
                  ))}
                </div>
              ))}
              {Object.keys(results.dns.records).length === 0 && (
                <p className="text-slate-500 font-mono text-sm">$ no DNS records found</p>
              )}
            </div>
          </div>

          {subdomains && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400">
                <FiServer /> SUBDOMAINS ({subdomains.total_found} found)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {subdomains.subdomains.map((sub, idx) => (
                  <div key={idx} className="bg-slate-900/50 px-3 py-2 rounded text-xs font-mono cyber-border text-blue-300">
                    + {sub}
                  </div>
                ))}
              </div>
              {subdomains.subdomains.length === 0 && (
                <p className="text-slate-500 font-mono text-sm">$ no common subdomains found</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DomainSearch
