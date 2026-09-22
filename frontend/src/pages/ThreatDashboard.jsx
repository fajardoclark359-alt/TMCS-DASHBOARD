import { useState, useEffect } from 'react'
import { FiShield, FiAlertTriangle, FiAlertOctagon, FiActivity, FiServer, FiEye, FiGlobe, FiWifi, FiPackage, FiZap, FiMessageCircle, FiDollarSign, FiClock, FiTrendingUp, FiTrendingDown, FiMinus, FiChevronRight, FiArrowUp, FiArrowDown, FiSearch, FiFilter, FiRefreshCw, FiDownload, FiPrinter, FiMaximize2 } from 'react-icons/fi'
import ReportModal from '../components/ReportModal'

/* ─── Data ─── */
const THREAT_CATEGORIES = [
  { id: 'gambling', label: 'ILLEGAL ONLINE GAMBLING', icon: <FiWifi size={22} />, color: '#f59e0b', count: 342, trend: 'up', trendVal: '+18%', desc: 'Unlicensed casinos, online betting, illegal sabong' },
  { id: 'fraud', label: 'FINANCIAL FRAUD', icon: <FiDollarSign size={22} />, color: '#ef4444', count: 567, trend: 'up', trendVal: '+24%', desc: 'Banking scams, phishing, investment fraud, money mule' },
  { id: 'osaec', label: 'OSAEC', icon: <FiAlertOctagon size={22} />, color: '#dc2626', count: 189, trend: 'up', trendVal: '+9%', desc: 'Online Sexual Abuse & Exploitation of Children' },
  { id: 'govt', label: 'THREAT TO GOVERNMENT', icon: <FiShield size={22} />, color: '#8b5cf6', count: 124, trend: 'down', trendVal: '-5%', desc: 'Cyber attacks on govt systems, propaganda, destabilization' },
  { id: 'infodis', label: 'INFORMATION DISORDER', icon: <FiMessageCircle size={22} />, color: '#3b82f6', count: 891, trend: 'up', trendVal: '+31%', desc: 'Fake news, disinformation, misinformation campaigns' },
  { id: 'violence', label: 'VIOLENT EXTREMISM', icon: <FiZap size={22} />, color: '#f97316', count: 76, trend: 'down', trendVal: '-12%', desc: 'Terror-related content, radicalization, recruitment' },
  { id: 'illicit', label: 'ILLICIT TRADE SERVICES', icon: <FiPackage size={22} />, color: '#10b981', count: 213, trend: 'up', trendVal: '+7%', desc: 'Dark web markets, illegal goods/services trafficking' },
  { id: 'unlawful', label: 'UNLAWFUL ONLINE ACTIVITIES', icon: <FiAlertTriangle size={22} />, color: '#6366f1', count: 445, trend: 'up', trendVal: '+14%', desc: 'General cybercrime, hacking, unauthorized access' },
]

const SEVERITY_DATA = [
  { level: 'CRITICAL', count: 23, color: '#bd2426', pct: 3 },
  { level: 'HIGH', count: 87, color: '#f5a623', pct: 11 },
  { level: 'MEDIUM', count: 156, color: '#dcd126', pct: 20 },
  { level: 'LOW', count: 342, color: '#50c8e8', pct: 44 },
  { level: 'INFO', count: 183, color: '#6c757d', pct: 22 },
]

const SYSTEMS = [
  { name: 'Threat Intelligence Engine', status: 'online', uptime: '99.97%', lastSync: '2s ago' },
  { name: 'Real-Time Alert Feed', status: 'online', uptime: '99.99%', lastSync: 'Live' },
  { name: 'Dark Web Scanner', status: 'warning', uptime: '98.21%', lastSync: '45s ago' },
  { name: 'Database Sync Service', status: 'online', uptime: '99.95%', lastSync: '12s ago' },
  { name: 'AI Classification Engine', status: 'online', uptime: '99.89%', lastSync: '8s ago' },
  { name: 'Reporting Module', status: 'online', uptime: '99.93%', lastSync: '5s ago' },
]

const RECENT_INCIDENTS = [
  { id: 'TMCS-7A3F', severity: 'critical', category: 'OSAEC', title: 'Child exploitation material detected on social platform', source: 'Facebook', time: '2 min ago', status: 'active' },
  { id: 'TMCS-9B2E', severity: 'high', category: 'Financial Fraud', title: 'Phishing campaign targeting BDO account holders', source: 'Email', time: '8 min ago', status: 'active' },
  { id: 'TMCS-4C1D', severity: 'high', category: 'Violent Extremism', title: 'Recruitment propaganda spreading in Mindanao group', source: 'Telegram', time: '15 min ago', status: 'investigating' },
  { id: 'TMCS-6E8A', severity: 'medium', category: 'Information Disorder', title: 'Viral fake news about PhilHealth data breach', source: 'Twitter/X', time: '23 min ago', status: 'active' },
  { id: 'TMCS-2F5G', severity: 'medium', category: 'Illegal Gambling', title: 'New illegal online casino detected — "LuckyBet PH"', source: 'Web', time: '31 min ago', status: 'investigating' },
  { id: 'TMCS-8H1K', severity: 'low', category: 'Unlawful Activities', title: 'Unauthorized port scanning detected on govt network', source: 'IDS', time: '45 min ago', status: 'resolved' },
  { id: 'TMCS-3J7L', severity: 'medium', category: 'Illicit Trade', title: 'Dark web listing for stolen PH National ID data', source: 'Tor', time: '1 hr ago', status: 'active' },
  { id: 'TMCS-5M9N', severity: 'high', category: 'Threat to Government', title: 'DDoS attack attempt on DICT portal', source: 'WAF', time: '1 hr ago', status: 'mitigated' },
]

const GEO_THREATS = [
  { region: 'NCR', count: 892, pct: 34 },
  { region: 'CALABARZON', count: 421, pct: 16 },
  { region: 'Central Luzon', count: 356, pct: 14 },
  { region: 'Western Visayas', count: 198, pct: 8 },
  { region: 'Davao Region', count: 167, pct: 6 },
  { region: 'Others', count: 576, pct: 22 },
]

const ALERT_TREND = [45, 52, 48, 61, 55, 72, 68, 78, 85, 92, 88, 95, 89, 102, 98, 110, 105, 118, 112, 125, 120, 132, 128, 140]

/* ─── Component ─── */
export default function ThreatDashboard() {
  const [showReport, setShowReport] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeCategory, setActiveCategory] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const totalThreats = THREAT_CATEGORIES.reduce((a, c) => a + c.count, 0)
  const activeIncidents = RECENT_INCIDENTS.filter(i => i.status === 'active').length

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">

      {/* ─── TOP BAR ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)' }}>
            <FiShield size={24} style={{ color: '#58a6ff' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold title-cyber" style={{ color: '#c9d1d9', letterSpacing: '2px' }}>
              TMCS — THREAT MONITORING CENTER
            </h1>
            <p className="text-xs" style={{ color: '#8b949e' }}>Philippine Cyber Threat Intelligence Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
            <FiClock size={14} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{currentTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
          </div>
          <button onClick={() => setShowReport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: 'linear-gradient(135deg, #bd2426, #8b0000)', color: '#fff', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(189,36,38,0.3)' }}>
            <FiAlertTriangle size={14} />
            REPORT INCIDENT
          </button>
          <button className="p-2 rounded-lg" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
            <FiRefreshCw size={16} style={{ color: '#58a6ff' }} />
          </button>
        </div>
      </div>

      {/* ─── THREAT LEVEL BAR ─── */}
      <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,166,35,0.15)', border: '2px solid #f5a623', boxShadow: '0 0 20px rgba(245,166,35,0.3)' }}>
              <span className="text-2xl font-black" style={{ color: '#f5a623', fontFamily: 'Orbitron, sans-serif' }}>3</span>
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full animate-pulse" style={{ background: '#f5a623', boxShadow: '0 0 10px #f5a623' }}></div>
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>CURRENT THREAT LEVEL</p>
            <p className="text-lg font-black" style={{ color: '#f5a623', fontFamily: 'Orbitron, sans-serif', letterSpacing: '2px' }}>ELEVATED — DEFCON 3</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(l => (
              <div key={l} className="flex flex-col items-center gap-1">
                <div className="w-16 h-3 rounded-sm" style={{
                  background: l <= 3 ? (l === 1 ? '#bd2426' : l === 2 ? '#f5a623' : '#dcd126') : '#30363d',
                  opacity: l <= 3 ? 1 : 0.3,
                  boxShadow: l === 3 ? '0 0 8px rgba(245,166,35,0.5)' : 'none',
                }}></div>
                <span className="text-[9px]" style={{ color: '#8b949e' }}>DEFCON {l}</span>
              </div>
            ))}
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: '#8b949e' }}>Last Updated</p>
            <p className="text-xs font-bold" style={{ color: '#58a6ff' }}>Just Now</p>
          </div>
        </div>
      </div>

      {/* ─── STATS ROW ─── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'TOTAL THREATS TODAY', value: totalThreats.toLocaleString(), icon: <FiAlertTriangle />, color: '#bd2426', bg: 'rgba(189,36,38,0.1)' },
          { label: 'ACTIVE INCIDENTS', value: activeIncidents, icon: <FiActivity />, color: '#f5a623', bg: 'rgba(245,166,35,0.1)' },
          { label: 'BLOCKED THREATS', value: '3,421', icon: <FiShield />, color: '#3fb950', bg: 'rgba(63,185,80,0.1)' },
          { label: 'SYSTEMS ONLINE', value: '5/6', icon: <FiServer />, color: '#58a6ff', bg: 'rgba(88,166,255,0.1)' },
          { label: 'REPORTS FILED', value: '1,247', icon: <FiEye />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        ].map((stat, i) => (
          <div key={i} className="rounded-lg p-4 transition-all hover:scale-[1.02]" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg" style={{ background: stat.bg }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
              <FiTrendingUp size={14} style={{ color: '#3fb950' }} />
            </div>
            <p className="text-2xl font-black mb-1" style={{ color: stat.color, fontFamily: 'Orbitron, sans-serif' }}>{stat.value}</p>
            <p className="text-[10px] font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ─── MAIN 2-COL LAYOUT ─── */}
      <div className="grid grid-cols-3 gap-5">

        {/* LEFT COL (2/3) */}
        <div className="col-span-2 space-y-5">

          {/* THREAT EVOLUTION + SEVERITY */}
          <div className="grid grid-cols-3 gap-5">

            {/* Alert Trend */}
            <div className="col-span-2 rounded-lg p-5" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>THREAT EVOLUTION — 24H</p>
                  <p className="text-2xl font-black mt-1" style={{ color: '#c9d1d9', fontFamily: 'Orbitron, sans-serif' }}>
                    {totalThreats.toLocaleString()} <span className="text-sm font-normal" style={{ color: '#3fb950' }}>▲ 12.3%</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded text-[10px] font-bold" style={{ background: '#58a6ff20', color: '#58a6ff', border: '1px solid #58a6ff40' }}>24H</button>
                  <button className="px-3 py-1 rounded text-[10px]" style={{ color: '#8b949e' }}>7D</button>
                  <button className="px-3 py-1 rounded text-[10px]" style={{ color: '#8b949e' }}>30D</button>
                </div>
              </div>
              {/* CSS Bar Chart */}
              <div className="flex items-end gap-1 h-32">
                {ALERT_TREND.map((val, i) => (
                  <div key={i} className="flex-1 rounded-t-sm transition-all hover:opacity-80" style={{
                    height: `${(val / 150) * 100}%`,
                    background: val > 120 ? '#bd2426' : val > 90 ? '#f5a623' : val > 60 ? '#dcd126' : '#50c8e8',
                    minHeight: '4px',
                  }}></div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px]" style={{ color: '#8b949e' }}>00:00</span>
                <span className="text-[9px]" style={{ color: '#8b949e' }}>06:00</span>
                <span className="text-[9px]" style={{ color: '#8b949e' }}>12:00</span>
                <span className="text-[9px]" style={{ color: '#8b949e' }}>18:00</span>
                <span className="text-[9px]" style={{ color: '#8b949e' }}>NOW</span>
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="rounded-lg p-5" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
              <p className="text-xs font-bold mb-4" style={{ color: '#8b949e', letterSpacing: '1px' }}>SEVERITY</p>
              <div className="space-y-3">
                {SEVERITY_DATA.map((sev, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: sev.color, boxShadow: `0 0 6px ${sev.color}50` }}></div>
                        <span className="text-[10px] font-bold" style={{ color: sev.color }}>{sev.level}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: '#c9d1d9' }}>{sev.count}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: '#0d1117' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${sev.pct}%`, background: sev.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid #30363d' }}>
                <p className="text-center text-xl font-black" style={{ color: '#c9d1d9', fontFamily: 'Orbitron, sans-serif' }}>791</p>
                <p className="text-center text-[10px]" style={{ color: '#8b949e' }}>TOTAL ALERTS</p>
              </div>
            </div>
          </div>

          {/* CRIME CATEGORIES */}
          <div className="rounded-lg p-5" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>THREAT CATEGORIES</p>
              <FiFilter size={14} style={{ color: '#8b949e' }} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {THREAT_CATEGORIES.map((cat) => (
                <div key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className="p-4 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
                  style={{
                    background: activeCategory === cat.id ? `${cat.color}12` : '#0d1117',
                    border: `1px solid ${activeCategory === cat.id ? cat.color : '#30363d'}`,
                    boxShadow: activeCategory === cat.id ? `0 0 15px ${cat.color}20` : 'none',
                  }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg" style={{ background: `${cat.color}15` }}>
                      <span style={{ color: cat.color }}>{cat.icon}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {cat.trend === 'up' ? (
                        <FiArrowUp size={12} style={{ color: '#ef4444' }} />
                      ) : (
                        <FiArrowDown size={12} style={{ color: '#3fb950' }} />
                      )}
                      <span className="text-[10px] font-bold" style={{ color: cat.trend === 'up' ? '#ef4444' : '#3fb950' }}>
                        {cat.trendVal}
                      </span>
                    </div>
                  </div>
                  <p className="text-xl font-black mb-1" style={{ color: cat.color, fontFamily: 'Orbitron, sans-serif' }}>
                    {cat.count}
                  </p>
                  <p className="text-[10px] font-bold mb-1" style={{ color: '#c9d1d9', letterSpacing: '0.5px' }}>
                    {cat.label}
                  </p>
                  <p className="text-[9px]" style={{ color: '#8b949e' }}>{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT INCIDENTS TABLE */}
          <div className="rounded-lg" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
            <div className="flex items-center justify-between p-5 pb-3">
              <p className="text-xs font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>RECENT INCIDENTS</p>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8b949e' }} />
                  <input placeholder="Search incidents..." className="pl-8 pr-3 py-1.5 rounded-lg text-xs w-48"
                    style={{ background: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }} />
                </div>
                <button className="p-1.5 rounded-lg" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                  <FiDownload size={14} style={{ color: '#8b949e' }} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#0d1117' }}>
                    <th className="text-left p-3 font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>ID</th>
                    <th className="text-left p-3 font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>SEVERITY</th>
                    <th className="text-left p-3 font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>CATEGORY</th>
                    <th className="text-left p-3 font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>TITLE</th>
                    <th className="text-left p-3 font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>SOURCE</th>
                    <th className="text-left p-3 font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>TIME</th>
                    <th className="text-left p-3 font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_INCIDENTS.map((inc, i) => (
                    <tr key={i} className="transition-colors hover:bg-white/[0.02]" style={{ borderTop: '1px solid #30363d' }}>
                      <td className="p-3 font-bold" style={{ color: '#58a6ff', fontFamily: 'JetBrains Mono, monospace' }}>{inc.id}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                          background: `${SEVERITY_DATA.find(s => s.level.toLowerCase() === inc.severity)?.color || '#6c757d'}15`,
                          color: SEVERITY_DATA.find(s => s.level.toLowerCase() === inc.severity)?.color || '#6c757d',
                          border: `1px solid ${SEVERITY_DATA.find(s => s.level.toLowerCase() === inc.severity)?.color || '#6c757d'}30`,
                        }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: SEVERITY_DATA.find(s => s.level.toLowerCase() === inc.severity)?.color }}></div>
                          {inc.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-bold" style={{ color: '#c9d1d9' }}>{inc.category}</td>
                      <td className="p-3 max-w-xs truncate" style={{ color: '#8b949e' }}>{inc.title}</td>
                      <td className="p-3" style={{ color: '#8b949e' }}>{inc.source}</td>
                      <td className="p-3" style={{ color: '#8b949e' }}>{inc.time}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold" style={{
                          background: inc.status === 'active' ? '#bd242620' : inc.status === 'investigating' ? '#f5a62320' : inc.status === 'mitigated' ? '#58a6ff20' : '#3fb95020',
                          color: inc.status === 'active' ? '#bd2426' : inc.status === 'investigating' ? '#f5a623' : inc.status === 'mitigated' ? '#58a6ff' : '#3fb950',
                        }}>
                          {inc.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COL (1/3) */}
        <div className="space-y-5">

          {/* SYSTEM STATUS */}
          <div className="rounded-lg p-5" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>SYSTEM STATUS</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#3fb95020', color: '#3fb950', border: '1px solid #3fb95040' }}>
                5/6 ONLINE
              </span>
            </div>
            <div className="space-y-3">
              {SYSTEMS.map((sys, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{
                    background: sys.status === 'online' ? '#3fb950' : sys.status === 'warning' ? '#d29922' : '#f85149',
                    boxShadow: `0 0 8px ${sys.status === 'online' ? '#3fb95050' : sys.status === 'warning' ? '#d2992250' : '#f8514950'}`,
                    animation: sys.status === 'online' ? 'statusPulse 2s infinite' : 'none',
                  }}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate" style={{ color: '#c9d1d9' }}>{sys.name}</p>
                    <p className="text-[9px]" style={{ color: '#8b949e' }}>Uptime: {sys.uptime}</p>
                  </div>
                  <span className="text-[9px]" style={{ color: '#58a6ff' }}>{sys.lastSync}</span>
                </div>
              ))}
            </div>
          </div>

          {/* GEO ORIGINS */}
          <div className="rounded-lg p-5" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
            <p className="text-xs font-bold mb-4" style={{ color: '#8b949e', letterSpacing: '1px' }}>THREAT ORIGINS — PH REGIONS</p>
            <div className="space-y-3">
              {GEO_THREATS.map((geo, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold" style={{ color: '#c9d1d9' }}>{geo.region}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: '#8b949e' }}>{geo.count}</span>
                      <span className="text-[10px] font-bold" style={{ color: '#58a6ff' }}>{geo.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: '#0d1117' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${geo.pct}%`, background: `linear-gradient(90deg, #58a6ff, #58a6ff80)` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LIVE THREAT FEED */}
          <div className="rounded-lg p-5" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold" style={{ color: '#8b949e', letterSpacing: '1px' }}>LIVE THREAT FEED</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#bd2426', boxShadow: '0 0 8px #bd242650' }}></div>
                <span className="text-[10px] font-bold" style={{ color: '#bd2426' }}>LIVE</span>
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#30363d transparent' }}>
              {[
                { time: '14:32:07', msg: 'New phishing domain registered: bdo-login[.]ph', sev: 'high' },
                { time: '14:31:52', msg: 'Telegram channel flagged for violent extremism content', sev: 'critical' },
                { time: '14:31:28', msg: 'Bot network detected spreading disinformation on Twitter/X', sev: 'medium' },
                { time: '14:30:45', msg: 'Illegal gambling site "LuckyBetPH" — new mirror detected', sev: 'medium' },
                { time: '14:30:12', msg: 'OSAEC material reported on TikTok — auto-flagged', sev: 'critical' },
                { time: '14:29:58', msg: 'DDoS attempt on PhilHealth portal mitigated', sev: 'low' },
                { time: '14:29:30', msg: 'Dark web listing: Stored PH National IDs for sale', sev: 'high' },
                { time: '14:28:45', msg: 'New malware variant targeting PH banking apps detected', sev: 'critical' },
                { time: '14:28:10', msg: 'Government email account compromised — reset initiated', sev: 'high' },
                { time: '14:27:33', msg: 'Fake DOLE job scam campaign spreading via Messenger', sev: 'medium' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: '#0d1117' }}>
                  <span className="text-[9px] font-bold mt-0.5 whitespace-nowrap" style={{ color: '#8b949e', fontFamily: 'JetBrains Mono, monospace' }}>
                    {item.time}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{
                    background: item.sev === 'critical' ? '#bd2426' : item.sev === 'high' ? '#f5a623' : item.sev === 'medium' ? '#dcd126' : '#50c8e8',
                  }}></div>
                  <span className="text-[10px]" style={{ color: '#c9d1d9' }}>{item.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="rounded-lg p-5" style={{ background: '#1c2333', border: '1px solid #30363d' }}>
            <p className="text-xs font-bold mb-3" style={{ color: '#8b949e', letterSpacing: '1px' }}>QUICK ACTIONS</p>
            <div className="space-y-2">
              {[
                { label: 'Export Incident Report', icon: <FiDownload size={14} />, color: '#58a6ff' },
                { label: 'Print Dashboard', icon: <FiPrinter size={14} />, color: '#8b949e' },
                { label: 'Fullscreen Mode', icon: <FiMaximize2 size={14} />, color: '#8b949e' },
              ].map((action, i) => (
                <button key={i} className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:bg-white/[0.03]"
                  style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                  <span style={{ color: action.color }}>{action.icon}</span>
                  <span className="text-[11px] font-bold" style={{ color: '#c9d1d9' }}>{action.label}</span>
                  <FiChevronRight size={12} className="ml-auto" style={{ color: '#8b949e' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div className="text-center py-4">
        <div className="h-px mb-3" style={{ background: 'linear-gradient(90deg, transparent, #30363d, transparent)' }}></div>
        <p className="text-[10px]" style={{ color: '#8b949e', fontFamily: 'JetBrains Mono, monospace' }}>
          TMCS v1.0 — Threat Monitoring Center System | Clark Fajardo | Philippine Cyber Intelligence Platform
        </p>
      </div>

      {/* REPORT MODAL */}
      {showReport && <ReportModal onClose={() => setShowReport(false)} onSubmit={(data) => console.log('Report:', data)} />}
    </div>
  )
}
