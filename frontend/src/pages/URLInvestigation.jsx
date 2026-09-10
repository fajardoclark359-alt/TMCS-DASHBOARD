import { useState } from 'react'
import { investigateURL } from '../services/api'
import { FiSearch, FiShield, FiAlertTriangle, FiCheck, FiX, FiGlobe, FiServer, FiLock, FiMapPin, FiCpu, FiEye, FiTerminal } from 'react-icons/fi'

function URLInvestigation() {
  const [url, setUrl] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!url) return
    setLoading(true)
    try {
      const data = await investigateURL(url)
      setResults(data)
    } catch (err) {
      console.error(err)
      alert('Error investigating URL')
    }
    setLoading(false)
  }

  const riskColor = (level) => {
    if (level === 'LOW') return 'text-green-400 glow-text'
    if (level === 'MEDIUM') return 'text-yellow-400'
    if (level === 'HIGH') return 'text-orange-400'
    return 'text-red-400 glow-text-red'
  }

  const statusBadge = (active) => active
    ? <span className="bg-green-600/30 text-green-400 text-[10px] px-2 py-0.5 rounded font-mono">ACTIVE</span>
    : <span className="bg-red-600/30 text-red-400 text-[10px] px-2 py-0.5 rounded font-mono">OFFLINE</span>

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-green-400" />
          <h1 className="title-cyber text-2xl font-bold text-green-400 glow-text">URL INVESTIGATE</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Deep URL forensics - IP, geolocation, SSL, tech, phishing detection</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="$ enter-target-url (https://...)"
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'INVESTIGATING...' : 'INVESTIGATE'}
        </button>
      </form>

      {results && (
        <div className="space-y-5">

          {results.reputation && (
            <div className="card-cyber p-5 rounded-lg">
              <h2 className="title-cyber text-lg font-bold mb-3 flex items-center gap-2 text-green-400"><FiShield /> REPUTATION SCORE</h2>
              <div className="flex items-center gap-6 mb-3">
                <div className="text-5xl font-bold title-cyber text-white">{results.reputation.score}</div>
                <div className={`text-2xl font-bold title-cyber ${riskColor(results.reputation.risk_level)}`}>{results.reputation.risk_level} RISK</div>
              </div>
              {results.reputation.flags.length > 0 && (
                <div className="mt-2 p-3 bg-red-950/20 rounded border border-red-500/20">
                  <p className="text-red-400 text-xs font-mono mb-1">&#9656; SECURITY FLAGS:</p>
                  {results.reputation.flags.map((f, i) => (
                    <p key={i} className="text-red-300 text-xs font-mono ml-4">- {f}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-green-400"><FiGlobe /> DOMAIN STATUS</h2>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">status:</span>{statusBadge(results.domain_status?.active)}</div>
                <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">http:</span>{results.domain_status?.http_reachable ? <FiCheck className="text-green-400" /> : <FiX className="text-red-400" />}</div>
                <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">https:</span>{results.domain_status?.https_reachable ? <FiCheck className="text-green-400" /> : <FiX className="text-red-400" />}</div>
                <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">response:</span><span className="text-cyan-400">{results.domain_status?.response_time_ms ? `${results.domain_status.response_time_ms}ms` : 'N/A'}</span></div>
              </div>
            </div>
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-green-400"><FiLock /> SSL CERTIFICATE</h2>
              {results.ssl?.valid ? (
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">valid:</span><FiCheck className="text-green-400" /></div>
                  <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">issuer:</span><span className="text-white">{results.ssl.issuer}</span></div>
                  <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">expires:</span><span className="text-yellow-400">{results.ssl.not_after}</span></div>
                  <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">days_left:</span><span className={results.ssl.days_remaining < 30 ? 'text-red-400' : 'text-green-400'}>{results.ssl.days_remaining}</span></div>
                  <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">protocol:</span><span className="text-white">{results.ssl.protocol}</span></div>
                  <div className="flex justify-between bg-slate-900/50 p-2 rounded"><span className="text-slate-500">cipher:</span><span className="text-slate-300 text-[10px]">{results.ssl.cipher}</span></div>
                </div>
              ) : (
                <p className="text-red-400 font-mono text-sm">! No valid SSL certificate</p>
              )}
            </div>
          </div>

          {results.ip_addresses?.length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-green-400"><FiServer /> IP & GEOLOCATION</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 text-xs font-mono mb-2">IP ADDRESSES:</p>
                  {results.ip_addresses.map((ip, i) => (
                    <p key={i} className="font-mono text-sm text-green-400 cyber-border inline-block px-2 py-1 rounded mr-2 mb-1">{ip}</p>
                  ))}
                </div>
                {results.geolocation?.country && (
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">country:</span><span className="text-white">{results.geolocation.country} ({results.geolocation.country_code})</span></div>
                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">region:</span><span className="text-white">{results.geolocation.region}</span></div>
                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">city:</span><span className="text-white">{results.geolocation.city}</span></div>
                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">isp:</span><span className="text-cyan-400">{results.geolocation.isp}</span></div>
                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">org:</span><span className="text-white">{results.geolocation.org}</span></div>
                    <div className="flex justify-between bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">as:</span><span className="text-slate-300 text-[10px]">{results.geolocation.as}</span></div>
                    {results.geolocation.latitude && (
                      <div className="flex justify-between bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">coords:</span><span className="text-yellow-400">{results.geolocation.latitude}, {results.geolocation.longitude}</span></div>
                    )}
                  </div>
                )}
              </div>
              {results.geolocation?.latitude && (
                <a href={`https://www.google.com/maps?q=${results.geolocation.latitude},${results.geolocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs font-mono mt-2 inline-block hover:text-green-300">&#9656; VIEW ON GOOGLE MAPS</a>
              )}
            </div>
          )}

          {results.security && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-green-400"><FiAlertTriangle /> SECURITY ANALYSIS</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className={`p-2 rounded text-center cyber-border ${results.security.is_https ? 'bg-green-950/30' : 'bg-red-950/30'}`}>
                  <p className="text-[10px] text-slate-500 font-mono">HTTPS</p>
                  <p className={`text-xs font-mono font-bold ${results.security.is_https ? 'text-green-400' : 'text-red-400'}`}>{results.security.is_https ? 'YES' : 'NO'}</p>
                </div>
                <div className={`p-2 rounded text-center cyber-border ${results.security.suspicious_tlds ? 'bg-red-950/30' : 'bg-green-950/30'}`}>
                  <p className="text-[10px] text-slate-500 font-mono">SUSPICIOUS TLD</p>
                  <p className={`text-xs font-mono font-bold ${results.security.suspicious_tlds ? 'text-red-400' : 'text-green-400'}`}>{results.security.suspicious_tlds ? 'YES' : 'NO'}</p>
                </div>
                <div className={`p-2 rounded text-center cyber-border ${results.security.phishing_keywords ? 'bg-red-950/30' : 'bg-green-950/30'}`}>
                  <p className="text-[10px] text-slate-500 font-mono">PHISHING</p>
                  <p className={`text-xs font-mono font-bold ${results.security.phishing_keywords ? 'text-red-400' : 'text-green-400'}`}>{results.security.phishing_keywords ? 'YES' : 'NO'}</p>
                </div>
                <div className={`p-2 rounded text-center cyber-border ${results.security.free_hosting ? 'bg-yellow-950/30' : 'bg-slate-900/50'}`}>
                  <p className="text-[10px] text-slate-500 font-mono">FREE HOST</p>
                  <p className={`text-xs font-mono font-bold ${results.security.free_hosting ? 'text-yellow-400' : 'text-slate-400'}`}>{results.security.free_hosting ? 'YES' : 'NO'}</p>
                </div>
                <div className={`p-2 rounded text-center cyber-border ${results.security.short_url ? 'bg-yellow-950/30' : 'bg-slate-900/50'}`}>
                  <p className="text-[10px] text-slate-500 font-mono">SHORTENER</p>
                  <p className={`text-xs font-mono font-bold ${results.security.short_url ? 'text-yellow-400' : 'text-slate-400'}`}>{results.security.short_url ? 'YES' : 'NO'}</p>
                </div>
                <div className={`p-2 rounded text-center cyber-border ${results.security.recently_registered ? 'bg-red-950/30' : 'bg-green-950/30'}`}>
                  <p className="text-[10px] text-slate-500 font-mono">NEW DOMAIN</p>
                  <p className={`text-xs font-mono font-bold ${results.security.recently_registered ? 'text-red-400' : 'text-green-400'}`}>{results.security.recently_registered ? 'YES' : 'NO'}</p>
                </div>
                <div className={`p-2 rounded text-center cyber-border ${results.security.ip_based_url ? 'bg-red-950/30' : 'bg-green-950/30'}`}>
                  <p className="text-[10px] text-slate-500 font-mono">IP-BASED</p>
                  <p className={`text-xs font-mono font-bold ${results.security.ip_based_url ? 'text-red-400' : 'text-green-400'}`}>{results.security.ip_based_url ? 'YES' : 'NO'}</p>
                </div>
                <div className={`p-2 rounded text-center cyber-border ${results.security.has_redirects ? 'bg-yellow-950/30' : 'bg-slate-900/50'}`}>
                  <p className="text-[10px] text-slate-500 font-mono">REDIRECTS</p>
                  <p className={`text-xs font-mono font-bold ${results.security.has_redirects ? 'text-yellow-400' : 'text-slate-400'}`}>{results.security.has_redirects ? 'YES' : 'NO'}</p>
                </div>
              </div>
              {results.security.flags?.length > 0 && (
                <div className="mt-3 p-3 bg-orange-950/20 rounded border border-orange-500/20">
                  <p className="text-orange-400 text-xs font-mono mb-1">&#9656; FLAGS:</p>
                  {results.security.flags.map((f, i) => (
                    <p key={i} className="text-orange-300 text-xs font-mono ml-4">- {f}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {results.technology && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-green-400"><FiCpu /> TECHNOLOGY STACK</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {results.technology.cms && <div className="bg-slate-900/50 p-2 rounded cyber-border"><p className="text-[10px] text-slate-500 font-mono">CMS</p><p className="text-xs text-white font-mono">{results.technology.cms}</p></div>}
                {results.technology.framework && <div className="bg-slate-900/50 p-2 rounded cyber-border"><p className="text-[10px] text-slate-500 font-mono">FRAMEWORK</p><p className="text-xs text-white font-mono">{results.technology.framework}</p></div>}
                {results.technology.language && <div className="bg-slate-900/50 p-2 rounded cyber-border"><p className="text-[10px] text-slate-500 font-mono">LANGUAGE</p><p className="text-xs text-white font-mono">{results.technology.language}</p></div>}
                {results.technology.cdn && <div className="bg-slate-900/50 p-2 rounded cyber-border"><p className="text-[10px] text-slate-500 font-mono">CDN</p><p className="text-xs text-white font-mono">{results.technology.cdn}</p></div>}
                {results.technology.analytics?.length > 0 && (
                  <div className="bg-slate-900/50 p-2 rounded cyber-border col-span-2">
                    <p className="text-[10px] text-slate-500 font-mono">ANALYTICS</p>
                    <p className="text-xs text-white font-mono">{results.technology.analytics.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {results.redirects?.length > 0 && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 text-green-400">&#9656; REDIRECT CHAIN</h2>
              <div className="space-y-1">
                {results.redirects.map((r, i) => (
                  <div key={i} className="bg-slate-900/50 p-2 rounded text-xs font-mono cyber-border">
                    <span className="text-yellow-400">{r.status}</span> <span className="text-slate-500">→</span> <span className="text-green-400">{r.location}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.whois?.registrar && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-2 text-green-400">&#9656; WHOIS</h2>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">registrar:</span> <span className="text-white">{results.whois.registrar}</span></div>
                <div className="bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">org:</span> <span className="text-white">{results.whois.org}</span></div>
                <div className="bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">created:</span> <span className="text-green-400">{results.whois.creation_date}</span></div>
                <div className="bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">expires:</span> <span className="text-yellow-400">{results.whois.expiration_date}</span></div>
                <div className="bg-slate-900/50 p-1.5 rounded"><span className="text-slate-500">country:</span> <span className="text-white">{results.whois.country}</span></div>
              </div>
            </div>
          )}

          {results.screenshot && (
            <div className="card-cyber p-4 rounded-lg">
              <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-green-400"><FiEye /> SCREENSHOT</h2>
              <img src={results.screenshot} alt="URL Screenshot" className="rounded cyber-border max-w-full" onError={(e) => e.target.style.display='none'} />
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default URLInvestigation
