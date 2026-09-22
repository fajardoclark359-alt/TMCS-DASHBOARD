import { useState, useEffect } from 'react'
import {
  FiEye, FiSearch, FiShield, FiAlertTriangle, FiGlobe, FiLock,
  FiServer, FiTerminal, FiSave, FiFileText, FiClock, FiTag, FiCheck,
  FiExternalLink, FiCopy, FiActivity, FiWifi, FiDatabase
} from 'react-icons/fi'

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`

const DEFAULT_KEYWORDS = [
  '764', 'nihilistic extremism', 'accelerationism', 'O9A', 'Order of Nine Angles',
  'eco-fascism', 'siege culture', 'chan terrorism', 'doxing', 'swatting',
  'bioweapon', 'chemical weapon', 'mass shooting', 'radicalization',
  'kill list', 'target list', 'operational security', 'anarchism',
  'violent ideology', 'lone wolf'
]

const SOURCE_COLORS = {
  'AlienVault OTX': 'text-orange-400 bg-orange-900/30 border-orange-500/30',
  'URLhaus': 'text-red-400 bg-red-900/30 border-red-500/30',
  'BleepingComputer': 'text-blue-400 bg-blue-900/30 border-blue-500/30',
  'Ahmia.fi': 'text-purple-400 bg-purple-900/30 border-purple-500/30',
  'DarkOwl': 'text-cyan-400 bg-cyan-900/30 border-cyan-500/30',
  'IntelX': 'text-green-400 bg-green-900/30 border-green-500/30',
  'DarkTrace': 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30',
  'VirusTotal': 'text-pink-400 bg-pink-900/30 border-pink-500/30',
}

const SEVERITY_COLORS = {
  HIGH: 'bg-red-600/30 text-red-400 border border-red-500/30',
  CRITICAL: 'bg-red-700/40 text-red-300 border border-red-400/40',
  MEDIUM: 'bg-yellow-600/30 text-yellow-400 border border-yellow-500/30',
  LOW: 'bg-blue-600/30 text-blue-400 border border-blue-500/30',
}

function DarkWebMonitor() {
  // ── Search & query state ──
  const [darkWebQuery, setDarkWebQuery] = useState('')
  const [activeTab, setActiveTab] = useState('feeds')
  const [loading, setLoading] = useState(false)
  const [clientMode, setClientMode] = useState(false)

  // ── Feed state ──
  const [feeds, setFeeds] = useState([])
  const [feedsLoading, setFeedsLoading] = useState(false)
  const [feedsError, setFeedsError] = useState('')

  // ── Keyword state ──
  const [keywords, setKeywords] = useState([])
  const [keywordsLoading, setKeywordsLoading] = useState(false)
  const [keywordsError, setKeywordsError] = useState('')
  const [expandedKeyword, setExpandedKeyword] = useState(null)
  const [keywordArticles, setKeywordArticles] = useState({})

  // ── Dark web search state ──
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  // ── IOC state ──
  const [iocs, setIocs] = useState(null)
  const [iocLoading, setIocLoading] = useState(false)
  const [iocError, setIocError] = useState('')
  const [iocQuery, setIocQuery] = useState('')
  const [copiedIoc, setCopiedIoc] = useState(null)

  // ── Alert state ──
  const [alerts, setAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState('')

  // ── Trends state ──
  const [trends, setTrends] = useState(null)
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [trendsError, setTrendsError] = useState('')

  // ── Evidence state ──
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [priority, setPriority] = useState('high')
  const [caseId, setCaseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ═══════════════════════════════════════════════════════════════
  // CLIENT-SIDE FALLBACKS
  // ═══════════════════════════════════════════════════════════════

  const clientFetchFeeds = async () => {
    const results = []

    // AlienVault OTX — public pulses (no auth needed)
    try {
      const resp = await fetch('https://otx.alienvault.com/otxapi/pulses?limit=15&sort=-created', { mode: 'cors' })
      if (resp.ok) {
        const data = await resp.json()
        for (const p of (data.results || []).slice(0, 15)) {
          results.push({
            title: p.name || 'OTX Pulse',
            source: 'AlienVault OTX',
            description: (p.description || p.summary || 'No description').slice(0, 300),
            published: p.created || p.modified || new Date().toISOString(),
            tags: p.tags || [],
            link: `https://otx.alienvault.com/pulse/${p.id}`,
          })
        }
      }
    } catch (e) {
      console.warn('AlienVault OTX fetch failed:', e.message)
    }

    // URLhaus recent URLs
    try {
      const resp = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' })
      if (resp.ok) {
        const data = await resp.json()
        for (const entry of (data.urls || []).slice(0, 15)) {
          results.push({
            title: `URLhaus: ${entry.url_status || 'unknown'} — ${(entry.url || '').slice(0, 80)}`,
            source: 'URLhaus',
            description: `Threat: ${entry.threat || 'unknown'} | Tags: ${(entry.tags || []).join(', ') || 'none'}`,
            published: entry.dateadded || new Date().toISOString(),
            tags: entry.tags || [],
            link: entry.url,
          })
        }
      }
    } catch (e) {
      console.warn('URLhaus fetch failed:', e.message)
    }

    // BleepingComputer RSS
    try {
      const resp = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.bleepingcomputer.com/feed/', { mode: 'cors' })
      if (resp.ok) {
        const data = await resp.json()
        for (const item of (data.items || []).slice(0, 10)) {
          results.push({
            title: item.title,
            source: 'BleepingComputer',
            description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
            published: item.pubDate || new Date().toISOString(),
            tags: item.categories || [],
            link: item.link,
          })
        }
      }
    } catch (e) {
      console.warn('BleepingComputer RSS failed:', e.message)
    }

    // The Hacker News RSS
    try {
      const resp = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/TheHackersNews', { mode: 'cors' })
      if (resp.ok) {
        const data = await resp.json()
        for (const item of (data.items || []).slice(0, 10)) {
          results.push({
            title: item.title,
            source: 'The Hacker News',
            description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
            published: item.pubDate || new Date().toISOString(),
            tags: item.categories || [],
            link: item.link,
          })
        }
      }
    } catch (e) {
      console.warn('The Hacker News RSS failed:', e.message)
    }

    // Ahmia.fi ping check
    try {
      const resp = await fetch('https://ahmia.fi/api/v1/ping', { mode: 'cors' })
      if (resp.ok) {
        results.push({
          title: 'Ahmia.fi — Dark Web Search Engine Online',
          source: 'Ahmia.fi',
          description: 'Ahmia.fi search engine is accessible. Use the Dark Web Search tab to query .onion sites.',
          published: new Date().toISOString(),
          tags: ['darkweb', 'onion'],
          link: 'https://ahmia.fi',
        })
      }
    } catch (e) {
      console.warn('Ahmia.fi ping failed:', e.message)
    }

    return results
  }

  const clientSearchDarkWeb = async (query) => {
    const results = []
    
    // Try Ahmia.fi search (legal dark web search engine)
    try {
      const resp = await fetch(`https://ahmia.fi/api/v1/search/?q=${encodeURIComponent(query)}`, { mode: 'cors' })
      if (resp.ok) {
        const data = await resp.json()
        const items = data.items || data.results || []
        for (const item of items.slice(0, 15)) {
          results.push({
            title: item.title || item.name || 'Untitled',
            onion_url: item.onion_url || item.url || '',
            description: (item.description || item.snippet || '').slice(0, 300),
            reliability: item.reliability_score || item.score || null,
            source: 'Ahmia.fi',
          })
        }
      }
    } catch (e) {
      console.warn('Ahmia.fi search failed:', e.message)
    }

    // Also search BleepingComputer for the keyword
    try {
      const resp = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://www.bleepingcomputer.com/feed/&q=${encodeURIComponent(query)}`, { mode: 'cors' })
      if (resp.ok) {
        const data = await resp.json()
        for (const item of (data.items || []).slice(0, 5)) {
          const text = `${item.title} ${item.description || ''}`.toLowerCase()
          if (text.includes(query.toLowerCase())) {
            results.push({
              title: item.title,
              onion_url: item.link,
              description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
              reliability: null,
              source: 'BleepingComputer',
            })
          }
        }
      }
    } catch (e) {
      console.warn('BleepingComputer search failed:', e.message)
    }

    // Search URLhaus for malicious URLs matching query
    try {
      const resp = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' })
      if (resp.ok) {
        const data = await resp.json()
        for (const entry of (data.urls || []).slice(0, 50)) {
          const tags = (entry.tags || []).join(' ').toLowerCase()
          const url = (entry.url || '').toLowerCase()
          if (tags.includes(query.toLowerCase()) || url.includes(query.toLowerCase())) {
            results.push({
              title: `URLhaus: ${entry.url_status || 'malicious'}`,
              onion_url: entry.url,
              description: `Threat: ${entry.threat || 'unknown'} | Tags: ${(entry.tags || []).join(', ')}`,
              reliability: null,
              source: 'URLhaus',
            })
          }
        }
      }
    } catch (e) {
      console.warn('URLhaus search failed:', e.message)
    }

    return results
  }

  const clientFetchIOCs = async (query) => {
    const indicators = { ips: [], domains: [], urls: [], hashes: [] }
    try {
      // Search URLhaus for IOCs matching query
      const resp = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/?limit=50', { mode: 'cors' })
      if (resp.ok) {
        const data = await resp.json()
        const urls = data.urls || []
        for (const entry of urls) {
          const url = entry.url || ''
          const domain = entry.host || ''
          const ip = entry.hostaddr || ''
          const hash = entry.md5_hash || entry.sha256_hash || ''
          if (query && !url.toLowerCase().includes(query.toLowerCase()) && !domain.toLowerCase().includes(query.toLowerCase())) continue
          if (ip && /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(ip)) indicators.ips.push({ value: ip, source: 'URLhaus', tag: entry.threat || 'malware' })
          if (domain) indicators.domains.push({ value: domain, source: 'URLhaus', tag: entry.threat || 'malware' })
          if (url) indicators.urls.push({ value: url, source: 'URLhaus', tag: entry.url_status || 'malicious' })
          if (hash) indicators.hashes.push({ value: hash, source: 'URLhaus', tag: entry.threat || 'malware' })
        }
      }
    } catch (e) {
      console.warn('URLhaus IOC fetch failed:', e.message)
    }
    return indicators
  }

  // ═══════════════════════════════════════════════════════════════
  // API FETCHERS
  // ═══════════════════════════════════════════════════════════════

  const fetchFeeds = async () => {
    setFeedsLoading(true)
    setFeedsError('')
    try {
      const resp = await fetch(`${API_BASE}/darkweb/feeds?limit=20`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setFeeds(data.feeds || data.items || data)
      setClientMode(false)
    } catch (err) {
      console.warn('Backend unavailable, using client-side fallback:', err.message)
      try {
        const clientFeeds = await clientFetchFeeds()
        setFeeds(clientFeeds)
        setClientMode(true)
      } catch (clientErr) {
        setFeedsError('Failed to fetch threat feeds: ' + (clientErr.message || err.message))
      }
    }
    setFeedsLoading(false)
  }

  const fetchKeywords = async () => {
    setKeywordsLoading(true)
    setKeywordsError('')
    try {
      const resp = await fetch(`${API_BASE}/darkweb/keywords`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setKeywords(data.keywords || data.items || data)
      setClientMode(false)
    } catch (err) {
      console.warn('Backend unavailable for keywords, using default list:', err.message)
      setKeywords(DEFAULT_KEYWORDS.map(k => ({ keyword: k, count: 0, articles: [] })))
      setClientMode(true)
    }
    setKeywordsLoading(false)
  }

  const searchDarkWeb = async (query) => {
    if (!query) return
    setSearchLoading(true)
    setSearchError('')
    try {
      const resp = await fetch(`${API_BASE}/darkweb/search?q=${encodeURIComponent(query)}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setSearchResults(data.results || data.items || data)
      setClientMode(false)
    } catch (err) {
      console.warn('Backend unavailable, using client-side search:', err.message)
      try {
        const clientResults = await clientSearchDarkWeb(query)
        setSearchResults(clientResults)
        setClientMode(true)
      } catch (clientErr) {
        setSearchError('Search failed: ' + (clientErr.message || err.message))
      }
    }
    setSearchLoading(false)
  }

  const fetchIOCs = async (query) => {
    setIocLoading(true)
    setIocError('')
    try {
      const resp = await fetch(`${API_BASE}/darkweb/indicators?q=${encodeURIComponent(query || '')}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setIocs(data.indicators || data)
      setClientMode(false)
    } catch (err) {
      console.warn('Backend unavailable, using client-side IOCs:', err.message)
      try {
        const clientIOCs = await clientFetchIOCs(query)
        setIocs(clientIOCs)
        setClientMode(true)
      } catch (clientErr) {
        setIocError('Failed to fetch IOCs: ' + (clientErr.message || err.message))
      }
    }
    setIocLoading(false)
  }

  const fetchAlerts = async () => {
    setAlertsLoading(true)
    setAlertsError('')
    try {
      const resp = await fetch(`${API_BASE}/darkweb/alerts?limit=10`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setAlerts(data.alerts || data.items || data)
      setClientMode(false)
    } catch (err) {
      console.warn('Backend unavailable for alerts, using client-side:', err.message)
      // Fetch real alerts from URLhaus + OTX
      const clientAlerts = []
      try {
        const resp = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' })
        if (resp.ok) {
          const data = await resp.json()
          for (const entry of (data.urls || []).slice(0, 8)) {
            clientAlerts.push({
              id: entry.id || Math.random().toString(36).slice(2),
              title: `Malicious URL: ${(entry.url || '').slice(0, 60)}`,
              description: `Status: ${entry.url_status || 'unknown'} | Threat: ${entry.threat || 'unknown'} | Tags: ${(entry.tags || []).join(', ')}`,
              severity: entry.url_status === 'online' ? 'HIGH' : 'MEDIUM',
              source: 'URLhaus',
              url: entry.url,
              created: entry.dateadded || new Date().toISOString(),
              tags: entry.tags || [],
            })
          }
        }
      } catch {}
      try {
        const resp = await fetch('https://otx.alienvault.com/otxapi/pulses?limit=5&sort=-created', { mode: 'cors' })
        if (resp.ok) {
          const data = await resp.json()
          for (const p of (data.results || []).slice(0, 5)) {
            clientAlerts.push({
              id: p.id || Math.random().toString(36).slice(2),
              title: p.name || 'OTX Threat Pulse',
              description: (p.description || '').slice(0, 200),
              severity: 'HIGH',
              source: 'AlienVault OTX',
              url: `https://otx.alienvault.com/pulse/${p.id}`,
              created: p.created || new Date().toISOString(),
              tags: p.tags || [],
            })
          }
        }
      } catch {}
      clientAlerts.sort((a, b) => (b.created || '').localeCompare(a.created || ''))
      setAlerts(clientAlerts.length > 0 ? clientAlerts : [
        { id: 1, title: 'Threat feeds loading...', severity: 'LOW', description: 'Fetching from public threat intelligence sources', source: 'System', created: new Date().toISOString() }
      ])
      setClientMode(true)
    }
    setAlertsLoading(false)
  }

  const fetchTrends = async () => {
    setTrendsLoading(true)
    setTrendsError('')
    try {
      const resp = await fetch(`${API_BASE}/darkweb/trends`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      setTrends(data)
      setClientMode(false)
    } catch (err) {
      console.warn('Backend unavailable for trends, using client-side:', err.message)
      // Build trends from RSS feeds
      const topicCounts = {}
      const sourceCounts = {}
      const topicKeywords = {
        'Ransomware': ['ransomware', 'ransom', 'encrypt'],
        'Data Breach': ['breach', 'leak', 'exposed', 'stolen'],
        'Phishing': ['phishing', 'phish', 'social engineering'],
        'Malware': ['malware', 'trojan', 'virus', 'backdoor'],
        'Zero-Day': ['zero-day', '0day', 'exploit', 'vulnerability'],
        'Extremism': ['extremism', 'terrorist', 'radical', 'violent', '764', 'nihilistic'],
        'APT': ['apt', 'nation-state', 'state-sponsored'],
        'Infrastructure': ['botnet', 'ddos', 'infrastructure'],
      }
      try {
        const feeds = [
          { name: 'BleepingComputer', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.bleepingcomputer.com/feed/' },
          { name: 'The Hacker News', url: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/TheHackersNews' },
        ]
        for (const feed of feeds) {
          try {
            const resp = await fetch(feed.url, { mode: 'cors' })
            if (resp.ok) {
              const data = await resp.json()
              for (const item of (data.items || [])) {
                const text = `${item.title} ${item.description || ''}`.toLowerCase()
                sourceCounts[feed.name] = (sourceCounts[feed.name] || 0) + 1
                for (const [topic, keywords] of Object.entries(topicKeywords)) {
                  if (keywords.some(kw => text.includes(kw))) {
                    topicCounts[topic] = (topicCounts[topic] || 0) + 1
                  }
                }
              }
            }
          } catch {}
        }
      } catch {}
      setTrends({
        topics: Object.entries(topicCounts).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count),
        sources: Object.entries(sourceCounts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
        total_articles: Object.values(sourceCounts).reduce((a, b) => a + b, 0),
        analyzed_at: new Date().toISOString(),
      })
      setClientMode(true)
    }
    setTrendsLoading(false)
  }

  // ═══════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (activeTab === 'feeds') fetchFeeds()
    if (activeTab === 'keywords') fetchKeywords()
    if (activeTab === 'iocs') fetchIOCs('')
    fetchAlerts()
    fetchTrends()
  }, [activeTab])

  // ═══════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleDarkWebSearch = (e) => {
    e.preventDefault()
    setActiveTab('search')
    searchDarkWeb(darkWebQuery)
  }

  const handleIOCSearch = (e) => {
    e.preventDefault()
    fetchIOCs(iocQuery)
  }

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedIoc(value)
      setTimeout(() => setCopiedIoc(null), 2000)
    } catch {
      alert('Copy failed')
    }
  }

  const handleKeywordExpand = async (keyword) => {
    if (expandedKeyword === keyword) {
      setExpandedKeyword(null)
      return
    }
    setExpandedKeyword(keyword)
    if (!keywordArticles[keyword]) {
      try {
        const resp = await fetch(`${API_BASE}/darkweb/keyword/${encodeURIComponent(keyword)}`)
        if (resp.ok) {
          const data = await resp.json()
          setKeywordArticles(prev => ({ ...prev, [keyword]: data.articles || data }))
        }
      } catch {
        setKeywordArticles(prev => ({ ...prev, [keyword]: [] }))
      }
    }
  }

  const handleSaveEvidence = async () => {
    setSaving(true)
    try {
      const payload = {
        page: 'darkweb_monitor',
        query: darkWebQuery || iocQuery || '',
        active_tab: activeTab,
        notes,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        priority,
        case_id: caseId,
        data_snapshot: {
          feeds_count: feeds.length,
          alerts_count: alerts.length,
          search_results: searchResults.length,
          iocs: iocs,
        },
      }
      const resp = await fetch(`${API_BASE}/darkweb/evidence/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (resp.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Evidence save failed:', err.message)
      alert('Evidence capture failed — backend may be unavailable')
    }
    setSaving(false)
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════

  const renderFeeds = () => {
    if (feedsLoading) return <p className="text-slate-500 font-mono text-sm">Loading threat feeds...</p>
    if (feedsError) return <p className="text-red-400 font-mono text-sm">! {feedsError}</p>
    if (feeds.length === 0) return <p className="text-slate-500 font-mono text-sm">No feeds available.</p>

    return (
      <div className="space-y-3">
        {feeds.map((feed, i) => {
          const colorClass = SOURCE_COLORS[feed.source] || 'text-slate-400 bg-slate-800/30 border-slate-500/30'
          return (
            <div key={i} className="card-cyber p-4 rounded-lg">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-mono text-white font-bold">{feed.title}</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border whitespace-nowrap ${colorClass}`}>
                  {feed.source}
                </span>
              </div>
              {feed.description && (
                <p className="text-xs font-mono text-slate-400 mb-2 line-clamp-3">{feed.description}</p>
              )}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <FiClock className="inline" />
                  {feed.published?.split('T')[0] || feed.published || 'Unknown date'}
                </div>
                {feed.tags && feed.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {(Array.isArray(feed.tags) ? feed.tags : []).slice(0, 5).map((tag, j) => (
                      <span key={j} className="bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded text-[9px] font-mono">
                        <FiTag className="inline mr-0.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {feed.link && (
                <a href={feed.link} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-[10px] font-mono mt-2 inline-flex items-center gap-1">
                  <FiExternalLink /> VIEW SOURCE
                </a>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderKeywords = () => {
    if (keywordsLoading) return <p className="text-slate-500 font-mono text-sm">Loading keywords...</p>
    if (keywordsError) return <p className="text-red-400 font-mono text-sm">! {keywordsError}</p>

    const keywordList = Array.isArray(keywords) ? keywords : DEFAULT_KEYWORDS.map(k => ({ keyword: k, count: 0, articles: [] }))

    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
          {keywordList.map((kw, i) => {
            const keyword = typeof kw === 'string' ? kw : kw.keyword
            const count = typeof kw === 'object' ? (kw.count || 0) : 0
            const isExpanded = expandedKeyword === keyword
            return (
              <button
                key={i}
                onClick={() => handleKeywordExpand(keyword)}
                className={`card-cyber p-3 rounded-lg text-left transition-all ${isExpanded ? 'border-blue-400/50 bg-blue-950/20' : ''}`}
              >
                <div className="text-[10px] font-mono text-slate-500 mb-1 flex items-center justify-between">
                  <span className="uppercase tracking-wider">MATCH</span>
                  <FiEye className={isExpanded ? 'text-blue-400' : 'text-slate-600'} />
                </div>
                <p className="text-xs font-mono text-white font-bold mb-1 truncate">{keyword}</p>
                <p className={`text-lg font-mono font-bold ${count > 0 ? 'text-red-400 glow-text-red' : 'text-slate-600'}`}>
                  {count}
                </p>
              </button>
            )
          })}
        </div>

        {expandedKeyword && (
          <div className="card-cyber p-4 rounded-lg">
            <h3 className="text-xs font-mono text-blue-400 font-bold mb-3">
              <FiSearch className="inline mr-1" /> ARTICLES MATCHING: "{expandedKeyword}"
            </h3>
            {keywordArticles[expandedKeyword] && keywordArticles[expandedKeyword].length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {keywordArticles[expandedKeyword].map((article, i) => (
                  <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border text-xs font-mono">
                    <p className="text-white">{article.title || article.name || 'Untitled'}</p>
                    <p className="text-slate-500 text-[10px] mt-1">
                      <FiClock className="inline mr-1" />{article.date || article.published || 'N/A'}
                    </p>
                    {article.url && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-[10px] inline-flex items-center gap-1 mt-1">
                        <FiExternalLink /> VIEW
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 font-mono text-xs">No articles found for this keyword.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderSearchResults = () => {
    if (searchLoading) return <p className="text-slate-500 font-mono text-sm">Searching dark web...</p>
    if (searchError) return <p className="text-red-400 font-mono text-sm">! {searchError}</p>
    if (searchResults.length === 0 && !searchLoading) {
      return (
        <div className="text-center py-8">
          <FiLock className="mx-auto text-4xl text-slate-600 mb-3" />
          <p className="text-slate-500 font-mono text-sm">Enter a search query to scan the dark web via Ahmia.fi</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {searchResults.map((result, i) => (
          <div key={i} className="card-cyber p-4 rounded-lg">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-sm font-mono text-white font-bold">{result.title}</h3>
              {result.reliability != null && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  result.reliability >= 70 ? 'bg-green-900/30 text-green-400 border border-green-500/30' :
                  result.reliability >= 40 ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30' :
                  'bg-red-900/30 text-red-400 border border-red-500/30'
                }`}>
                  REL: {result.reliability}
                </span>
              )}
            </div>
            {result.description && (
              <p className="text-xs font-mono text-slate-400 mb-2 line-clamp-3">{result.description}</p>
            )}
            {result.onion_url && (
              <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded cyber-border">
                <FiLock className="text-purple-400 text-xs" />
                <a
                  href={result.onion_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 text-[11px] font-mono break-all"
                >
                  {result.onion_url}
                </a>
                <FiExternalLink className="text-purple-400 text-[10px] ml-auto" />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderIOCs = () => {
    if (iocLoading) return <p className="text-slate-500 font-mono text-sm">Loading IOCs...</p>
    if (iocError) return <p className="text-red-400 font-mono text-sm">! {iocError}</p>
    if (!iocs) return null

    const sections = [
      { key: 'ips', label: 'IP ADDRESSES', icon: <FiServer className="inline" /> },
      { key: 'domains', label: 'DOMAINS', icon: <FiGlobe className="inline" /> },
      { key: 'urls', label: 'URLS', icon: <FiExternalLink className="inline" /> },
      { key: 'hashes', label: 'HASHES', icon: <FiHash /> },
    ]

    return (
      <div className="space-y-4">
        {sections.map(({ key, label, icon }) => {
          const items = iocs[key] || []
          return (
            <div key={key} className="card-cyber p-4 rounded-lg">
              <h3 className="text-xs font-mono text-blue-400 font-bold mb-3">
                {icon} {label} ({items.length})
              </h3>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {items.map((item, i) => (
                    <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono text-slate-200 break-all">{item.value || item}</p>
                        {item.source && (
                          <p className="text-[9px] font-mono text-slate-500">{item.source} · {item.tag || ''}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopy(item.value || item)}
                        className="text-slate-500 hover:text-blue-400 flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        {copiedIoc === (item.value || item) ? <FiCheck className="text-green-400 text-xs" /> : <FiCopy className="text-xs" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 font-mono text-xs">No {label.toLowerCase()} found.</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderAlerts = () => {
    if (alertsLoading) return <p className="text-slate-500 font-mono text-xs">Loading alerts...</p>
    if (alertsError) return <p className="text-red-400 font-mono text-xs">! {alertsError}</p>

    return (
      <div className="space-y-2">
        {alerts.length === 0 && (
          <p className="text-slate-600 font-mono text-xs">No alerts.</p>
        )}
        {alerts.map((alert, i) => (
          <div key={alert.id || i} className="bg-slate-900/50 p-3 rounded cyber-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-white font-bold truncate max-w-[80%]">
                <FiAlertTriangle className="inline mr-1 text-yellow-400" />
                {alert.title || alert.message || 'Alert'}
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.MEDIUM}`}>
                {alert.severity || 'MEDIUM'}
              </span>
            </div>
            {alert.message && alert.title && (
              <p className="text-[10px] font-mono text-slate-500 mt-1">{alert.message}</p>
            )}
            <p className="text-[9px] font-mono text-slate-600 mt-1">
              <FiClock className="inline" /> {alert.timestamp?.split('T')[0] || 'N/A'}
            </p>
          </div>
        ))}
      </div>
    )
  }

  const renderTrends = () => {
    if (trendsLoading) return <p className="text-slate-500 font-mono text-xs">Loading trends...</p>
    if (trendsError) return <p className="text-red-400 font-mono text-xs">! {trendsError}</p>
    if (!trends) return null

    const renderBarChart = (data, maxVal) => {
      if (!data || typeof data !== 'object') return null
      const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
      if (entries.length === 0) return <p className="text-slate-600 font-mono text-xs">No data.</p>
      const max = maxVal || Math.max(...entries.map(([, v]) => v), 1)

      return entries.map(([key, val], i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono text-slate-400 w-32 truncate text-right">{key}</span>
          <div className="flex-1 bg-slate-800 rounded h-3 overflow-hidden">
            <div
              className="h-full bg-blue-500/70 rounded transition-all"
              style={{ width: `${Math.max((val / max) * 100, 2)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-300 w-8 text-right">{val}</span>
        </div>
      ))
    }

    return (
      <div className="space-y-4">
        {trends.topics && Object.keys(trends.topics).length > 0 && (
          <div className="card-cyber p-4 rounded-lg">
            <h3 className="text-[10px] font-mono text-blue-400 font-bold mb-3">
              <FiActivity className="inline mr-1" /> TOPIC DISTRIBUTION
            </h3>
            {renderBarChart(trends.topics)}
          </div>
        )}
        {trends.sources && Object.keys(trends.sources).length > 0 && (
          <div className="card-cyber p-4 rounded-lg">
            <h3 className="text-[10px] font-mono text-blue-400 font-bold mb-3">
              <FiDatabase className="inline mr-1" /> SOURCE DISTRIBUTION
            </h3>
            {renderBarChart(trends.sources)}
          </div>
        )}
        {trends.period && (
          <p className="text-[9px] font-mono text-slate-600">Period: {trends.period}</p>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  const tabs = [
    { id: 'feeds', label: 'THREAT FEEDS', icon: <FiShield className="inline" /> },
    { id: 'keywords', label: 'KEYWORDS', icon: <FiTag className="inline" /> },
    { id: 'search', label: 'DARK WEB SEARCH', icon: <FiEye className="inline" /> },
    { id: 'iocs', label: 'IOCs', icon: <FiDatabase className="inline" /> },
  ]

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiEye className="text-blue-400" />
          <h1 className="title-cyber text-2xl font-bold text-blue-400 glow-text">DARK WEB MONITOR</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Threat intelligence — dark web, extremism monitoring, IOCs</p>
      </div>

      {/* ── SEARCH BAR ── */}
      <form onSubmit={handleDarkWebSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          value={darkWebQuery}
          onChange={(e) => setDarkWebQuery(e.target.value)}
          placeholder="$ search-dark-web (via Ahmia.fi)..."
          className="flex-1 font-mono text-sm px-4 py-3 cyber-border"
        />
        <button type="submit" disabled={searchLoading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {searchLoading ? 'SEARCHING...' : 'SEARCH DARK WEB'}
        </button>
      </form>

      {/* ── CLIENT MODE BANNER ── */}
      {clientMode && (
        <div className="card-cyber p-3 rounded-lg mb-5 border border-yellow-500/30 bg-yellow-950/10">
          <p className="text-yellow-300 text-xs font-mono">⚡ Client-side mode — backend offline, using public APIs (Ahmia.fi, AlienVault OTX, URLhaus)</p>
        </div>
      )}

      {/* ── TAB NAVIGATION ── */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded text-xs font-mono flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'btn-cyber text-white'
                : 'bg-slate-900/50 text-slate-500 hover:text-slate-300 cyber-border'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── EVIDENCE CAPTURE ── */}
      <div className="card-cyber p-4 rounded-lg mb-6">
        <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400">
          <FiSave /> EVIDENCE CAPTURE
        </h2>
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
            placeholder="Threat intelligence notes, context, analysis..."
            rows={2}
            className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
        </div>
        <div className="mb-3">
          <label className="text-[10px] text-slate-500 font-mono block mb-1">TAGS (comma separated)</label>
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="764, darkweb, IOC, threat-intel"
            className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSaveEvidence} disabled={saving}
            className={`px-4 py-2 rounded text-xs font-mono flex items-center gap-2 ${saved ? 'bg-green-600/30 text-green-400' : 'btn-cyber'}`}>
            {saved ? <><FiCheck /> CAPTURED</> : saving ? 'SAVING...' : <><FiSave /> CAPTURE EVIDENCE</>}
          </button>
          {saved && (
            <span className="text-green-400 text-xs font-mono">Evidence captured successfully</span>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── LEFT: TAB CONTENT (3 cols) ── */}
        <div className="lg:col-span-3">
          {activeTab === 'feeds' && (
            <div className="card-cyber p-5 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="title-cyber text-sm font-bold flex items-center gap-2 text-blue-400">
                  <FiShield /> THREAT FEEDS ({feeds.length})
                </h2>
                <button onClick={fetchFeeds} className="text-[10px] font-mono text-slate-500 hover:text-blue-400 flex items-center gap-1">
                  <FiActivity /> REFRESH
                </button>
              </div>
              {renderFeeds()}
            </div>
          )}

          {activeTab === 'keywords' && (
            <div className="card-cyber p-5 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="title-cyber text-sm font-bold flex items-center gap-2 text-blue-400">
                  <FiTag /> KEYWORD MONITORING ({(Array.isArray(keywords) ? keywords : DEFAULT_KEYWORDS).length})
                </h2>
                <button onClick={fetchKeywords} className="text-[10px] font-mono text-slate-500 hover:text-blue-400 flex items-center gap-1">
                  <FiActivity /> REFRESH
                </button>
              </div>
              {renderKeywords()}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="card-cyber p-5 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="title-cyber text-sm font-bold flex items-center gap-2 text-blue-400">
                  <FiLock /> DARK WEB SEARCH ({searchResults.length} results)
                </h2>
              </div>
              {renderSearchResults()}
            </div>
          )}

          {activeTab === 'iocs' && (
            <div>
              <form onSubmit={handleIOCSearch} className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={iocQuery}
                  onChange={(e) => setIocQuery(e.target.value)}
                  placeholder="$ filter-indicators (IP, domain, hash)..."
                  className="flex-1 font-mono text-sm px-4 py-2 cyber-border"
                />
                <button type="submit" disabled={iocLoading}
                  className="btn-cyber px-4 py-2 rounded flex items-center gap-2 text-xs">
                  <FiSearch /> {iocLoading ? 'LOADING...' : 'FILTER IOCs'}
                </button>
              </form>
              <div className="card-cyber p-5 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="title-cyber text-sm font-bold flex items-center gap-2 text-blue-400">
                    <FiDatabase /> INDICATORS OF COMPROMISE
                  </h2>
                  <button onClick={() => fetchIOCs(iocQuery)} className="text-[10px] font-mono text-slate-500 hover:text-blue-400 flex items-center gap-1">
                    <FiActivity /> REFRESH
                  </button>
                </div>
                {renderIOCs()}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: SIDEBAR (1 col) ── */}
        <div className="space-y-5">
          {/* ALERTS */}
          <div className="card-cyber p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="title-cyber text-xs font-bold flex items-center gap-2 text-blue-400">
                <FiAlertTriangle /> ALERTS ({alerts.length})
              </h2>
              <button onClick={fetchAlerts} className="text-[9px] font-mono text-slate-500 hover:text-blue-400">
                REFRESH
              </button>
            </div>
            {renderAlerts()}
          </div>

          {/* TRENDS */}
          <div className="card-cyber p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="title-cyber text-xs font-bold flex items-center gap-2 text-blue-400">
                <FiWifi /> TRENDS
              </h2>
              <button onClick={fetchTrends} className="text-[9px] font-mono text-slate-500 hover:text-blue-400">
                REFRESH
              </button>
            </div>
            {renderTrends()}
          </div>

          {/* THREAT LEVEL INDICATOR */}
          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-xs font-bold mb-3 flex items-center gap-2 text-blue-400">
              <FiShield /> THREAT LEVEL
            </h2>
            <div className="space-y-2">
              <div className="bg-slate-900/50 p-3 rounded cyber-border text-center">
                <p className="text-[10px] font-mono text-slate-500 mb-1">ACTIVE FEEDS</p>
                <p className="text-2xl font-mono font-bold text-blue-400">{feeds.length}</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded cyber-border text-center">
                <p className="text-[10px] font-mono text-slate-500 mb-1">HIGH SEVERITY</p>
                <p className="text-2xl font-mono font-bold text-red-400 glow-text-red">
                  {alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length}
                </p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded cyber-border text-center">
                <p className="text-[10px] font-mono text-slate-500 mb-1">IOC COUNT</p>
                <p className="text-2xl font-mono font-bold text-green-400">
                  {iocs ? Object.values(iocs).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for hash icons
function FiHash({ className = '' }) {
  return <span className={`font-mono ${className}`}>#</span>
}

export default DarkWebMonitor
