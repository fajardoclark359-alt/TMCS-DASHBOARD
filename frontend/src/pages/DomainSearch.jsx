import { useState } from 'react'
import { lookupDomain, subdomainEnum } from '../services/api'
import { FiSearch, FiServer, FiTerminal, FiGlobe } from 'react-icons/fi'

function DomainSearch() {
  const [domain, setDomain] = useState('')
  const [results, setResults] = useState(null)
  const [subdomains, setSubdomains] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!domain) return
    setLoading(true)
    try {
      const [domainData, subData] = await Promise.all([
        lookupDomain(domain),
        subdomainEnum(domain)
      ])
      setResults(domainData)
      setSubdomains(subData)
    } catch (err) {
      console.error(err)
      alert('Error looking up domain')
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-blue-400" />
          <h1 className="title-cyber text-2xl font-bold text-blue-400 glow-text">DOMAIN RECON</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Domain reconnaissance - WHOIS, DNS, subdomain enumeration</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
          placeholder="$ enter-target-domain.com..."
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'SCANNING...' : 'ENUMERATE'}
        </button>
      </form>

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
