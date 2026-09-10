import { useState, useEffect } from 'react'
import { searchEmail, captureEmailEvidence, listEmailEvidence } from '../services/api'
import { FiSearch, FiAlertTriangle, FiCheck, FiShield, FiUser, FiGlobe, FiMail, FiPhone, FiFileText, FiLink, FiStar, FiTerminal, FiSave, FiClock, FiTag } from 'react-icons/fi'

function EmailSearch() {
  const [email, setEmail] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [priority, setPriority] = useState('medium')
  const [caseId, setCaseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [evidenceList, setEvidenceList] = useState([])
  const [showEvidence, setShowEvidence] = useState(false)

  useEffect(() => {
    fetchEvidenceList()
  }, [])

  const fetchEvidenceList = async () => {
    try {
      const data = await listEmailEvidence()
      setEvidenceList(data)
    } catch (err) {
      console.error('Failed to fetch evidence list')
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setSaved(false)
    try {
      const data = await searchEmail(email)
      setResults(data)
    } catch (err) {
      console.error(err)
      alert('Error investigating email')
    }
    setLoading(false)
  }

  const handleCaptureEvidence = async () => {
    if (!results) return
    setSaving(true)
    try {
      const data = await captureEmailEvidence({
        email: email,
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

  const riskColor = (level) => {
    if (level === 'LOW') return 'text-blue-400 glow-text'
    if (level === 'MEDIUM') return 'text-yellow-400'
    if (level === 'HIGH') return 'text-orange-400'
    return 'text-red-400 glow-text-red'
  }

  const severityColor = (s) => {
    if (s === 'CRITICAL') return 'bg-red-600'
    if (s === 'HIGH') return 'bg-orange-600'
    if (s === 'MEDIUM') return 'bg-yellow-600'
    return 'bg-slate-600'
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-blue-400" />
          <h1 className="title-cyber text-2xl font-bold text-blue-400 glow-text">EMAIL OSINT</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Deep email intelligence - breaches, social discovery, DNS + evidence</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="$ enter-target-email@domain.com..."
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'INVESTIGATING...' : 'INVESTIGATE'}
        </button>
      </form>

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
              placeholder="phishing, scam, investigation"
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
                  <FiMail className="inline ml-2 mr-1" />{ev.target}
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

          {results.breaches.reputation && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-lg font-bold mb-3 flex items-center gap-2 text-blue-400"><FiStar /> REPUTATION SCORE</h2>
              <div className="flex items-center gap-6 mb-3">
                <div className="text-5xl font-bold title-cyber text-white">{results.breaches.reputation.score}</div>
                <div className={`text-2xl font-bold title-cyber ${riskColor(results.breaches.reputation.risk_level)}`}>{results.breaches.reputation.risk_level} RISK</div>
              </div>
              {results.breaches.reputation.reasons.length > 0 && (
                <div className="mt-2 p-3 bg-slate-900/50 rounded cyber-border">
                  <p className="text-slate-500 text-xs font-mono mb-1">&#9656; ANALYSIS:</p>
                  {results.breaches.reputation.reasons.map((r, i) => (
                    <p key={i} className="text-sm text-slate-300 font-mono ml-4">- {r}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {results.breaches.username_hints?.possible_usernames?.length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiUser /> EXTRACTED USERNAMES</h2>
              <p className="text-slate-500 text-xs font-mono mb-2">$ username candidates from email local-part:</p>
              <div className="flex flex-wrap gap-2">
                {results.breaches.username_hints.possible_usernames.map((u, i) => (
                  <span key={i} className="bg-blue-950/50 text-blue-300 px-3 py-1 rounded text-xs font-mono cyber-border">{u}</span>
                ))}
              </div>
              {results.breaches.username_hints.possible_names?.length > 0 && (
                <p className="text-slate-500 text-xs font-mono mt-2">$ likely name: <span className="text-blue-400">{results.breaches.username_hints.possible_names[0]}</span></p>
              )}
            </div>
          )}

          {results.breaches.social_accounts && Object.keys(results.breaches.social_accounts).length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiLink /> LINKED SOCIAL ACCOUNTS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(results.breaches.social_accounts).map(([platform, info]) => (
                  <div key={platform} className="bg-slate-900/50 p-2 rounded cyber-border flex items-center justify-between">
                    <div>
                      <span className="font-bold text-blue-400 uppercase text-xs font-mono">[{platform}]</span>
                      {info.username && <span className="text-slate-300 ml-2 text-xs">{info.username}</span>}
                      {info.reputation && <span className="text-slate-500 ml-2 text-xs">rep:{info.reputation}</span>}
                    </div>
                    {info.url && (
                      <a href={info.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs">&#9656; VIEW</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.breaches.phone_numbers?.length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiPhone /> PHONE / CONTACT LEAKS</h2>
              {results.breaches.phone_numbers.map((p, i) => (
                <p key={i} className="text-orange-400 text-xs font-mono">! {p}</p>
              ))}
            </div>
          )}

          {results.breaches.leaked_info?.length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiAlertTriangle /> LEAKED INFORMATION</h2>
              <div className="space-y-2">
                {results.breaches.leaked_info.map((info, i) => (
                  <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border flex items-start gap-3">
                    <span className={`${severityColor(info.severity)} text-white text-[10px] px-2 py-0.5 rounded font-bold font-mono whitespace-nowrap`}>{info.severity}</span>
                    <div>
                      <p className="text-white text-xs font-medium font-mono">{info.type}</p>
                      <p className="text-slate-500 text-[10px] font-mono">{info.description}</p>
                      <p className="text-slate-600 text-[10px] font-mono">src: {info.breach} ({info.date})</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.breaches.leaked_files?.length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiFileText /> LEAKED FILES / DATA</h2>
              <div className="space-y-2">
                {results.breaches.leaked_files.map((f, i) => (
                  <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border">
                    <p className="text-white text-xs font-medium font-mono">{f.type}</p>
                    <p className="text-slate-500 text-[10px] font-mono">{f.description}</p>
                    {f.records && <p className="text-orange-400 text-[10px] font-mono">records: {f.records.toLocaleString()}</p>}
                    <p className="text-slate-600 text-[10px] font-mono">src: {f.breach} ({f.date})</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiCheck /> VALIDATION</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className={`p-2 rounded text-center cyber-border ${results.validation.valid ? 'bg-blue-950/30' : 'bg-red-950/30'}`}>
                <p className="text-[10px] text-slate-500 font-mono">FORMAT</p>
                <p className={`text-xs font-mono font-bold ${results.validation.valid ? 'text-blue-400' : 'text-red-400'}`}>{results.validation.valid ? 'VALID' : 'INVALID'}</p>
              </div>
              <div className={`p-2 rounded text-center cyber-border ${results.validation.is_disposable ? 'bg-red-950/30' : 'bg-blue-950/30'}`}>
                <p className="text-[10px] text-slate-500 font-mono">DISPOSABLE</p>
                <p className={`text-xs font-mono font-bold ${results.validation.is_disposable ? 'text-red-400' : 'text-blue-400'}`}>{results.validation.is_disposable ? 'YES' : 'NO'}</p>
              </div>
              <div className={`p-2 rounded text-center cyber-border ${results.validation.is_free_provider ? 'bg-yellow-950/30' : 'bg-slate-900/50'}`}>
                <p className="text-[10px] text-slate-500 font-mono">FREE EMAIL</p>
                <p className={`text-xs font-mono font-bold ${results.validation.is_free_provider ? 'text-yellow-400' : 'text-slate-400'}`}>{results.validation.is_free_provider ? 'YES' : 'NO'}</p>
              </div>
              <div className={`p-2 rounded text-center cyber-border ${results.validation.mx_valid ? 'bg-blue-950/30' : 'bg-red-950/30'}`}>
                <p className="text-[10px] text-slate-500 font-mono">MX RECORDS</p>
                <p className={`text-xs font-mono font-bold ${results.validation.mx_valid ? 'text-blue-400' : 'text-red-400'}`}>{results.validation.mx_valid ? 'VALID' : 'NONE'}</p>
              </div>
            </div>
          </div>

          {results.breaches.email_age?.estimated_age && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-1 text-blue-400">&#9656; DOMAIN AGE</h2>
              <p className="text-blue-400 text-sm font-mono">age: {results.breaches.email_age.estimated_age}</p>
              {results.breaches.email_age.domain_creation && (
                <p className="text-slate-500 text-xs font-mono">created: {results.breaches.email_age.domain_creation}</p>
              )}
            </div>
          )}

          {results.breaches.dns_info && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiGlobe /> DNS / EMAIL PROVIDER</h2>
              {results.breaches.dns_info.provider && (
                <p className="text-blue-400 text-sm font-mono mb-2">provider: {results.breaches.dns_info.provider}</p>
              )}
              {results.breaches.dns_info.mx_records?.length > 0 && (
                <div className="mt-2">
                  <p className="text-slate-500 text-xs font-mono">MX RECORDS:</p>
                  {results.breaches.dns_info.mx_records.map((mx, i) => (
                    <p key={i} className="font-mono text-xs ml-4 text-slate-400">{mx}</p>
                  ))}
                </div>
              )}
              {results.breaches.dns_info.spf_record && (
                <div className="mt-2">
                  <p className="text-slate-500 text-xs font-mono">SPF:</p>
                  <p className="font-mono text-[10px] ml-4 text-slate-400 break-all">{results.breaches.dns_info.spf_record}</p>
                </div>
              )}
              {results.breaches.dns_info.dmarc_record && (
                <div className="mt-2">
                  <p className="text-slate-500 text-xs font-mono">DMARC:</p>
                  <p className="font-mono text-[10px] ml-4 text-slate-400 break-all">{results.breaches.dns_info.dmarc_record}</p>
                </div>
              )}
            </div>
          )}

          {results.breaches.gravatar?.exists && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiUser /> GRAVATAR PROFILE</h2>
              <p className="text-blue-400 text-xs font-mono">[+] Gravatar account discovered</p>
              {results.breaches.gravatar.display_name && (
                <p className="text-slate-300 text-xs font-mono mt-1">name: {results.breaches.gravatar.display_name}</p>
              )}
              {results.breaches.gravatar.linked_urls?.length > 0 && (
                <div className="mt-2">
                  <p className="text-slate-500 text-xs font-mono">linked websites:</p>
                  {results.breaches.gravatar.linked_urls.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs font-mono block ml-4 hover:text-blue-300">{link.title}: {link.url}</a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiAlertTriangle /> DATA BREACHES ({results.breaches.breach_count})</h2>
            {results.breaches.breach_count > 0 ? (
              <div className="space-y-2">
                {results.breaches.breaches.map((breach, idx) => (
                  <div key={idx} className="bg-slate-900/50 p-3 rounded cyber-border">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm font-mono">{breach.title}</p>
                      {breach.is_verified && <span className="text-[9px] bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded font-mono">VERIFIED</span>}
                      {breach.is_sensitive && <span className="text-[9px] bg-red-600/30 text-red-400 px-1.5 py-0.5 rounded font-mono">SENSITIVE</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">domain:{breach.domain} | date:{breach.breach_date} | records:{breach.pwn_count?.toLocaleString()}</p>
                    {breach.data_classes && (
                      <p className="text-[10px] text-slate-600 font-mono mt-1">data: {breach.data_classes.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-blue-400 font-mono text-sm">$ no breaches found for this target</p>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default EmailSearch
