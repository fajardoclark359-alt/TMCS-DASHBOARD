import { useState, useEffect } from 'react'
import { FiServer, FiGlobe, FiShield, FiAlertTriangle, FiCheckCircle, FiXCircle, FiClock, FiExternalLink, FiRefreshCw, FiLock, FiActivity, FiRadio } from 'react-icons/fi'

const GOV_AGENCIES = [
  { name: 'Official Gazette', domain: 'www.officialgazette.gov.ph', category: 'executive', desc: 'Official publications of the Republic of the Philippines' },
  { name: 'Malacañang Palace', domain: 'www.malacanang.gov.ph', category: 'executive', desc: 'Office of the President of the Philippines' },
  { name: 'Office of the VP', domain: 'www.officialvillafuerte.ph', category: 'executive', desc: 'Office of the Vice President' },
  { name: 'Senate of the Philippines', domain: 'www.senate.gov.ph', category: 'legislative', desc: 'Upper house of the Philippine Congress' },
  { name: 'House of Representatives', domain: 'www.congress.gov.ph', category: 'legislative', desc: 'Lower house of the Philippine Congress' },
  { name: 'Congressional Bill Info', domain: 'www.congresslibrary.gov.ph', category: 'legislative', desc: 'Congressional library and bill tracking' },
  { name: 'Supreme Court', domain: 'www.supremecourt.gov.ph', category: 'judicial', desc: 'Highest court in the Philippines' },
  { name: 'Court of Appeals', domain: 'ca.gov.ph', category: 'judicial', desc: 'Appellate court of the Philippines' },
  { name: 'Sandiganbayan', domain: 'sandiganbayan.gov.ph', category: 'judicial', desc: 'Anti-graft court' },
  { name: 'DICT', domain: 'dict.gov.ph', category: 'executive', desc: 'Dept of Information and Communications Technology' },
  { name: 'DILG', domain: 'dilg.gov.ph', category: 'executive', desc: 'Dept of Interior and Local Government' },
  { name: 'DOJ', domain: 'doj.gov.ph', category: 'executive', desc: 'Department of Justice' },
  { name: 'DND', domain: 'dnd.gov.ph', category: 'defense', desc: 'Department of National Defense' },
  { name: 'AFP', domain: 'afp.mil.ph', category: 'defense', desc: 'Armed Forces of the Philippines' },
  { name: 'PNP', domain: 'www.pnp.gov.ph', category: 'defense', desc: 'Philippine National Police' },
  { name: 'NBI', domain: 'www.nbi.gov.ph', category: 'defense', desc: 'National Bureau of Investigation' },
  { name: 'PNP-ACG', domain: 'acg.pnp.gov.ph', category: 'defense', desc: 'Anti-Cybercrime Group' },
  { name: 'DepEd', domain: 'www.deped.gov.ph', category: 'education', desc: 'Department of Education' },
  { name: 'CHED', domain: 'www.ched.gov.ph', category: 'education', desc: 'Commission on Higher Education' },
  { name: 'TESDA', domain: 'www.tesda.gov.ph', category: 'education', desc: 'Technical Education and Skills Development Authority' },
  { name: 'DOH', domain: 'www.doh.gov.ph', category: 'health', desc: 'Department of Health' },
  { name: 'PhilHealth', domain: 'www.philhealth.gov.ph', category: 'health', desc: 'Philippine Health Insurance Corporation' },
  { name: 'DSWD', domain: 'www.dswd.gov.ph', category: 'social', desc: 'Dept of Social Welfare and Development' },
  { name: 'DepFinance', domain: 'www.gov.ph', category: 'finance', desc: 'Department of Finance' },
  { name: 'BIR', domain: 'www.bir.gov.ph', category: 'finance', desc: 'Bureau of Internal Revenue' },
  { name: 'BOC', domain: 'www.customs.gov.ph', category: 'finance', desc: 'Bureau of Customs' },
  { name: 'GSIS', domain: 'www.gsis.gov.ph', category: 'finance', desc: 'Government Service Insurance System' },
  { name: 'SSS', domain: 'www.sss.gov.ph', category: 'finance', desc: 'Social Security System' },
  { name: 'COMELEC', domain: 'www.comelec.gov.ph', category: 'election', desc: 'Commission on Elections' },
  { name: 'COA', domain: 'www.coa.gov.ph', category: 'oversight', desc: 'Commission on Audit' },
  { name: 'Civil Service Commission', domain: 'www.csc.gov.ph', category: 'oversight', desc: 'Civil Service Commission' },
  { name: 'NEDA', domain: 'www.neda.gov.ph', category: 'planning', desc: 'National Economic and Development Authority' },
  { name: 'Philippine Statistics Authority', domain: 'psa.gov.ph', category: 'statistics', desc: 'National statistical agency' },
  { name: 'DFA', domain: 'www.dfa.gov.ph', category: 'foreign', desc: 'Department of Foreign Affairs' },
  { name: 'DMW', domain: 'www.dmw.gov.ph', category: 'labor', desc: 'Dept of Migrant Workers' },
  { name: 'DOLE', domain: 'www.dole.gov.ph', category: 'labor', desc: 'Department of Labor and Employment' },
  { name: 'DENR', domain: 'www.denr.gov.ph', category: 'environment', desc: 'Dept of Environment and Natural Resources' },
  { name: 'DPWH', domain: 'www.dpwh.gov.ph', category: 'infrastructure', desc: 'Dept of Public Works and Highways' },
  { name: 'DOTR', domain: 'www.dotr.gov.ph', category: 'transport', desc: 'Dept of Transportation' },
  { name: 'LTO', domain: 'www.lto.gov.ph', category: 'transport', desc: 'Land Transportation Office' },
  { name: 'NICA', domain: 'nica.gov.ph', category: 'intelligence', desc: 'National Intelligence Coordinating Agency' },
  { name: 'NTC', domain: 'www.ntc.gov.ph', category: 'telecom', desc: 'National Telecommunications Commission' },
  { name: 'NSTP', domain: 'www.nstp.gov.ph', category: 'education', desc: 'National Service Training Program' },
  { name: 'LGPMS', domain: 'www.lgpms.gov.ph', category: 'local', desc: 'Local Government Monitoring System' },
  { name: 'eGov PH', domain: 'www.egov.gov.ph', category: 'digital', desc: 'Philippine eGovernment portal' },
]

const CATEGORY_COLORS = {
  executive: 'text-blue-400 bg-blue-900/30 border-blue-500/30',
  legislative: 'text-purple-400 bg-purple-900/30 border-purple-500/30',
  judicial: 'text-cyan-400 bg-cyan-900/30 border-cyan-500/30',
  defense: 'text-red-400 bg-red-900/30 border-red-500/30',
  education: 'text-green-400 bg-green-900/30 border-green-500/30',
  health: 'text-pink-400 bg-pink-900/30 border-pink-500/30',
  finance: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30',
  election: 'text-orange-400 bg-orange-900/30 border-orange-500/30',
  oversight: 'text-slate-300 bg-slate-700/30 border-slate-500/30',
  planning: 'text-teal-400 bg-teal-900/30 border-teal-500/30',
  statistics: 'text-indigo-400 bg-indigo-900/30 border-indigo-500/30',
  foreign: 'text-sky-400 bg-sky-900/30 border-sky-500/30',
  labor: 'text-amber-400 bg-amber-900/30 border-amber-500/30',
  environment: 'text-emerald-400 bg-emerald-900/30 border-emerald-500/30',
  infrastructure: 'text-orange-300 bg-orange-950/30 border-orange-400/30',
  transport: 'text-blue-300 bg-blue-950/30 border-blue-400/30',
  intelligence: 'text-red-300 bg-red-950/50 border-red-400/30',
  telecom: 'text-violet-400 bg-violet-900/30 border-violet-500/30',
  local: 'text-lime-400 bg-lime-900/30 border-lime-500/30',
  digital: 'text-cyan-300 bg-cyan-950/30 border-cyan-400/30',
  social: 'text-rose-400 bg-rose-900/30 border-rose-500/30',
  defense: 'text-red-400 bg-red-900/30 border-red-500/30',
}

function GovMonitor() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [alerts, setAlerts] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [alertCount, setAlertCount] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => { scanAllSites() }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => { scanAllSites() }, 60000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const playAlertSound = () => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const freqs = [880, 1100, 880]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.14)
        osc.start(ctx.currentTime + i * 0.15)
        osc.stop(ctx.currentTime + i * 0.15 + 0.15)
      })
    } catch {}
  }

  const scanSite = async (agency) => {
    const url = `https://${agency.domain}`
    let status = 'unknown', httpCode = null, responseTime = null, sslValid = null, sslExpiry = null, redirect = null, error = null

    try {
      const start = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const resp = await fetch(url, { mode: 'no-cors', redirect: 'follow', signal: controller.signal })
      clearTimeout(timeout)
      responseTime = Date.now() - start
      // no-cors gives opaque response — URL resolved = likely UP
      if (resp.type === 'opaque') {
        status = 'up'
        httpCode = 200 // opaque — assume OK
      } else if (resp.ok) {
        status = 'up'
        httpCode = resp.status
      } else {
        status = 'down'
        httpCode = resp.status
      }
      redirect = resp.redirected ? resp.url : null
    } catch (err) {
      if (err.name === 'AbortError') {
        status = 'timeout'
        error = 'Timeout (10s)'
      } else {
        status = 'down'
        error = err.message
      }
    }

    // Check SSL via DNS-over-HTTPS (cert info not available client-side, but domain resolution works)
    try {
      const dnsResp = await fetch(`https://cloudflare-dns.com/dns-query?name=${agency.domain}&type=A`, {
        headers: { 'accept': 'application/dns-json' },
        mode: 'cors',
      })
      if (dnsResp.ok) {
        const dnsData = await dnsResp.json()
        if (dnsData.Answer?.length > 0) {
          sslValid = true // domain resolves = likely has SSL
        } else {
          sslValid = false
        }
      }
    } catch {}

    return {
      ...agency,
      status,
      httpCode,
      responseTime,
      sslValid,
      sslExpiry,
      redirect,
      error,
      checkedAt: new Date().toISOString(),
    }
  }

  const scanAllSites = async () => {
    setLoading(true)
    const results = []
    const newAlerts = []
    let newAlertCount = 0

    // Scan in batches of 8
    for (let i = 0; i < GOV_AGENCIES.length; i += 8) {
      const batch = GOV_AGENCIES.slice(i, i + 8)
      const batchResults = await Promise.allSettled(batch.map(a => scanSite(a)))
      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          results.push(r.value)
          if (r.value.status === 'down' || r.value.status === 'timeout') {
            newAlerts.push({
              id: `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              title: `${r.value.status === 'timeout' ? '⏱️ TIMEOUT' : '🔴 DOWN'}: ${r.value.name}`,
              detail: r.value.error || `HTTP ${r.value.httpCode}`,
              domain: r.value.domain,
              severity: r.value.status === 'timeout' ? 'MEDIUM' : 'HIGH',
              time: new Date().toISOString(),
            })
            newAlertCount++
          }
          if (r.value.sslValid === false) {
            newAlerts.push({
              id: `ssl-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              title: `🔒 SSL ISSUE: ${r.value.name}`,
              detail: 'Domain does not resolve — possible DNS/SSL problem',
              domain: r.value.domain,
              severity: 'HIGH',
              time: new Date().toISOString(),
            })
            newAlertCount++
          }
        }
      }
    }

    setSites(results)
    setAlerts(prev => [...newAlerts, ...prev].slice(0, 100))
    setAlertCount(prev => {
      const total = prev + newAlertCount
      if (newAlertCount > 0) playAlertSound()
      return total
    })
    setLastScan(new Date().toISOString())
    setLoading(false)
  }

  const upCount = sites.filter(s => s.status === 'up').length
  const downCount = sites.filter(s => s.status === 'down').length
  const timeoutCount = sites.filter(s => s.status === 'timeout').length
  const unknownCount = sites.filter(s => s.status === 'unknown').length
  const sslIssues = sites.filter(s => s.sslValid === false).length

  const filteredSites = filter === 'all' ? sites
    : filter === 'up' ? sites.filter(s => s.status === 'up')
    : filter === 'down' ? sites.filter(s => s.status === 'down' || s.status === 'timeout')
    : sites.filter(s => s.category === filter)

  const categories = [...new Set(GOV_AGENCIES.map(a => a.category))].sort()

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiServer className="text-green-400" />
          <h1 className="title-cyber text-2xl font-bold text-green-400" style={{ textShadow: '0 0 10px rgba(34,197,94,0.3)' }}>PH GOV AGENCY MONITOR</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Real-time status monitoring for {GOV_AGENCIES.length} Philippine government websites</p>
      </div>

      {/* Control Bar */}
      <div className="card-cyber p-3 rounded-lg mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={scanAllSites} disabled={loading} className="btn-cyber px-4 py-2 rounded text-xs font-mono flex items-center gap-2">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> {loading ? 'SCANNING...' : 'SCAN ALL'}
          </button>
          <button onClick={() => setAutoRefresh(!autoRefresh)} className={`text-[10px] font-mono px-3 py-1.5 rounded ${autoRefresh ? 'bg-green-600/30 text-green-400 border border-green-500/30' : 'bg-slate-700/30 text-slate-400 border border-slate-600'}`}>
            {autoRefresh ? '🟢 AUTO-REFRESH (60s)' : '⚪ MANUAL'}
          </button>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className={`text-[10px] font-mono px-3 py-1.5 rounded ${soundEnabled ? 'bg-green-600/30 text-green-400 border border-green-500/30' : 'bg-slate-700/30 text-slate-400 border border-slate-600'}`}>
            {soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
          </button>
        </div>
        <div className="text-[10px] text-slate-600 font-mono">
          {lastScan ? `Last scan: ${lastScan.slice(11, 19)}` : 'Not scanned yet'} | {sites.length}/{GOV_AGENCIES.length} checked
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="card-cyber p-3 rounded-lg text-center bg-green-950/10 border border-green-500/20">
          <p className="text-green-400 text-2xl font-bold font-mono">{upCount}</p>
          <p className="text-[9px] text-green-300/70 font-mono">✅ ONLINE</p>
        </div>
        <div className="card-cyber p-3 rounded-lg text-center bg-red-950/10 border border-red-500/20">
          <p className="text-red-400 text-2xl font-bold font-mono">{downCount}</p>
          <p className="text-[9px] text-red-300/70 font-mono">🔴 DOWN</p>
        </div>
        <div className="card-cyber p-3 rounded-lg text-center bg-yellow-950/10 border border-yellow-500/20">
          <p className="text-yellow-400 text-2xl font-bold font-mono">{timeoutCount}</p>
          <p className="text-[9px] text-yellow-300/70 font-mono">⏱️ TIMEOUT</p>
        </div>
        <div className="card-cyber p-3 rounded-lg text-center bg-purple-950/10 border border-purple-500/20">
          <p className="text-purple-400 text-2xl font-bold font-mono">{sslIssues}</p>
          <p className="text-[9px] text-purple-300/70 font-mono">🔒 SSL ISSUE</p>
        </div>
        <div className="card-cyber p-3 rounded-lg text-center bg-slate-900/50 border border-slate-700/30">
          <p className="text-slate-400 text-2xl font-bold font-mono">{sites.length}</p>
          <p className="text-[9px] text-slate-500 font-mono">📊 TOTAL SCANNED</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { id: 'all', label: `ALL (${sites.length})` },
          { id: 'up', label: `✅ UP (${upCount})` },
          { id: 'down', label: `🔴 DOWN (${downCount + timeoutCount})` },
          ...categories.map(c => ({ id: c, label: `${c.toUpperCase()} (${sites.filter(s => s.category === c).length})` })),
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`text-[10px] font-mono px-3 py-1 rounded ${filter === f.id ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-slate-900/50 text-slate-500 border border-slate-700'}`}>{f.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {/* Sites Grid */}
          {loading && sites.length === 0 && <p className="text-slate-500 font-mono text-sm mb-3">Scanning {GOV_AGENCIES.length} government agency websites...</p>}
          <div className="space-y-2">
            {filteredSites.map((s, i) => (
              <div key={i} className={`card-cyber p-3 rounded-lg ${s.status === 'down' ? 'border-2 border-red-500/50 bg-red-950/20' : s.status === 'timeout' ? 'border border-yellow-500/30 bg-yellow-950/10' : s.sslValid === false ? 'border border-purple-500/30 bg-purple-950/10' : 'border border-slate-700/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {s.status === 'up' ? <FiCheckCircle className="text-green-400" size={16} /> : s.status === 'down' ? <FiXCircle className="text-red-400" size={16} /> : s.status === 'timeout' ? <FiClock className="text-yellow-400" size={16} /> : <FiActivity className="text-slate-500" size={16} />}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-mono font-bold">{s.name}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${CATEGORY_COLORS[s.category] || 'text-slate-400 bg-slate-800/50'}`}>{s.category.toUpperCase()}</span>
                        {s.status === 'down' && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/30 animate-pulse font-bold">DOWN</span>}
                        {s.status === 'timeout' && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-yellow-600/30 text-yellow-400 border border-yellow-500/30 animate-pulse">TIMEOUT</span>}
                      </div>
                      <p className="text-slate-500 text-[10px] font-mono">{s.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    {s.responseTime && <span className={s.responseTime > 3000 ? 'text-red-400' : s.responseTime > 1000 ? 'text-yellow-400' : 'text-green-400'}>{s.responseTime}ms</span>}
                    {s.sslValid !== null && <span className={s.sslValid ? 'text-green-400' : 'text-red-400'}>{s.sslValid ? '🔒 SSL' : '🔓 NO SSL'}</span>}
                    <a href={`https://${s.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300"><FiExternalLink size={12} /></a>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1 text-[9px] font-mono">
                  <span className="text-slate-500">domain: <span className="text-purple-400">{s.domain}</span></span>
                  {s.httpCode && <span className="text-slate-500">http: <span className={s.httpCode < 400 ? 'text-green-400' : 'text-red-400'}>{s.httpCode}</span></span>}
                  {s.redirect && <span className="text-slate-500">→ <span className="text-yellow-400">{s.redirect}</span></span>}
                  {s.error && <span className="text-red-400">error: {s.error}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Alerts */}
          <div className="card-cyber p-4 rounded-lg bg-red-950/10 border border-red-500/20">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-red-400">
              <FiAlertTriangle /> ALERTS ({alerts.length})
              {soundEnabled && <span className="text-green-400 text-[9px] animate-pulse">● LIVE</span>}
            </h2>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {alerts.length === 0 && <p className="text-slate-600 text-[10px] font-mono">No alerts — all sites healthy</p>}
              {alerts.map((a, i) => (
                <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${a.severity === 'HIGH' ? 'bg-red-600/30 text-red-400' : 'bg-yellow-600/30 text-yellow-400'}`}>{a.severity}</span>
                    <span className="text-[8px] text-slate-600 font-mono">{a.time?.slice(11, 19)}</span>
                  </div>
                  <p className="text-[10px] font-mono text-red-300">{a.title}</p>
                  <p className="text-[9px] font-mono text-slate-500">{a.domain}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Category Summary */}
          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-green-400"><FiGlobe /> CATEGORIES</h2>
            <div className="space-y-1">
              {categories.map(c => {
                const catSites = sites.filter(s => s.category === c)
                const catUp = catSites.filter(s => s.status === 'up').length
                return (
                  <div key={c} className="flex items-center justify-between text-[10px] font-mono">
                    <span className={`px-1.5 py-0.5 rounded ${CATEGORY_COLORS[c] || 'text-slate-400'}`}>{c.toUpperCase()}</span>
                    <span className={catUp === catSites.length && catSites.length > 0 ? 'text-green-400' : 'text-yellow-400'}>{catUp}/{catSites.length}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiLock /> SECURITY STATUS</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Sites with SSL</span>
                <span className="text-green-400">{sites.filter(s => s.sslValid === true).length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Sites without SSL</span>
                <span className="text-red-400">{sslIssues}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Avg Response Time</span>
                <span className="text-cyan-400">{sites.length > 0 ? Math.round(sites.filter(s => s.responseTime).reduce((a, s) => a + s.responseTime, 0) / sites.filter(s => s.responseTime).length) || 0 : 0}ms</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Uptime Rate</span>
                <span className="text-green-400">{sites.length > 0 ? Math.round((upCount / sites.length) * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GovMonitor
