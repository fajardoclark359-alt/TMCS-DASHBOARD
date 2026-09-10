import { useState } from 'react'
import { searchEmail } from '../services/api'
import { FiSearch, FiAlertTriangle, FiCheck, FiShield, FiUser, FiGlobe, FiMail, FiPhone, FiFileText, FiLink, FiStar, FiTerminal } from 'react-icons/fi'

function EmailSearch() {
  const [email, setEmail] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const data = await searchEmail(email)
      setResults(data)
    } catch (err) {
      console.error(err)
      alert('Error investigating email')
    }
    setLoading(false)
  }

  const riskColor = (level) => {
    if (level === 'LOW') return 'text-green-400 glow-text'
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
          <FiTerminal className="text-green-400" />
          <h1 className="title-cyber text-2xl font-bold text-green-400 glow-text">EMAIL OSINT</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Deep email intelligence - breaches, social discovery, DNS analysis</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="$ enter-target-email@domain.com..."
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'INVESTIGATING...' : 'INVESTIGATE'}
        </button>
      </form>

      {results && (
        <div className="space-y-5">

          {results.breaches.reputation && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-lg font-bold mb-3 flex items-center gap-2 text-green-400"><FiStar /> REPUTATION SCORE</h2>
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
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiUser /> EXTRACTED USERNAMES</h2>
              <p className="text-slate-500 text-xs font-mono mb-2">$ username candidates from email local-part:</p>
              <div className="flex flex-wrap gap-2">
                {results.breaches.username_hints.possible_usernames.map((u, i) => (
                  <span key={i} className="bg-green-950/50 text-green-300 px-3 py-1 rounded text-xs font-mono cyber-border">{u}</span>
                ))}
              </div>
              {results.breaches.username_hints.possible_names?.length > 0 && (
                <p className="text-slate-500 text-xs font-mono mt-2">$ likely name: <span className="text-green-400">{results.breaches.username_hints.possible_names[0]}</span></p>
              )}
            </div>
          )}

          {results.breaches.social_accounts && Object.keys(results.breaches.social_accounts).length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiLink /> LINKED SOCIAL ACCOUNTS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(results.breaches.social_accounts).map(([platform, info]) => (
                  <div key={platform} className="bg-slate-900/50 p-2 rounded cyber-border flex items-center justify-between">
                    <div>
                      <span className="font-bold text-green-400 uppercase text-xs font-mono">[{platform}]</span>
                      {info.username && <span className="text-slate-300 ml-2 text-xs">{info.username}</span>}
                      {info.reputation && <span className="text-slate-500 ml-2 text-xs">rep:{info.reputation}</span>}
                    </div>
                    {info.url && (
                      <a href={info.url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 text-xs">&#9656; VIEW</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.breaches.phone_numbers?.length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiPhone /> PHONE / CONTACT LEAKS</h2>
              {results.breaches.phone_numbers.map((p, i) => (
                <p key={i} className="text-orange-400 text-xs font-mono">! {p}</p>
              ))}
            </div>
          )}

          {results.breaches.leaked_info?.length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiAlertTriangle /> LEAKED INFORMATION</h2>
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
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiFileText /> LEAKED FILES / DATA</h2>
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
            <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiCheck /> VALIDATION</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className={`p-2 rounded text-center cyber-border ${results.validation.valid ? 'bg-green-950/30' : 'bg-red-950/30'}`}>
                <p className="text-[10px] text-slate-500 font-mono">FORMAT</p>
                <p className={`text-xs font-mono font-bold ${results.validation.valid ? 'text-green-400' : 'text-red-400'}`}>{results.validation.valid ? 'VALID' : 'INVALID'}</p>
              </div>
              <div className={`p-2 rounded text-center cyber-border ${results.validation.is_disposable ? 'bg-red-950/30' : 'bg-green-950/30'}`}>
                <p className="text-[10px] text-slate-500 font-mono">DISPOSABLE</p>
                <p className={`text-xs font-mono font-bold ${results.validation.is_disposable ? 'text-red-400' : 'text-green-400'}`}>{results.validation.is_disposable ? 'YES' : 'NO'}</p>
              </div>
              <div className={`p-2 rounded text-center cyber-border ${results.validation.is_free_provider ? 'bg-yellow-950/30' : 'bg-slate-900/50'}`}>
                <p className="text-[10px] text-slate-500 font-mono">FREE EMAIL</p>
                <p className={`text-xs font-mono font-bold ${results.validation.is_free_provider ? 'text-yellow-400' : 'text-slate-400'}`}>{results.validation.is_free_provider ? 'YES' : 'NO'}</p>
              </div>
              <div className={`p-2 rounded text-center cyber-border ${results.validation.mx_valid ? 'bg-green-950/30' : 'bg-red-950/30'}`}>
                <p className="text-[10px] text-slate-500 font-mono">MX RECORDS</p>
                <p className={`text-xs font-mono font-bold ${results.validation.mx_valid ? 'text-green-400' : 'text-red-400'}`}>{results.validation.mx_valid ? 'VALID' : 'NONE'}</p>
              </div>
            </div>
          </div>

          {results.breaches.email_age?.estimated_age && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-1 text-green-400">&#9656; DOMAIN AGE</h2>
              <p className="text-green-400 text-sm font-mono">age: {results.breaches.email_age.estimated_age}</p>
              {results.breaches.email_age.domain_creation && (
                <p className="text-slate-500 text-xs font-mono">created: {results.breaches.email_age.domain_creation}</p>
              )}
            </div>
          )}

          {results.breaches.dns_info && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiGlobe /> DNS / EMAIL PROVIDER</h2>
              {results.breaches.dns_info.provider && (
                <p className="text-green-400 text-sm font-mono mb-2">provider: {results.breaches.dns_info.provider}</p>
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
              <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiUser /> GRAVATAR PROFILE</h2>
              <p className="text-green-400 text-xs font-mono">[+] Gravatar account discovered</p>
              {results.breaches.gravatar.display_name && (
                <p className="text-slate-300 text-xs font-mono mt-1">name: {results.breaches.gravatar.display_name}</p>
              )}
              {results.breaches.gravatar.linked_urls?.length > 0 && (
                <div className="mt-2">
                  <p className="text-slate-500 text-xs font-mono">linked websites:</p>
                  {results.breaches.gravatar.linked_urls.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs font-mono block ml-4 hover:text-green-300">{link.title}: {link.url}</a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-green-400"><FiAlertTriangle /> DATA BREACHES ({results.breaches.breach_count})</h2>
            {results.breaches.breach_count > 0 ? (
              <div className="space-y-2">
                {results.breaches.breaches.map((breach, idx) => (
                  <div key={idx} className="bg-slate-900/50 p-3 rounded cyber-border">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm font-mono">{breach.title}</p>
                      {breach.is_verified && <span className="text-[9px] bg-green-600/30 text-green-400 px-1.5 py-0.5 rounded font-mono">VERIFIED</span>}
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
              <p className="text-green-400 font-mono text-sm">$ no breaches found for this target</p>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default EmailSearch
