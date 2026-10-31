import { useState, useEffect, useCallback } from 'react'
import { apiUrl, apiHeaders } from '../services/http'
import {
  FiBell, FiAlertTriangle, FiSearch, FiFilter, FiRefreshCw, FiDownload,
  FiEye, FiTrash2, FiEdit, FiPlus, FiLoader, FiX, FiCheck, FiClock,
  FiTarget, FiShield, FiGlobe, FiServer, FiDatabase, FiActivity,
  FiArrowLeft, FiArrowRight, FiChevronLeft, FiChevronRight,
  FiInfo, FiExternalLink, FiCopy, FiTag, FiStar, FiZap
} from 'react-icons/fi'

const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-600/30 text-red-400 border-red-500/30',
  HIGH: 'bg-orange-600/30 text-orange-400 border-orange-500/30',
  MEDIUM: 'bg-yellow-600/30 text-yellow-400 border-yellow-500/30',
  LOW: 'bg-blue-600/30 text-blue-400 border-blue-500/30',
  INFO: 'bg-slate-600/30 text-slate-400 border-slate-500/30',
}

const SEVERITY_ORDER = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 }

const TYPE_LABELS = {
  news: '📰 NEWS',
  darkweb: '🌐 DARKWEB',
  urlhaus: '🔗 URLHAUS',
  forum: '💬 FORUM',
  social: '📱 SOCIAL',
  manual: '✏️ MANUAL',
}

const TYPE_COLORS = {
  news: 'text-cyan-400 bg-cyan-900/30 border-cyan-500/30',
  darkweb: 'text-purple-400 bg-purple-900/30 border-purple-500/30',
  urlhaus: 'text-red-400 bg-red-900/30 border-red-500/30',
  forum: 'text-pink-400 bg-pink-900/30 border-pink-500/30',
  social: 'text-green-400 bg-green-900/30 border-green-500/30',
  manual: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30',
}

const BREACH_API = apiUrl('/breach-alerts')

function BreachAlertsDashboard() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [targets, setTargets] = useState(null)
  const [filters, setFilters] = useState({
    severity: '',
    target: '',
    source: '',
    type: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    target: '',
    severity: 'HIGH',
    source: '',
    description: '',
    link: '',
    type: 'news',
    tags: '',
  })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastScan, setLastScan] = useState(null)

  const playAlertSound = (severity) => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const freqs = severity === 'CRITICAL' 
        ? [600, 900, 600, 900, 600, 1200]
        : severity === 'HIGH'
        ? [880, 1100, 880]
        : [660, 880]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = severity === 'CRITICAL' ? 'square' : 'sine'
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.09)
        osc.start(ctx.currentTime + i * 0.1)
        osc.stop(ctx.currentTime + i * 0.1 + 0.1)
      })
    } catch {}
  }

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      })
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.target) params.append('target', filters.target)
      if (filters.source) params.append('source', filters.source)
      
      const res = await fetch(`${BREACH_API}/?${params}`, { headers: apiHeaders() })
      const data = await res.json()
      setAlerts(data.alerts || [])
      setPagination(p => ({ ...p, total: data.total || 0 }))
      
      // Play sound for new CRITICAL alerts
      const criticalAlerts = (data.alerts || []).filter(a => a.severity === 'CRITICAL')
      if (criticalAlerts.length > 0) {
        playAlertSound('CRITICAL')
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, filters.severity, filters.target, filters.source])

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BREACH_API}/stats`, { headers: apiHeaders() })
      const data = await res.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const fetchTargets = async () => {
    try {
      const res = await fetch(`${BREACH_API}/targets`, { headers: apiHeaders() })
      const data = await res.json()
      setTargets(data)
    } catch (err) {
      console.error('Failed to fetch targets:', err)
    }
  }

  const triggerScan = async () => {
    try {
      const res = await fetch(`${BREACH_API}/scan`, { method: 'POST', headers: apiHeaders() })
      const data = await res.json()
      setLastScan(data)
      // Poll for completion
      pollScanResults()
    } catch (err) {
      console.error('Scan failed:', err)
    }
  }

  const pollScanResults = async () => {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000))
      await fetchAlerts()
      await fetchStats()
    }
  }

  const createAlert = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload = {
        ...createForm,
        tags: createForm.tags.split(',').map(t => t.trim()).filter(t => t),
      }
      const res = await fetch(`${BREACH_API}/`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setCreateForm({
          title: '', target: '', severity: 'HIGH', source: '',
          description: '', link: '', type: 'news', tags: ''
        })
        await fetchAlerts()
        await fetchStats()
      }
    } catch (err) {
      console.error('Create failed:', err)
    } finally {
      setCreating(false)
    }
  }

  const deleteAlert = async (alertId) => {
    if (!confirm('Delete this alert?')) return
    try {
      await fetch(`${BREACH_API}/${alertId}`, { method: 'DELETE', headers: apiHeaders() })
      await fetchAlerts()
      await fetchStats()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const acknowledgeAlert = async (alertId) => {
    try {
      // Would need PATCH endpoint - for now just refresh
      await fetchAlerts()
    } catch (err) {
      console.error('Acknowledge failed:', err)
    }
  }

  const exportAlerts = async () => {
    try {
      const res = await fetch(`${BREACH_API}/?limit=10000`, { headers: apiHeaders() })
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ph-breach-alerts-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (filters.type && a.type !== filters.type) return false
    if (filters.search) {
      const search = filters.search.toLowerCase()
      const text = `${a.title} ${a.target} ${a.source} ${a.description}`.toLowerCase()
      if (!text.includes(search)) return false
    }
    if (filters.dateFrom && a.created < filters.dateFrom) return false
    if (filters.dateTo && a.created > filters.dateTo) return false
    return true
  }).sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || 
    new Date(b.created) - new Date(a.created))

  useEffect(() => {
    fetchAlerts()
    fetchStats()
    fetchTargets()
  }, [fetchAlerts, fetchStats, fetchTargets])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchAlerts()
      fetchStats()
    }, 60000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchAlerts, fetchStats])

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/30 rounded-lg">
            <FiBell className="text-red-400 text-xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">PH BREACH ALERTS</h1>
            <p className="text-xs text-slate-500 font-mono">Philippines Data Breach Monitoring Center</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={triggerScan} disabled={loading}
            className="btn-cyber px-4 py-2 text-sm flex items-center gap-2">
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            SCAN NOW
          </button>
          
          <button onClick={exportAlerts}
            className="px-3 py-2 text-sm border border-slate-600 rounded hover:bg-slate-800/50 flex items-center gap-2">
            <FiDownload /> EXPORT
          </button>
          
          <button onClick={() => setShowCreateModal(true)}
            className="px-3 py-2 text-sm bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded hover:bg-blue-600/50 flex items-center gap-2">
            <FiPlus /> ADD
          </button>
          
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)}
              className="accent-red-500" />
            <FiActivity /> SOUND
          </label>
          
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
              className="accent-green-500" />
            <FiLoader /> AUTO
          </label>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <StatCard label="TOTAL" value={stats.total} icon={<FiBell />} color="text-blue-400" />
          <StatCard label="CRITICAL" value={stats.by_severity?.CRITICAL || 0} icon={<FiAlertTriangle />} color="text-red-400" />
          <StatCard label="HIGH" value={stats.by_severity?.HIGH || 0} icon={<FiZap />} color="text-orange-400" />
          <StatCard label="MEDIUM" value={stats.by_severity?.MEDIUM || 0} icon={<FiInfo />} color="text-yellow-400" />
          <StatCard label="LOW" value={stats.by_severity?.LOW || 0} icon={<FiShield />} color="text-blue-400" />
          <StatCard label="INFO" value={stats.by_severity?.INFO || 0} icon={<FiClock />} color="text-slate-400" />
          <StatCard label="TARGETS" value={stats.tracked_targets} icon={<FiTarget />} color="text-purple-400" />
        </div>
      )}

      {/* Filters */}
      <div className="card-cyber p-4 rounded-xl mb-6">
        <div className="flex flex-wrap gap-3 mb-3">
          <select value={filters.severity} onChange={e => { setFilters(f => ({...f, severity: e.target.value})); setPagination(p => ({...p, page: 1})) }}
            className="px-3 py-2 bg-slate-800/50 border border-slate-600 rounded text-sm">
            <option value="">ALL SEVERITY</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
            <option value="INFO">INFO</option>
          </select>
          
          <select value={filters.type} onChange={e => { setFilters(f => ({...f, type: e.target.value})); setPagination(p => ({...p, page: 1})) }}
            className="px-3 py-2 bg-slate-800/50 border border-slate-600 rounded text-sm">
            <option value="">ALL TYPES</option>
            <option value="news">NEWS</option>
            <option value="darkweb">DARKWEB</option>
            <option value="urlhaus">URLHAUS</option>
            <option value="forum">FORUM</option>
            <option value="social">SOCIAL</option>
            <option value="manual">MANUAL</option>
          </select>
          
          <input type="text" placeholder="Search..." value={filters.search} onChange={e => { setFilters(f => ({...f, search: e.target.value})); setPagination(p => ({...p, page: 1})) }}
            className="flex-1 min-w-[200px] px-3 py-2 bg-slate-800/50 border border-slate-600 rounded text-sm" />
          
          <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({...f, dateFrom: e.target.value}))}
            className="px-3 py-2 bg-slate-800/50 border border-slate-600 rounded text-sm" />
          <span className="text-slate-500 self-center">to</span>
          <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({...f, dateTo: e.target.value}))}
            className="px-3 py-2 bg-slate-800/50 border border-slate-600 rounded text-sm" />
        </div>
        
        {targets && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(targets.categories || {}).flatMap(([cat, targs]) => 
              targs.slice(0, 3).map(t => (
                <button key={t} onClick={() => { setFilters(f => ({...f, target: f.target === t ? '' : t})); setPagination(p => ({...p, page: 1})) }}
                  className={`px-2 py-1 text-xs rounded border ${filters.target === t 
                    ? 'bg-blue-600/30 text-blue-400 border-blue-500' 
                    : 'bg-slate-800/50 text-slate-400 border-slate-600 hover:border-blue-500'}`}>
                  {t}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Alerts Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-500 font-mono text-xs uppercase">
                <th className="p-3 text-left">SEVERITY</th>
                <th className="p-3 text-left">TYPE</th>
                <th className="p-3 text-left">TITLE</th>
                <th className="p-3 text-left">TARGET</th>
                <th className="p-3 text-left">SOURCE</th>
                <th className="p-3 text-left">DATE</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <FiBell className="mx-auto mb-2 text-4xl opacity-30" />
                    <p>No alerts match your filters</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert, idx) => (
                  <tr key={alert.alert_id || idx} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold font-mono ${SEVERITY_COLORS[alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-mono ${TYPE_COLORS[alert.type] || TYPE_COLORS.manual}`}>
                        {TYPE_LABELS[alert.type] || alert.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-white max-w-md truncate block" title={alert.title}>
                      {alert.title}
                    </td>
                    <td className="p-3 text-blue-400 font-mono text-xs">{alert.target}</td>
                    <td className="p-3 text-slate-400 text-xs truncate max-w-xs block">{alert.source}</td>
                    <td className="p-3 text-slate-500 font-mono text-xs">
                      {new Date(alert.created).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); setSelectedAlert(alert) }}
                          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-blue-400" title="View">
                          <FiEye size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); acknowledgeAlert(alert.alert_id) }}
                          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-green-400" title="Acknowledge">
                          <FiCheck size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteAlert(alert.alert_id) }}
                          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400" title="Delete">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <FiLoader className="mx-auto animate-spin text-blue-400 text-2xl" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-700">
            <div className="text-sm text-slate-500">
              Page {pagination.page} of {totalPages} • {pagination.total} total
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPagination(p => ({...p, page: 1}))} disabled={pagination.page === 1}
                className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-800 disabled:opacity-50">
                <FiChevronLeft size={12} /> <FiChevronLeft size={12} />
              </button>
              <button onClick={() => setPagination(p => ({...p, page: p.page - 1}))} disabled={pagination.page === 1}
                className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-800 disabled:opacity-50">
                <FiChevronLeft size={12} />
              </button>
              <button onClick={() => setPagination(p => ({...p, page: p.page + 1}))} disabled={pagination.page === totalPages}
                className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-800 disabled:opacity-50">
                <FiChevronRight size={12} />
              </button>
              <button onClick={() => setPagination(p => ({...p, page: totalPages}))} disabled={pagination.page === totalPages}
                className="px-2 py-1 text-xs border border-slate-600 rounded hover:bg-slate-800 disabled:opacity-50">
                <FiChevronRight size={12} /> <FiChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAlert && showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-white">ALERT DETAILS</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
                <FiX size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded text-sm font-bold font-mono ${SEVERITY_COLORS[selectedAlert.severity]}`}>
                  {selectedAlert.severity}
                </span>
                <span className={`px-3 py-1 rounded text-xs font-mono ${TYPE_COLORS[selectedAlert.type] || TYPE_COLORS.manual}`}>
                  {TYPE_LABELS[selectedAlert.type] || selectedAlert.type.toUpperCase()}
                </span>
                {selectedAlert.acknowledged && (
                  <span className="px-3 py-1 rounded text-xs font-mono bg-green-600/30 text-green-400 border-green-500/30">
                    ACKNOWLEDGED
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500 font-mono">ALERT ID:</span> <span className="text-blue-400 font-mono ml-2">{selectedAlert.alert_id}</span></div>
                <div><span className="text-slate-500 font-mono">TARGET:</span> <span className="text-white ml-2">{selectedAlert.target}</span></div>
                <div><span className="text-slate-500 font-mono">SOURCE:</span> <span className="text-slate-300 ml-2">{selectedAlert.source}</span></div>
                <div><span className="text-slate-500 font-mono">CREATED:</span> <span className="text-slate-300 ml-2">{new Date(selectedAlert.created).toLocaleString()}</span></div>
                {selectedAlert.link && (
                  <div className="col-span-2">
                    <span className="text-slate-500 font-mono">LINK:</span>
                    <a href={selectedAlert.link} target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300 ml-2 text-xs break-all flex items-center gap-1">
                      <FiExternalLink size={12} /> {selectedAlert.link}
                    </a>
                  </div>
                )}
              </div>
              
              <div>
                <span className="text-slate-500 font-mono block mb-1">DESCRIPTION:</span>
                <p className="text-white text-sm whitespace-pre-wrap">{selectedAlert.description}</p>
              </div>
              
              {selectedAlert.tags?.length > 0 && (
                <div>
                  <span className="text-slate-500 font-mono block mb-1">TAGS:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAlert.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs font-mono">
                        <FiTag className="inline" /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                <div>
                  <span className="text-slate-500 font-mono block mb-1">METADATA:</span>
                  <pre className="bg-slate-800/50 p-3 rounded text-xs text-slate-300 overflow-auto max-h-40">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-white">CREATE BREACH ALERT</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={createAlert} className="p-4 space-y-4">
              <div>
                <label className="text-xs text-slate-500 font-mono block mb-1">TITLE *</label>
                <input type="text" required value={createForm.title} onChange={e => setCreateForm(f => ({...f, title: e.target.value}))}
                  placeholder="Brief alert title"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-mono block mb-1">TARGET *</label>
                  <input type="text" required value={createForm.target} onChange={e => setCreateForm(f => ({...f, target: e.target.value}))}
                    placeholder="e.g., DepEd, BDO, Globe"
                    className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-mono block mb-1">SEVERITY *</label>
                  <select value={createForm.severity} onChange={e => setCreateForm(f => ({...f, severity: e.target.value}))}
                    className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm">
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-mono block mb-1">SOURCE *</label>
                  <input type="text" required value={createForm.source} onChange={e => setCreateForm(f => ({...f, source: e.target.value}))}
                    placeholder="e.g., Rappler, DICT, Ahmia.fi"
                    className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-mono block mb-1">TYPE</label>
                  <select value={createForm.type} onChange={e => setCreateForm(f => ({...f, type: e.target.value}))}
                    className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm">
                    <option value="news">NEWS</option>
                    <option value="darkweb">DARKWEB</option>
                    <option value="urlhaus">URLHAUS</option>
                    <option value="forum">FORUM</option>
                    <option value="social">SOCIAL</option>
                    <option value="manual">MANUAL</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-slate-500 font-mono block mb-1">DESCRIPTION *</label>
                <textarea required value={createForm.description} onChange={e => setCreateForm(f => ({...f, description: e.target.value}))}
                  rows={3} placeholder="Detailed description of the breach..."
                  className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm" />
              </div>
              
              <div>
                <label className="text-xs text-slate-500 font-mono block mb-1">LINK (optional)</label>
                <input type="url" value={createForm.link} onChange={e => setCreateForm(f => ({...f, link: e.target.value}))}
                  placeholder="https://..."
                  className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm" />
              </div>
              
              <div>
                <label className="text-xs text-slate-500 font-mono block mb-1">TAGS (comma separated)</label>
                <input type="text" value={createForm.tags} onChange={e => setCreateForm(f => ({...f, tags: e.target.value}))}
                  placeholder="data-breach, philippines, ransomware"
                  className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-2 text-sm" />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-600 rounded text-sm hover:bg-slate-800">
                  CANCEL
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-sm hover:bg-blue-600/50 flex items-center justify-center gap-2">
                  {creating ? <><FiLoader className="animate-spin" /> CREATING...</> : <><FiPlus /> CREATE ALERT</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Last Scan Result Toast */}
      {lastScan && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 border border-green-500/30 rounded-lg p-4 max-w-sm animate-slide-in">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <FiCheck className="text-lg" />
            <span className="font-bold">SCAN COMPLETE</span>
          </div>
          <div className="text-sm text-slate-300 space-y-1">
            <p>News: {lastScan.news_alerts || 0} | Darkweb: {lastScan.darkweb_alerts || 0} | Ransomware: {lastScan.ransomware_alerts || 0}</p>
            <p className="text-xs text-slate-500">Total new: {lastScan.total_new || 0}</p>
            {lastScan.errors?.length > 0 && (
              <p className="text-red-400 text-xs">Errors: {lastScan.errors.join(', ')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card-cyber p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-500 font-mono uppercase">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default BreachAlertsDashboard
