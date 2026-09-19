import { useState, useEffect } from 'react'
import { lookupPhone, captureEvidence, listEvidence } from '../services/api'
import { clientLookupPhone } from '../services/clientFallbacks'
import { FiSearch, FiCheck, FiX, FiTerminal, FiPhone, FiUser, FiShield, FiAlertTriangle, FiLink, FiGlobe, FiMail, FiSave, FiFileText, FiClock, FiTag, FiDownload } from 'react-icons/fi'

function PhoneSearch() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('US')
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
      const data = await listEvidence()
      setEvidenceList(data)
    } catch (err) {
      console.error('Failed to fetch evidence list')
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!phoneNumber) return
    setLoading(true)
    setSaved(false)
    try {
      const data = await lookupPhone(phoneNumber, countryCode)
      setResults(data)
    } catch (err) {
      console.error('Backend unavailable, using client-side fallback:', err.message)
      try {
        const data = await clientLookupPhone(phoneNumber, countryCode)
        setResults(data)
      } catch (clientErr) {
        console.error(clientErr)
        alert('Error looking up phone: ' + clientErr.message)
      }
    }
    setLoading(false)
  }

  const handleCaptureEvidence = async () => {
    if (!results) return
    setSaving(true)
    try {
      const data = await captureEvidence({
        phone_number: phoneNumber,
        country_code: countryCode,
        notes: notes,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        priority: priority,
        case_id: caseId,
        investigation_type: 'phone_investigation'
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

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-blue-400" />
          <h1 className="title-cyber text-2xl font-bold text-blue-400 glow-text">PHONE OSINT</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Trace owner, social accounts, breaches, reputation + evidence capture</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
          className="bg-slate-900/50 rounded px-3 py-3 font-mono text-sm cyber-border">
          <option value="US">US (+1)</option>
          <option value="PH">PH (+63)</option>
          <option value="UK">UK (+44)</option>
          <option value="CA">CA (+1)</option>
          <option value="AU">AU (+61)</option>
          <option value="DE">DE (+49)</option>
          <option value="FR">FR (+33)</option>
          <option value="JP">JP (+81)</option>
          <option value="IN">IN (+91)</option>
          <option value="CN">CN (+86)</option>
          <option value="BR">BR (+55)</option>
          <option value="MX">MX (+52)</option>
          <option value="KR">KR (+82)</option>
          <option value="IT">IT (+39)</option>
          <option value="ES">ES (+34)</option>
          <option value="NL">NL (+31)</option>
          <option value="SG">SG (+65)</option>
          <option value="MY">MY (+60)</option>
          <option value="TH">TH (+66)</option>
          <option value="VN">VN (+84)</option>
          <option value="ID">ID (+62)</option>
          <option value="NG">NG (+234)</option>
          <option value="ZA">ZA (+27)</option>
          <option value="AE">AE (+971)</option>
          <option value="SA">SA (+966)</option>
          <option value="PK">PK (+92)</option>
          <option value="BD">BD (+880)</option>
        </select>
        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="$ enter-target-phone-number..."
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'TRACING...' : 'TRACE'}
        </button>
      </form>

      {results?.client_mode && (
        <div className="card-cyber p-3 rounded-lg mb-5 border border-yellow-500/30 bg-yellow-950/10">
          <p className="text-yellow-300 text-xs font-mono">⚡ Scanned in-browser — backend offline, results are from client-side OSINT</p>
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
              placeholder="suspect, scam, verification"
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
                  <FiPhone className="inline ml-2 mr-1" />{ev.target}
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

          {/* REPUTATION */}
          {results.reputation && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-lg font-bold mb-3 flex items-center gap-2 text-blue-400"><FiShield /> REPUTATION SCORE</h2>
              <div className="flex items-center gap-6 mb-3">
                <div className="text-5xl font-bold title-cyber text-white">{results.reputation.score}</div>
                <div className={`text-2xl font-bold title-cyber ${riskColor(results.reputation.risk_level)}`}>{results.reputation.risk_level} RISK</div>
              </div>
              {results.reputation.flags?.length > 0 && (
                <div className="mt-2 p-3 bg-slate-900/50 rounded cyber-border">
                  <p className="text-slate-500 text-xs font-mono mb-1">&#9656; ANALYSIS:</p>
                  {results.reputation.flags.map((f, i) => (
                    <p key={i} className="text-sm text-slate-300 font-mono ml-4">- {f}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BASIC INFO */}
          <div className="card-cyber p-5 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiPhone /> PHONE INTELLIGENCE</h2>
            {results.error && (
              <p className="text-red-400 text-sm font-mono mb-4">! {results.error}</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">NUMBER</p>
                <p className="font-mono text-xs text-white">{results.phone_number}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">E.164</p>
                <p className="font-mono text-xs text-blue-400">{results.formatted || 'N/A'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">INTERNATIONAL</p>
                <p className="font-mono text-xs text-blue-300">{results.formatted_international || 'N/A'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">NATIONAL</p>
                <p className="font-mono text-xs text-white">{results.formatted_national || 'N/A'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">VALID</p>
                <p className={`text-xs font-mono font-bold ${results.valid ? 'text-blue-400' : 'text-red-400'}`}>
                  {results.valid ? 'YES' : 'NO'}
                </p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">COUNTRY</p>
                <p className="font-mono text-xs text-white">{results.country_name || results.country || 'Unknown'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">CARRIER</p>
                <p className="font-mono text-xs text-cyan-400">{results.carrier || 'Unknown'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">LINE TYPE</p>
                <p className="font-mono text-xs text-white">{results.line_type || 'Unknown'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">TIMEZONE</p>
                <p className="font-mono text-xs text-yellow-400">{results.timezone || 'Unknown'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">LOCATION</p>
                <p className="font-mono text-xs text-green-400">{results.location || 'Unknown'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">COUNTRY CODE</p>
                <p className="font-mono text-xs text-white">{results.country || 'Unknown'}</p>
              </div>
              <div className="bg-slate-900/50 p-2 rounded cyber-border">
                <p className="text-[10px] text-slate-500 font-mono">LOCAL DIGITS</p>
                <p className="font-mono text-xs text-white">{results.local_digits || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* OWNER INFO */}
          {results.owner_info && Object.keys(results.owner_info).length > 0 && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiUser /> OWNER TRACE</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-slate-900/50 p-2 rounded cyber-border">
                  <p className="text-[10px] text-slate-500">COUNTRY</p>
                  <p className="text-white">{results.owner_info.country || 'Unknown'}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border">
                  <p className="text-[10px] text-slate-500">LOCATION</p>
                  <p className="text-blue-400">{results.owner_info.location || 'Unknown'}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border">
                  <p className="text-[10px] text-slate-500">CARRIER</p>
                  <p className="text-white">{results.owner_info.carrier_owner || 'Unknown'}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border">
                  <p className="text-[10px] text-slate-500">TIMEZONE</p>
                  <p className="text-yellow-400">{results.owner_info.timezone || 'Unknown'}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border">
                  <p className="text-[10px] text-slate-500">NUMBER TYPE</p>
                  <p className="text-white">{results.owner_info.number_type || 'Unknown'}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded cyber-border">
                  <p className="text-[10px] text-slate-500">BUSINESS</p>
                  <p className={results.owner_info.is_business ? 'text-yellow-400' : 'text-blue-400'}>{results.owner_info.is_business ? 'YES' : 'NO'}</p>
                </div>
              </div>
              {results.owner_info.possible_names?.length > 0 && (
                <div className="mt-2">
                  <p className="text-slate-500 text-xs font-mono">POSSIBLE NAMES:</p>
                  {results.owner_info.possible_names.map((name, i) => (
                    <p key={i} className="text-blue-400 text-xs font-mono ml-4">+ {name}</p>
                  ))}
                </div>
              )}
              {results.owner_info.possible_locations?.length > 0 && (
                <div className="mt-2">
                  <p className="text-slate-500 text-xs font-mono">POSSIBLE LOCATIONS:</p>
                  {results.owner_info.possible_locations.map((loc, i) => (
                    <p key={i} className="text-green-400 text-xs font-mono ml-4">+ {loc}</p>
                  ))}
                </div>
              )}
              {results.owner_info.risk_flags?.length > 0 && (
                <div className="mt-2 p-3 bg-orange-950/20 rounded border border-orange-500/20">
                  <p className="text-orange-400 text-xs font-mono mb-1">&#9656; RISK FLAGS:</p>
                  {results.owner_info.risk_flags.map((f, i) => (
                    <p key={i} className="text-orange-300 text-xs font-mono ml-4">- {f}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SOCIAL ACCOUNTS */}
          {results.social_accounts && Object.keys(results.social_accounts).length > 0 && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiLink /> LINKED SOCIAL ACCOUNTS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(results.social_accounts).map(([platform, info]) => (
                  <div key={platform} className="bg-slate-900/50 p-2 rounded cyber-border flex items-center justify-between">
                    <div>
                      <span className="font-bold text-blue-400 uppercase text-xs font-mono">[{platform}]</span>
                      {info.username && <span className="text-slate-300 ml-2 text-xs">{info.username}</span>}
                      {info.name && <span className="text-slate-300 ml-2 text-xs">{info.name}</span>}
                      {info.status && <span className="text-green-400 ml-2 text-xs">{info.status}</span>}
                    </div>
                    {info.url && (
                      <a href={info.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs">&#9656; VIEW</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LINKED EMAILS */}
          {results.linked_emails?.length > 0 && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiMail /> LINKED EMAILS</h2>
              <div className="space-y-2">
                {results.linked_emails.map((e, i) => (
                  <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border flex items-center justify-between">
                    <div>
                      <span className="text-blue-400 text-xs font-mono">{e.email}</span>
                      <span className="text-slate-500 text-[10px] font-mono ml-2">via {e.source}</span>
                    </div>
                    {e.username && <span className="text-slate-400 text-[10px] font-mono">@{e.username}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BREACH DATA */}
          {results.breach_data?.length > 0 && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiAlertTriangle /> BREACH DATA ({results.breach_data.length})</h2>
              <div className="space-y-2">
                {results.breach_data.map((breach, i) => (
                  <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-mono font-bold">{breach.title}</span>
                      {breach.is_verified && <span className="text-[9px] bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded font-mono">VERIFIED</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">domain:{breach.domain} | date:{breach.breach_date} | records:{breach.pwn_count?.toLocaleString()}</p>
                    {breach.data_classes?.length > 0 && (
                      <p className="text-[10px] text-slate-600 font-mono mt-1">data: {breach.data_classes.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPAM REPORTS */}
          {results.spam_reports?.length > 0 && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiAlertTriangle /> SPAM / SCAM REPORTS</h2>
              <div className="space-y-2">
                {results.spam_reports.map((report, i) => (
                  <div key={i} className="bg-red-950/20 p-2 rounded cyber-border">
                    <p className="text-red-400 text-xs font-mono">! {report.source}: {report.status}</p>
                    <p className="text-[10px] text-slate-500 font-mono">risk: {report.risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default PhoneSearch
