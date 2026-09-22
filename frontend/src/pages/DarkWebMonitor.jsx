import { useState, useEffect } from 'react'
import { FiEye, FiSearch, FiShield, FiAlertTriangle, FiGlobe, FiLock, FiServer, FiTerminal, FiSave, FiFileText, FiClock, FiTag, FiCheck, FiExternalLink, FiCopy, FiActivity, FiMessageCircle } from 'react-icons/fi'

const DEFAULT_KEYWORDS = ['764', 'nihilistic extremism', 'accelerationism', 'O9A', 'Order of Nine Angles', 'siege culture', 'chan terrorism', 'radicalization', 'lone wolf', 'violent ideology', '764 network', 'cult of the frozen photons', 'com 764', 'NULSEC', 'philippines breach', 'philippine hacktivist', 'pinoy ransomware']

const SOURCE_COLORS = {
  'AlienVault OTX': 'text-orange-400 bg-orange-900/30 border-orange-500/30',
  'URLhaus': 'text-red-400 bg-red-900/30 border-red-500/30',
  'BleepingComputer': 'text-blue-400 bg-blue-900/30 border-blue-500/30',
  'The Hacker News': 'text-cyan-400 bg-cyan-900/30 border-cyan-500/30',
  'Ahmia.fi': 'text-purple-400 bg-purple-900/30 border-purple-500/30',
  'OnionLive': 'text-pink-400 bg-pink-900/30 border-pink-500/30',
  'RSS Feed': 'text-green-400 bg-green-900/30 border-green-500/30',
}

const FORUM_DB = [
  { name: 'BreachForums', onion: 'breached.to', cat: 'data-breach', desc: 'Major data breach forum — leaks, databases, dumps' },
  { name: 'Exploit.in', onion: 'exploit.in', cat: 'hacking', desc: 'Russian hacking forum — exploits, vulnerabilities, zero-days' },
  { name: 'XSS.is', onion: 'xss.is', cat: 'hacking', desc: 'Russian cybercrime forum — exploits, malware, carding' },
  { name: 'Verified', onion: 'verified', cat: 'carding', desc: 'Carding forum — stolen cards, CVV, drops' },
  { name: 'Russian Market', onion: 'russianmarket', cat: 'carding', desc: 'Carding marketplace — fullz, dumps, tracks' },
  { name: 'Genesis Market', onion: 'genesis', cat: 'credentials', desc: 'Stolen session/cookie marketplace' },
  { name: 'Torum', onion: 'torum', cat: 'hacking', desc: 'Hacking community — exploits, zero-days, services' },
  { name: 'Nulled.to', onion: 'nulled', cat: 'hacking', desc: 'Cracking/hacking forum — leaks, exploits, tools' },
  { name: 'Cracked.to', onion: 'cracked', cat: 'hacking', desc: 'Cracking forum — accounts, cracks, hacks' },
  { name: 'Mazafaka', onion: 'mazafaka', cat: 'cybercrime', desc: 'Cybercrime community — fraud, carding, scam' },
  { name: 'Omerta', onion: 'omerta', cat: 'cybercrime', desc: 'Cybercrime forum — carding, fraud, money laundering' },
  { name: '2Easy', onion: '2easy', cat: 'marketplace', desc: 'Malware-as-a-service marketplace — stealers, RATs' },
  { name: 'ASAP Market', onion: 'asapmarket', cat: 'marketplace', desc: 'Dark web marketplace — drugs, fraud, digital goods' },
  { name: 'Torzon Market', onion: 'torzon', cat: 'marketplace', desc: 'Marketplace — drugs, weapons, fraud' },
  { name: 'BlackSprut', onion: 'blacksprut', cat: 'marketplace', desc: 'Russian darknet market — drugs, services' },
  { name: 'Mega Market', onion: 'mega', cat: 'marketplace', desc: 'Russian darknet market — drugs, forged documents' },
  { name: 'WorldMarket', onion: 'worldmarket', cat: 'marketplace', desc: 'Multi-vendor marketplace — drugs, fraud, digital' },
  { name: 'Incognito Market', onion: 'incognitomarket', cat: 'marketplace', desc: 'Marketplace — drugs, digital goods' },
  { name: 'Dark0de', onion: 'dark0de', cat: 'marketplace', desc: 'Multi-purpose marketplace — drugs, malware, services' },
  { name: 'Babylon', onion: 'babylon', cat: 'marketplace', desc: 'Marketplace — drugs, weapons, fraud' },
]

const SOCIAL_FEEDS = [
  { name: 'Darknetlive', url: 'https://darknetlive.com/feed', type: 'rss', desc: 'Dark web news, arrests, marketplace takedowns' },
  { name: 'DeepDotWeb Archive', url: 'https://www.deepdotweb.com', type: 'site', desc: 'Dark web news archive and guides' },
  { name: 'KrebsOnSecurity', url: 'https://krebsonsecurity.com/feed/', type: 'rss', desc: 'Brian Krebs — cybercrime investigations' },
  { name: 'The Record', url: 'https://therecord.media/feed', type: 'rss', desc: 'Cybersecurity news — breaches, APT, ransomware' },
  { name: 'Intel411', url: 'https://intel411.com/feed', type: 'rss', desc: 'Threat intelligence and dark web monitoring' },
  { name: 'DarkReading', url: 'https://www.darkreading.com/rss.xml', type: 'rss', desc: 'Enterprise security news' },
  { name: 'SecurityWeek', url: 'https://feeds.feedburner.com/securityweek', type: 'rss', desc: 'Security news and analysis' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/', type: 'rss', desc: 'Malware, breaches, vulnerability news' },
  { name: 'ThreatPost', url: 'https://threatpost.com/feed/', type: 'rss', desc: 'Threat intelligence and analysis' },
  { name: 'Cyberscoop', url: 'https://cyberscoop.com/feed/', type: 'rss', desc: 'Cybersecurity policy and news' },
  // Philippines sources
  { name: 'PH-CERT Advisories', url: 'https://www.cert.gov.ph/feed', type: 'rss', desc: 'Philippine CERT official advisories' },
  { name: 'DICT Philippines', url: 'https://dict.gov.ph/feed', type: 'rss', desc: 'Dept of Information and Communications Technology' },
  { name: 'Rappler Tech', url: 'https://www.rappler.com/technology/feed/', type: 'rss', desc: 'Philippine tech news and cybersecurity' },
  { name: 'Inquirer.net Tech', url: 'https://technology.inquirer.net/feed', type: 'rss', desc: 'Philippine Inquirer technology section' },
  { name: 'Manila Bulletin Tech', url: 'https://www.mb.com.ph/feed', type: 'rss', desc: 'Manila Bulletin tech and business' },
  { name: 'ABS-CBN News Tech', url: 'https://news.abs-cbn.com/feed', type: 'rss', desc: 'ABS-CBN news feed' },
  { name: 'Philstar Tech', url: 'https://www.philstar.com/feed', type: 'rss', desc: 'Philstar news feed' },
]

// ═══════════════════════════════════════════════════════════════
// PHILIPPINES MONITORING
// ═══════════════════════════════════════════════════════════════

const PH_HACKER_GROUPS = [
  { name: 'NULSEC', aliases: ['nulsec', 'nulsec ph', 'null security'], type: 'hacktivist', desc: 'Philippine hacktivist group — DDoS, defacements, data leaks against PH government and corporations', status: 'active', lastSeen: '2024-ongoing', targets: ['government', 'corporations', 'education'], keywords: ['nulsec', 'null security', 'philippine hacktivist'] },
  { name: 'Anonymous Philippines', aliases: ['anon ph', 'anonymous philippines', 'anonph'], type: 'hacktivist', desc: 'PH chapter of Anonymous — political hacktivism, DDoS, defacements', status: 'active', lastSeen: '2023-ongoing', targets: ['government', 'political'], keywords: ['anonymous philippines', 'anonph', 'anon ph'] },
  { name: 'PHCyberArmy', aliases: ['ph cyber army'], type: 'hacktivist', desc: 'Philippine cyber army — nationalist hacktivism, defacements', status: 'monitoring', lastSeen: '2023', targets: ['government', 'foreign'], keywords: ['phcyberarmy', 'philippine cyber army'] },
  { name: 'TeamP01s0n', aliases: ['poison', 'p01s0n'], type: 'cybercrime', desc: 'PH-based cybercrime group — credential theft, carding', status: 'monitoring', lastSeen: '2024', targets: ['financial', 'e-commerce'], keywords: ['teamp01s0n', 'poison'] },
  { name: 'DarkNebula PH', aliases: ['darknebula', 'dark nebula ph'], type: 'extremism', desc: 'Monitoring — nihilistic/violent extremism content targeting PH youth', status: 'watchlist', lastSeen: '2024', targets: ['youth', 'social media'], keywords: ['darknebula', 'dark nebula', '764 philippines'] },
  { name: 'PH Ransomware Crew', aliases: ['ph ransom', 'pinoy ransom'], type: 'ransomware', desc: 'PH-origin ransomware operations targeting local businesses', status: 'monitoring', lastSeen: '2024', targets: ['businesses', 'healthcare', 'education'], keywords: ['philippine ransomware', 'pinoy ransom'] },
  { name: 'TigerTeam PH', aliases: ['tigerteam'], type: 'pentesting', desc: 'Philippine red team / pentesting community', status: 'legitimate', lastSeen: 'ongoing', targets: ['authorized testing'], keywords: ['tigerteam ph'] },
  { name: 'CyberGhost PH', aliases: ['cyberghost'], type: 'cybercrime', desc: 'PH underground — carding, credential stuffing, fraud', status: 'monitoring', lastSeen: '2024', targets: ['financial', 'e-commerce'], keywords: ['cyberghost philippines'] },
  { name: 'Pinoy Hackers', aliases: ['pinoy hacker', 'pinoyhackers'], type: 'community', desc: 'Filipino hacker community — tools, tutorials, exploits', status: 'active', lastSeen: 'ongoing', targets: ['community'], keywords: ['pinoy hacker', 'pinoyhackers'] },
  { name: 'PHWhiteHat', aliases: ['phwhitehat', 'ph white hat'], type: 'defensive', desc: 'Philippine white hat community — bug bounty, responsible disclosure', status: 'legitimate', lastSeen: 'ongoing', targets: ['defense'], keywords: ['phwhitehat'] },
]

const PH_RANSOMWARE_ACTORS = [
  { name: 'LockBit (PH targets)', desc: 'LockBit ransomware campaigns targeting Philippine organizations' },
  { name: 'BlackCat/ALPHV (PH)', desc: 'BlackCat ransomware — healthcare, education targets in PH' },
  { name: 'Medusa (PH)', desc: 'Medusa ransomware — Philippine government and business targets' },
  { name: 'Play (PH)', desc: 'Play ransomware — Philippine infrastructure targets' },
  { name: 'PH-origin crews', desc: 'Locally operated ransomware targeting PH SMEs' },
]

const PH_DATA_BREACH_KEYWORDS = [
  'philippines data breach', 'philippine data leak', 'ph government breach',
  'depEd breach', 'philhealth breach', 'gsis breach', 'sss data leak',
  'bdo breach', 'bpi breach', 'metrobank breach', 'pal breach',
  'sm breach', 'jollibee breach', 'globe breach', 'smart breach',
  'dito breach', 'maya breach', 'gcash breach', 'paymaya breach',
  'philippine voter data', 'COMELEC breach', 'lto breach',
]

// ═══════════════════════════════════════════════════════════════
// OSAEC — Online Sexual Abuse & Exploitation of Children (PH)
// ═══════════════════════════════════════════════════════════════

const OSAEC_KEYWORDS = [
  'OSAEC', 'online sexual abuse', 'online sexual exploitation',
  'child sexual abuse', 'CSAM', 'child exploitation material', 'CEM',
  'sextortion philippines', 'child sex trafficking', 'online enticement',
  'grooming philippines', 'child pornography philippines', 'livestream abuse',
  'webcam exploitation child', 'pay-per-view abuse', 'live abuse',
  'child trafficking philippines', 'online exploitation of children',
  'sexual exploitation of minors', 'CSAEM', 'digital exploitation',
  'entrapment livestream', 'video sex scandal minor', 'child abuse material',
]

const OSAEC_TELEGRAM_CHANNELS = [
  { name: 'PNP-ACG Alerts', channel: '@PNPACG', desc: 'Philippine National Police Anti-Cybercrime Group', type: 'law-enforcement', verified: true },
  { name: 'DICT PH Cyberwatch', channel: '@DICTCyberwatch', desc: 'Dept of Information and Communications Technology alerts', type: 'government', verified: true },
  { name: 'INHOPE Network', channel: '@INHOPE', desc: 'International Association of Internet Hotlines — CSAM reporting', type: 'intl-org', verified: true },
  { name: 'ICMEC Alerts', channel: '@ICMECorg', desc: 'International Centre for Missing & Exploited Children', type: 'intl-org', verified: true },
  { name: 'NCMEC CyberTipline', channel: '@NCMEC', desc: 'National Center for Missing & Exploited Children', type: 'law-enforcement', verified: true },
  { name: 'IWF UK', channel: '@IWF_hotline', desc: 'Internet Watch Foundation — CSAM detection & blocking', type: 'intl-org', verified: true },
  { name: 'Thorn Digital Defenders', channel: '@ABORTTHORN', desc: 'Thorn — tech tools to fight child sexual abuse', type: 'ngo', verified: true },
  { name: 'EndViolence Against Children', channel: '@ENDViolence', desc: 'Global partnership to end violence against children', type: 'ngo', verified: true },
  { name: 'WeProtect Global Alliance', channel: '@WeProtect', desc: 'Global movement to end child sexual exploitation online', type: 'intl-org', verified: true },
  { name: 'PhilSaferWatch', channel: '@PhilSaferWatch', desc: 'PH civil society — child safety monitoring', type: 'civil-society', verified: false },
  { name: 'SAFER Internet PH', channel: '@SaferInternetPH', desc: 'Philippine internet safety and child protection', type: 'civil-society', verified: false },
  { name: 'OSAEC Watch PH', channel: '@OSAECWatchPH', desc: 'Dedicated OSAEC monitoring in the Philippines', type: 'monitoring', verified: false },
  { name: 'CyberTipLine PH', channel: '@CyberTipPH', desc: 'PH reporting channel for online child exploitation', type: 'reporting', verified: false },
]

const OSAEC_DARK_WEB_MONITORING = [
  { name: 'Ahmia.fi — OSAEC Search', query: 'OSAEC Philippines', source: 'ahmia', desc: 'Search dark web for OSAEC Philippines content' },
  { name: 'Ahmia.fi — CSAM Keywords', query: 'child exploitation philippines', source: 'ahmia', desc: 'Search for child exploitation keywords on .onion' },
  { name: 'Ahmia.fi — Trafficking', query: 'child trafficking philippines', source: 'ahmia', desc: 'Search for trafficking operations' },
  { name: 'Ahmia.fi — Sextortion', query: 'sextortion philippines', source: 'ahmia', desc: 'Search for sextortion operations' },
  { name: 'Ahmia.fi — Grooming', query: 'grooming philippines', source: 'ahmia', desc: 'Search for grooming networks' },
  { name: 'Ahmia.fi — Livestream', query: 'livestream abuse children', source: 'ahmia', desc: 'Search for live abuse streams' },
  { name: 'URLhaus — CSAM domains', query: 'csam', source: 'urlhaus', desc: 'URLhaus scan for CSAM hosting domains' },
  { name: 'URLhaus — PH Exploit domains', query: 'philippines', source: 'urlhaus', desc: 'URLhaus scan for PH child exploitation domains' },
]

const OSAEC_FORUM_MONITORING = [
  { name: 'BreachForums — OSAEC section', forum: 'BreachForums', onion: 'breached.to', cat: 'osaec', desc: 'Monitor for leaked OSAEC databases, victim data' },
  { name: 'Verified — Trafficking', forum: 'Verified', onion: 'verified', cat: 'osaec', desc: 'Monitor for trafficking-related activity' },
  { name: 'Mazafaka — Exploitation', forum: 'Mazafaka', onion: 'mazafaka', cat: 'osaec', desc: 'Monitor for exploitation-related content' },
  { name: 'Omerta — Child Exploitation', forum: 'Omerta', onion: 'omerta', cat: 'osaec', desc: 'Monitor for exploitation networks' },
  { name: 'XSS.is — CSAM hosting', forum: 'XSS.is', onion: 'xss.is', cat: 'osaec', desc: 'Monitor for CSAM hosting discussions' },
  { name: 'Exploit.in — Trafficking', forum: 'Exploit.in', onion: 'exploit.in', cat: 'osaec', desc: 'Monitor for trafficking operations' },
]

const OSAEC_PH_ORGS = [
  { name: 'PNP Anti-Cybercrime Group (ACG)', desc: 'Primary Philippine law enforcement for cyber crimes including OSAEC', url: 'https://www.pnp.gov.ph', type: 'law-enforcement' },
  { name: 'NBI Cybercrime Division', desc: 'National Bureau of Investigation — cyber crimes and child exploitation', url: 'https://www.nbi.gov.ph', type: 'law-enforcement' },
  { name: 'DICT — Cybersecurity Bureau', desc: 'Dept of Information and Communications Technology', url: 'https://dict.gov.ph', type: 'government' },
  { name: 'PPSC — Philippine Posts and Telecoms', desc: 'Regulatory body for telecoms — blocks CSAM domains', url: '', type: 'government' },
  { name: 'ICAC — Inter-Agency Council Against Trafficking', desc: 'Multi-agency council against trafficking in persons', url: '', type: 'government' },
  { name: 'Child Protection Network Foundation', desc: 'PH NGO — child abuse investigation and support', url: '', type: 'ngo' },
  { name: 'ECPAT Philippines', desc: 'End Child Prostitution and Trafficking — PH chapter', url: '', type: 'ngo' },
  { name: 'UNICEF Philippines', desc: 'Child protection and advocacy in the Philippines', url: '', type: 'intl-org' },
  { name: 'WePROTECT PH', desc: 'Philippine implementation of WePROTECT Global Alliance', url: '', type: 'intl-org' },
]

const OSAEC_ALERT_SOURCES = [
  { name: 'PNP-ACG Press Releases', url: 'https://www.pnp.gov.ph/index.php/press-release', type: 'rss', desc: 'Official PNP-ACG arrest and operation reports' },
  { name: 'NBI Press Releases', url: 'https://www.nbi.gov.ph/index.php/press-releases', type: 'rss', desc: 'NBI cybercrime operation reports' },
  { name: 'DICT Advisories', url: 'https://dict.gov.ph/feed', type: 'rss', desc: 'DICT cybersecurity advisories' },
  { name: 'Rappler Crime', url: 'https://www.rappler.com/nation/feed/', type: 'rss', desc: 'Philippine crime and justice news' },
  { name: 'Inquirer News', url: 'https://newsinfo.inquirer.net/feed', type: 'rss', desc: 'Philippine Inquirer news feed' },
  { name: 'PhilStar News', url: 'https://www.philstar.com/rss/headlines', type: 'rss', desc: 'Philippine Star headlines' },
  { name: 'ABS-CBN News', url: 'https://news.abs-cbn.com/feed', type: 'rss', desc: 'ABS-CBN news' },
  { name: 'GMA News', url: 'https://www.gmanetwork.com/rss/news/nation/feed', type: 'rss', desc: 'GMA News nation feed' },
  { name: 'Manila Times', url: 'https://www.manilatimes.net/feed', type: 'rss', desc: 'Manila Times news' },
  { name: 'IWF Reports', url: 'https://www.iwf.org.uk/news-media/feed/', type: 'rss', desc: 'Internet Watch Foundation reports' },
  { name: 'NCMEC Reports', url: 'https://www.missingkids.org/blog/feed', type: 'rss', desc: 'NCMEC CyberTipline reports' },
  { name: 'Thorn Blog', url: 'https://www.thorn.org/feed/', type: 'rss', desc: 'Thorn — digital efforts to fight child sexual abuse' },
]

const FORUM_CATS = {
  'data-breach': { label: 'DATA BREACH', color: 'text-red-400 bg-red-900/30 border-red-500/30' },
  'hacking': { label: 'HACKING', color: 'text-orange-400 bg-orange-900/30 border-orange-500/30' },
  'carding': { label: 'CARDING', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30' },
  'credentials': { label: 'CREDENTIALS', color: 'text-purple-400 bg-purple-900/30 border-purple-500/30' },
  'marketplace': { label: 'MARKETPLACE', color: 'text-pink-400 bg-pink-900/30 border-pink-500/30' },
  'cybercrime': { label: 'CYBERCRIME', color: 'text-red-300 bg-red-950/50 border-red-400/30' },
  'extremism': { label: 'EXTREMISM', color: 'text-red-500 bg-red-950/70 border-red-600/50 font-bold' },
}

function DarkWebMonitor() {
  const [activeTab, setActiveTab] = useState('feeds')
  const [feeds, setFeeds] = useState([])
  const [feedsLoading, setFeedsLoading] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [trends, setTrends] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [iocQuery, setIocQuery] = useState('')
  const [iocs, setIocs] = useState(null)
  const [iocLoading, setIocLoading] = useState(false)
  const [copied, setCopied] = useState(null)
  const [clientMode, setClientMode] = useState(false)
  const [forums, setForums] = useState([])
  const [forumsLoading, setForumsLoading] = useState(false)
  const [forumFilter, setForumFilter] = useState('all')
  const [socialPosts, setSocialPosts] = useState([])
  const [socialLoading, setSocialLoading] = useState(false)
  const [socialFilter, setSocialFilter] = useState('all')
  const [philPosts, setPhilPosts] = useState([])
  const [philLoading, setPhilLoading] = useState(false)
  const [philFilter, setPhilFilter] = useState('all')
  const [philGroups, setPhilGroups] = useState([])
  const [philBreaches, setPhilBreaches] = useState([])
  const [osaecPosts, setOsaecPosts] = useState([])
  const [osaecLoading, setOsaecLoading] = useState(false)
  const [osaecAlerts, setOsaecAlerts] = useState([])
  const [osaecTelegram, setOsaecTelegram] = useState([])
  const [osaecDarkWeb, setOsaecDarkWeb] = useState([])
  const [osaecForums, setOsaecForums] = useState([])
  const [osaecAlertCount, setOsaecAlertCount] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [osaecFilter, setOsaecFilter] = useState('all')
  const [lastOsaecScan, setLastOsaecScan] = useState(null)

  // ═══ SOUND ALERT SYSTEM ═══
  const playAlertSound = () => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      // Triple-beep urgent alert
      const frequencies = [880, 1100, 880]
      frequencies.forEach((freq, i) => {
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

  const playCriticalAlert = () => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      // Urgent siren pattern
      const freqs = [600, 900, 600, 900, 600, 1200]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'square'
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.09)
        osc.start(ctx.currentTime + i * 0.1)
        osc.stop(ctx.currentTime + i * 0.1 + 0.1)
      })
    } catch {}
  }

  useEffect(() => { fetchFeeds(); fetchAlerts(); fetchTrends(); fetchForums(); fetchSocial(); fetchPhil(); fetchOsaec() }, [])

  // ═══ FEEDS ═══
  const fetchFeeds = async () => {
    setFeedsLoading(true)
    const r = []
    try { const x = await fetch('https://otx.alienvault.com/otxapi/pulses?limit=15&sort=-created', { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const p of (d.results || []).slice(0, 15)) r.push({ title: p.name, source: 'AlienVault OTX', description: (p.description || '').slice(0, 300), published: p.created || '', tags: p.tags || [], link: `https://otx.alienvault.com/pulse/${p.id}` }) } } catch {}
    try { const x = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const e of (d.urls || []).slice(0, 15)) r.push({ title: `URLhaus: ${e.url_status || 'unknown'}`, source: 'URLhaus', description: `Threat: ${e.threat || 'unknown'} | Tags: ${(e.tags || []).join(', ')}`, published: e.dateadded || '', tags: e.tags || [], link: e.url }) } } catch {}
    try { const x = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.bleepingcomputer.com/feed/', { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const i of (d.items || []).slice(0, 10)) r.push({ title: i.title, source: 'BleepingComputer', description: (i.description || '').replace(/<[^>]+>/g, '').slice(0, 300), published: i.pubDate || '', tags: i.categories || [], link: i.link }) } } catch {}
    try { const x = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/TheHackersNews', { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const i of (d.items || []).slice(0, 10)) r.push({ title: i.title, source: 'The Hacker News', description: (i.description || '').replace(/<[^>]+>/g, '').slice(0, 300), published: i.pubDate || '', tags: i.categories || [], link: i.link }) } } catch {}
    r.sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    setFeeds(r); setClientMode(true); setFeedsLoading(false)
  }

  // ═══ ALERTS ═══
  const fetchAlerts = async () => {
    const a = []
    try { const x = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const e of (d.urls || []).slice(0, 8)) a.push({ id: e.id || Math.random().toString(36).slice(2), title: `Malicious URL: ${(e.url || '').slice(0, 60)}`, severity: e.url_status === 'online' ? 'HIGH' : 'MEDIUM', source: 'URLhaus', created: e.dateadded || '', tags: e.tags || [] }) } } catch {}
    try { const x = await fetch('https://otx.alienvault.com/otxapi/pulses?limit=5&sort=-created', { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const p of (d.results || []).slice(0, 5)) a.push({ id: p.id, title: p.name, severity: 'HIGH', source: 'AlienVault OTX', created: p.created || '', tags: p.tags || [] }) } } catch {}
    a.sort((x, y) => (y.created || '').localeCompare(x.created || ''))
    setAlerts(a)
  }

  // ═══ TRENDS ═══
  const fetchTrends = async () => {
    const tc = {}, sc = {}
    const kw = { 'Ransomware': ['ransomware', 'ransom'], 'Data Breach': ['breach', 'leak', 'exposed'], 'Phishing': ['phishing', 'phish'], 'Malware': ['malware', 'trojan', 'virus'], 'Zero-Day': ['zero-day', 'exploit', 'vulnerability'], 'Extremism': ['extremism', 'terrorist', 'radical', 'violent', '764', 'nihilistic'], 'APT': ['apt', 'nation-state'] }
    for (const f of [{ n: 'BleepingComputer', u: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.bleepingcomputer.com/feed/' }, { n: 'The Hacker News', u: 'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.feedburner.com/TheHackersNews' }]) {
      try { const x = await fetch(f.u, { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const i of (d.items || [])) { const t = `${i.title} ${i.description || ''}`.toLowerCase(); sc[f.n] = (sc[f.n] || 0) + 1; for (const [topic, words] of Object.entries(kw)) { if (words.some(w => t.includes(w))) tc[topic] = (tc[topic] || 0) + 1 } } } } catch {}
    }
    setTrends({ topics: Object.entries(tc).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count), sources: Object.entries(sc).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count), total: Object.values(sc).reduce((a, b) => a + b, 0) })
  }

  // ═══ FORUMS — Check status + search Ahmia ═══
  const fetchForums = async () => {
    setForumsLoading(true)
    const results = []
    for (const forum of FORUM_DB) {
      let status = 'unknown', uptime = null
      try { const x = await fetch(`https://onion.live/api/domain/${forum.onion}.onion`, { mode: 'cors' }); if (x.ok) { const d = await x.json(); status = d.isOnline ? 'online' : d.isOnline === false ? 'offline' : 'unknown'; uptime = d.uptime || null } } catch {}
      let mentions = 0, topics = []
      try { const x = await fetch(`https://ahmia.fi/api/v1/search/?q=${encodeURIComponent(forum.name)}`, { mode: 'cors' }); if (x.ok) { const d = await x.json(); const items = d.items || d.results || []; mentions = items.length; for (const i of items.slice(0, 3)) topics.push({ title: i.title || 'Untitled', url: i.onion_url || i.url || '', desc: (i.description || '').slice(0, 150) }) } } catch {}
      results.push({ ...forum, status, uptime, mentions, topics, checkedAt: new Date().toISOString() })
    }
    setForums(results); setForumsLoading(false)
  }

  // ═══ SOCIAL MEDIA / NEWS FEEDS ═══
  const fetchSocial = async () => {
    setSocialLoading(true)
    const posts = []
    for (const feed of SOCIAL_FEEDS) {
      try {
        const x = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`, { mode: 'cors' })
        if (x.ok) {
          const d = await x.json()
          for (const item of (d.items || []).slice(0, 8)) {
            const text = `${item.title} ${item.description || ''}`.toLowerCase()
            // Check for NVE / extremism related content
            const isNVE = ['764', 'nihilistic', 'extremism', 'terror', 'radical', 'violent', 'acceleration', 'o9a', 'order of nine', 'siege', 'chan terrorism', 'cult', 'mass casualty', 'manifesto', 'lone wolf', 'recruit', 'groom'].some(kw => text.includes(kw))
            posts.push({
              title: item.title,
              source: feed.name,
              description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
              published: item.pubDate || item.pub_date || '',
              link: item.link,
              categories: item.categories || [],
              isNVE,
              feedType: feed.type,
            })
          }
        }
      } catch {}
    }
    posts.sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    setSocialPosts(posts); setSocialLoading(false)
  }

  // ═══ PHILIPPINES MONITORING ═══
  const fetchPhil = async () => {
    setPhilLoading(true)
    const posts = []
    // PH-specific RSS feeds
    const phFeeds = SOCIAL_FEEDS.filter(f => f.name.includes('PH') || f.name.includes('Rappler') || f.name.includes('Inquirer') || f.name.includes('Manila') || f.name.includes('ABS') || f.name.includes('Philstar'))
    for (const feed of phFeeds) {
      try {
        const x = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`, { mode: 'cors' })
        if (x.ok) {
          const d = await x.json()
          for (const item of (d.items || []).slice(0, 10)) {
            const text = `${item.title} ${item.description || ''}`.toLowerCase()
            const isBreach = PH_DATA_BREACH_KEYWORDS.some(kw => text.includes(kw.toLowerCase())) || ['breach', 'leak', 'hack', 'stolen', 'exposed', 'compromised'].some(kw => text.includes(kw))
            const isRansomware = ['ransomware', 'ransom', 'encrypt', 'lockbit', 'blackcat', 'medusa'].some(kw => text.includes(kw))
            const isExtremism = ['extremist', 'terror', 'radical', 'violence', '764', 'nihilistic', 'o9a', 'acceleration', 'siege'].some(kw => text.includes(kw))
            const isHacktivism = ['nulsec', 'anonymous', 'deface', 'hacktiv', 'ddos', 'cyberattack'].some(kw => text.includes(kw))
            posts.push({
              title: item.title,
              source: feed.name,
              description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
              published: item.pubDate || item.pub_date || '',
              link: item.link,
              categories: item.categories || [],
              isBreach, isRansomware, isExtremism, isHacktivism,
              feedType: feed.type,
            })
          }
        }
      } catch {}
    }
    // Search Ahmia for PH breach data
    for (const kw of ['philippines data breach', 'philippine data leak', 'philhealth breach', 'COMELEC breach', 'philippine voter data']) {
      try {
        const x = await fetch(`https://ahmia.fi/api/v1/search/?q=${encodeURIComponent(kw)}`, { mode: 'cors' })
        if (x.ok) {
          const d = await x.json()
          for (const i of (d.items || d.results || []).slice(0, 3)) {
            posts.push({ title: i.title || kw, source: 'Ahmia.fi', description: (i.description || '').slice(0, 300), published: '', link: i.onion_url || i.url || '', categories: [], isBreach: true, isRansomware: false, isExtremism: false, isHacktivism: false, feedType: 'darkweb' })
          }
        }
      } catch {}
    }
    // Search URLhaus for PH-related malware
    try {
      const x = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' })
      if (x.ok) {
        const d = await x.json()
        for (const e of (d.urls || []).slice(0, 200)) {
          const url = (e.url || '').toLowerCase()
          const tags = (e.tags || []).join(' ').toLowerCase()
          if (tags.includes('philippines') || tags.includes('ph') || url.includes('.ph') || tags.includes('pinoy')) {
            posts.push({ title: `URLhaus: ${e.url_status || 'unknown'} — PH target`, source: 'URLhaus', description: `Threat: ${e.threat || 'unknown'} | Tags: ${(e.tags || []).join(', ')}`, published: e.dateadded || '', link: e.url, categories: [], isBreach: false, isRansomware: (e.threat || '').includes('malware_download'), isExtremism: false, isHacktivism: false, feedType: 'darkweb' })
          }
        }
      }
    } catch {}
    // Search for NULSEC / PH hacker groups on Ahmia
    for (const g of PH_HACKER_GROUPS) {
      for (const alias of g.aliases.slice(0, 2)) {
        try {
          const x = await fetch(`https://ahmia.fi/api/v1/search/?q=${encodeURIComponent(alias)}`, { mode: 'cors' })
          if (x.ok) {
            const d = await x.json()
            for (const i of (d.items || d.results || []).slice(0, 2)) {
              posts.push({ title: `[${g.type.toUpperCase()}] ${i.title || alias}`, source: 'Ahmia.fi', description: (i.description || '').slice(0, 300), published: '', link: i.onion_url || i.url || '', categories: [g.type], isBreach: false, isRansomware: false, isExtremism: g.type === 'extremism', isHacktivism: g.type === 'hacktivist', feedType: 'darkweb' })
            }
          }
        } catch {}
      }
    }
    posts.sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    setPhilPosts(posts)
    setPhilGroups(PH_HACKER_GROUPS)
    setPhilBreaches(PH_RANSOMWARE_ACTORS)
    setPhilLoading(false)
  }

  // ═══ OSAEC MONITORING ═══
  const fetchOsaec = async () => {
    setOsaecLoading(true)
    const posts = []
    const alerts = []
    let newAlertCount = 0

    // 1. Search Ahmia.fi for OSAEC keywords
    for (const kw of OSAEC_DARK_WEB_MONITORING.filter(m => m.source === 'ahmia')) {
      try {
        const x = await fetch(`https://ahmia.fi/api/v1/search/?q=${encodeURIComponent(kw.query)}`, { mode: 'cors' })
        if (x.ok) {
          const d = await x.json()
          const items = d.items || d.results || []
          for (const i of items.slice(0, 5)) {
            const text = `${i.title || ''} ${i.description || ''}`.toLowerCase()
            const severity = ['csam', 'child abuse', 'exploitation', 'trafficking', 'sextortion', 'livestream'].some(k => text.includes(k)) ? 'CRITICAL' : 'HIGH'
            posts.push({
              title: `[DARK WEB] ${i.title || kw.query}`,
              source: 'Ahmia.fi',
              description: (i.description || '').slice(0, 400),
              published: '',
              link: i.onion_url || i.url || '',
              categories: [kw.query],
              type: 'darkweb',
              severity,
              monitoringQuery: kw.query,
            })
            if (severity === 'CRITICAL') {
              alerts.push({ id: `ahmia-${Date.now()}-${Math.random().toString(36).slice(2)}`, title: `CRITICAL: Dark web OSAEC result — ${i.title || kw.query}`, severity: 'CRITICAL', source: 'Ahmia.fi', created: new Date().toISOString(), tags: [kw.query], link: i.onion_url || i.url || '' })
              newAlertCount++
            }
          }
        }
      } catch {}
    }

    // 2. Search URLhaus for CSAM/exploitation domains
    for (const kw of OSAEC_DARK_WEB_MONITORING.filter(m => m.source === 'urlhaus')) {
      try {
        const x = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' })
        if (x.ok) {
          const d = await x.json()
          for (const e of (d.urls || []).slice(0, 200)) {
            const tags = (e.tags || []).join(' ').toLowerCase()
            const url = (e.url || '').toLowerCase()
            const threat = (e.threat || '').toLowerCase()
            if (tags.includes(kw.query) || url.includes(kw.query) || threat.includes(kw.query)) {
              posts.push({
                title: `[URLHAUS] ${e.url_status || 'unknown'} — ${kw.query}`,
                source: 'URLhaus',
                description: `URL: ${e.url} | Threat: ${e.threat || 'unknown'} | Tags: ${(e.tags || []).join(', ')}`,
                published: e.dateadded || '',
                link: e.url,
                categories: [kw.query],
                type: 'urlhaus',
                severity: 'HIGH',
                monitoringQuery: kw.query,
              })
              newAlertCount++
              alerts.push({ id: `urlhaus-${e.id || Date.now()}`, title: `URLhaus CSAM domain: ${(e.url || '').slice(0, 60)}`, severity: 'HIGH', source: 'URLhaus', created: e.dateadded || '', tags: e.tags || [], link: e.url })
            }
          }
        }
      } catch {}
    }

    // 3. Search PH news feeds for OSAEC content
    const phNewsFeeds = [
      'https://api.rss2json.com/v1/api.json?rss_url=https://www.rappler.com/nation/feed/',
      'https://api.rss2json.com/v1/api.json?rss_url=https://newsinfo.inquirer.net/feed',
      'https://api.rss2json.com/v1/api.json?rss_url=https://www.philstar.com/rss/headlines',
      'https://api.rss2json.com/v1/api.json?rss_url=https://news.abs-cbn.com/feed',
      'https://api.rss2json.com/v1/api.json?rss_url=https://www.gmanetwork.com/rss/news/nation/feed',
    ]
    for (const feedUrl of phNewsFeeds) {
      try {
        const x = await fetch(feedUrl, { mode: 'cors' })
        if (x.ok) {
          const d = await x.json()
          for (const item of (d.items || []).slice(0, 15)) {
            const text = `${item.title} ${item.description || ''}`.toLowerCase()
            if (OSAEC_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))) {
              const isCritical = ['csam', 'child abuse material', 'trafficking', 'sextortion', 'exploitation of minor', 'livestream abuse'].some(k => text.includes(k))
              posts.push({
                title: `[PH NEWS] ${item.title}`,
                source: d.feed?.title || 'PH News',
                description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 400),
                published: item.pubDate || item.pub_date || '',
                link: item.link,
                categories: ['OSAEC', 'PH News'],
                type: 'news',
                severity: isCritical ? 'CRITICAL' : 'HIGH',
              })
              if (isCritical) {
                alerts.push({ id: `news-${Date.now()}-${Math.random().toString(36).slice(2)}`, title: `CRITICAL: ${item.title}`, severity: 'CRITICAL', source: d.feed?.title || 'PH News', created: item.pubDate || '', tags: ['OSAEC'], link: item.link })
                newAlertCount++
              }
            }
          }
        }
      } catch {}
    }

    // 4. Search NCMEC/IWF feeds
    const intlFeeds = [
      'https://api.rss2json.com/v1/api.json?rss_url=https://www.missingkids.org/blog/feed',
      'https://api.rss2json.com/v1/api.json?rss_url=https://www.iwf.org.uk/news-media/feed/',
      'https://api.rss2json.com/v1/api.json?rss_url=https://www.thorn.org/feed/',
    ]
    for (const feedUrl of intlFeeds) {
      try {
        const x = await fetch(feedUrl, { mode: 'cors' })
        if (x.ok) {
          const d = await x.json()
          for (const item of (d.items || []).slice(0, 10)) {
            const text = `${item.title} ${item.description || ''}`.toLowerCase()
            if (OSAEC_KEYWORDS.some(kw => text.includes(kw.toLowerCase())) || ['child', 'exploitation', 'csam', 'abuse', 'trafficking'].some(k => text.includes(k))) {
              posts.push({
                title: `[INTL] ${item.title}`,
                source: d.feed?.title || 'Intl Org',
                description: (item.description || '').replace(/<[^>]+>/g, '').slice(0, 400),
                published: item.pubDate || item.pub_date || '',
                link: item.link,
                categories: ['OSAEC', 'International'],
                type: 'intl',
                severity: 'HIGH',
              })
            }
          }
        }
      } catch {}
    }

    // 5. Check dark web forums for OSAEC mentions via Ahmia
    for (const fm of OSAEC_FORUM_MONITORING) {
      try {
        const x = await fetch(`https://ahmia.fi/api/v1/search/?q=${encodeURIComponent(fm.forum + ' child exploitation')}`, { mode: 'cors' })
        if (x.ok) {
          const d = await x.json()
          for (const i of (d.items || d.results || []).slice(0, 2)) {
            posts.push({
              title: `[FORUM] ${fm.forum} — OSAEC mention`,
              source: fm.forum,
              description: (i.description || '').slice(0, 400),
              published: '',
              link: i.onion_url || i.url || '',
              categories: ['OSAEC', 'Forum'],
              type: 'forum',
              severity: 'HIGH',
            })
          }
        }
      } catch {}
    }

    posts.sort((a, b) => (b.published || '').localeCompare(a.published || ''))
    setOsaecPosts(posts)
    setOsaecAlerts(alerts)
    setOsaecTelegram(OSAEC_TELEGRAM_CHANNELS)
    setOsaecDarkWeb(OSAEC_DARK_WEB_MONITORING)
    setOsaecForums(OSAEC_FORUM_MONITORING)
    setOsaecAlertCount(prev => {
      const total = prev + newAlertCount
      if (newAlertCount > 0) playCriticalAlert()
      return total
    })
    setLastOsaecScan(new Date().toISOString())
    setOsaecLoading(false)
  }

  // ═══ SEARCH ═══
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery) return
    setSearchLoading(true)
    const results = []
    try { const x = await fetch(`https://ahmia.fi/api/v1/search/?q=${encodeURIComponent(searchQuery)}`, { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const i of (d.items || d.results || []).slice(0, 15)) results.push({ title: i.title || 'Untitled', onion_url: i.onion_url || i.url || '', description: (i.description || '').slice(0, 300), source: 'Ahmia.fi' }) } } catch {}
    try { const x = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const e of (d.urls || []).slice(0, 50)) { const tags = (e.tags || []).join(' ').toLowerCase(); const url = (e.url || '').toLowerCase(); if (tags.includes(searchQuery.toLowerCase()) || url.includes(searchQuery.toLowerCase())) results.push({ title: `URLhaus: ${e.url_status}`, onion_url: e.url, description: `Threat: ${e.threat || 'unknown'} | Tags: ${(e.tags || []).join(', ')}`, source: 'URLhaus' }) } } } catch {}
    // Search social feeds for the keyword
    for (const post of socialPosts) {
      const text = `${post.title} ${post.description}`.toLowerCase()
      if (text.includes(searchQuery.toLowerCase())) {
        results.push({ title: post.title, onion_url: post.link, description: post.description, source: post.source })
      }
    }
    setSearchResults(results); setSearchLoading(false)
  }

  // ═══ IOCs ═══
  const handleIOCSearch = async (e) => {
    e.preventDefault()
    if (!iocQuery) return
    setIocLoading(true)
    const ind = { ips: [], domains: [], urls: [], hashes: [] }
    try { const x = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', { mode: 'cors' }); if (x.ok) { const d = await x.json(); for (const e of (d.urls || [])) { const url = e.url || '', domain = e.host || '', ip = e.hostaddr || '', hash = e.md5_hash || e.sha256_hash || ''; if (iocQuery && !url.toLowerCase().includes(iocQuery.toLowerCase()) && !domain.toLowerCase().includes(iocQuery.toLowerCase())) continue; if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) ind.ips.push({ value: ip, source: 'URLhaus' }); if (domain) ind.domains.push({ value: domain, source: 'URLhaus' }); if (url) ind.urls.push({ value: url, source: 'URLhaus' }); if (hash) ind.hashes.push({ value: hash, source: 'URLhaus' }) } } } catch {}
    setIocs(ind); setIocLoading(false)
  }

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(() => { setCopied(text); setTimeout(() => setCopied(null), 2000) }) }
  const sevColor = (s) => s === 'HIGH' ? 'bg-red-600/30 text-red-400 border border-red-500/30' : s === 'CRITICAL' ? 'bg-red-700/40 text-red-300 border border-red-400/40' : s === 'MEDIUM' ? 'bg-yellow-600/30 text-yellow-400 border border-yellow-500/30' : 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
  const srcColor = (s) => SOURCE_COLORS[s] || 'text-slate-400 bg-slate-800/50 border-slate-600/30'

  const tabs = [
    { id: 'feeds', label: 'THREAT FEEDS', icon: FiActivity },
    { id: 'forums', label: 'FORUMS', icon: FiMessageCircle },
    { id: 'social', label: 'SOCIAL / NEWS', icon: FiGlobe },
    { id: 'philippines', label: '🇵🇭 PHILIPPINES', icon: FiShield },
    { id: 'osaec', label: '🔴 OSAEC ALERT', icon: FiAlertTriangle },
    { id: 'search', label: 'DARK WEB SEARCH', icon: FiSearch },
    { id: 'iocs', label: 'IOCs', icon: FiLock },
    { id: 'keywords', label: 'KEYWORDS', icon: FiTag },
  ]

  const filteredForums = forumFilter === 'all' ? forums : forums.filter(f => f.cat === forumFilter)
  const filteredSocial = socialFilter === 'nve' ? socialPosts.filter(p => p.isNVE) : socialFilter === 'all' ? socialPosts : socialPosts.filter(p => p.source.toLowerCase().includes(socialFilter.toLowerCase()))

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiEye className="text-red-400" />
          <h1 className="title-cyber text-2xl font-bold text-red-400 glow-text-red">DARK WEB MONITOR</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Threat intelligence — dark web forums, social media extremism, NVE monitoring, IOCs</p>
      </div>

      {clientMode && (
        <div className="card-cyber p-3 rounded-lg mb-5 border border-yellow-500/30 bg-yellow-950/10">
          <p className="text-yellow-300 text-xs font-mono">⚡ Client-side mode — data from public threat intelligence APIs, Ahmia.fi, onion.live, RSS feeds</p>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-mono transition-all ${activeTab === t.id ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-slate-900/50 text-slate-400 border border-slate-700 hover:text-red-300'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">

          {/* ═══ FEEDS TAB ═══ */}
          {activeTab === 'feeds' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="title-cyber text-sm font-bold text-red-400">LATEST THREAT INTELLIGENCE</h2>
                <button onClick={fetchFeeds} className="text-xs text-slate-500 hover:text-red-400 font-mono">↻ REFRESH</button>
              </div>
              {feedsLoading && <p className="text-slate-500 font-mono text-sm">Loading threat feeds...</p>}
              {feeds.map((f, i) => (
                <div key={i} className="card-cyber p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${srcColor(f.source)}`}>{f.source}</span>
                    <span className="text-[10px] text-slate-600 font-mono">{f.published?.slice(0, 10)}</span>
                  </div>
                  <h3 className="text-white text-sm font-bold font-mono mb-1">{f.title}</h3>
                  <p className="text-slate-400 text-xs font-mono line-clamp-2">{f.description}</p>
                  {f.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{f.tags.slice(0, 5).map((t, j) => <span key={j} className="bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-mono">{t}</span>)}</div>}
                  {f.link && <a href={f.link} target="_blank" rel="noopener noreferrer" className="text-red-400 text-[10px] font-mono mt-2 inline-flex items-center gap-1 hover:text-red-300"><FiExternalLink size={10} /> VIEW SOURCE</a>}
                </div>
              ))}
            </div>
          )}

          {/* ═══ FORUMS TAB ═══ */}
          {activeTab === 'forums' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="title-cyber text-sm font-bold text-red-400">DARK WEB FORUMS — STATUS & MONITORING</h2>
                <button onClick={fetchForums} className="text-xs text-slate-500 hover:text-red-400 font-mono">↻ REFRESH</button>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                <button onClick={() => setForumFilter('all')} className={`text-[10px] font-mono px-3 py-1 rounded ${forumFilter === 'all' ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-slate-900/50 text-slate-500 border border-slate-700'}`}>ALL ({forums.length})</button>
                {Object.entries(FORUM_CATS).map(([k, v]) => (
                  <button key={k} onClick={() => setForumFilter(k)} className={`text-[10px] font-mono px-3 py-1 rounded ${forumFilter === k ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-slate-900/50 text-slate-500 border border-slate-700'}`}>{v.label} ({forums.filter(f => f.cat === k).length})</button>
                ))}
              </div>
              {forumsLoading && <p className="text-slate-500 font-mono text-sm mb-3">Checking forum status via onion.live + Ahmia.fi...</p>}
              <div className="space-y-3">
                {filteredForums.map((f, i) => (
                  <div key={i} className="card-cyber p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${FORUM_CATS[f.cat]?.color || 'text-slate-400 bg-slate-800/50'}`}>{FORUM_CATS[f.cat]?.label || f.cat}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${f.status === 'online' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : f.status === 'offline' ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-slate-800/50 text-slate-500 border border-slate-700'}`}>
                          {f.status === 'online' ? '● ONLINE' : f.status === 'offline' ? '○ OFFLINE' : '? UNKNOWN'}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-600 font-mono">{f.checkedAt?.slice(11, 16)}</span>
                    </div>
                    <h3 className="text-white text-sm font-bold font-mono">{f.name}</h3>
                    <p className="text-slate-400 text-[11px] font-mono mt-1">{f.desc}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-mono">
                      <span className="text-slate-500">onion: <span className="text-purple-400">{f.onion}.onion</span></span>
                      {f.uptime != null && <span className="text-slate-500">uptime: <span className="text-cyan-400">{f.uptime}%</span></span>}
                      {f.mentions > 0 && <span className="text-slate-500">ahmia: <span className="text-orange-400">{f.mentions} results</span></span>}
                    </div>
                    {f.topics?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {f.topics.map((t, j) => (
                          <div key={j} className="bg-slate-900/50 p-2 rounded cyber-border">
                            <a href={t.url || '#'} target="_blank" rel="noopener noreferrer" className="text-purple-400 text-[11px] font-mono hover:text-purple-300">{t.title}</a>
                            {t.desc && <p className="text-slate-500 text-[9px] font-mono mt-0.5">{t.desc}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ SOCIAL / NEWS TAB ═══ */}
          {activeTab === 'social' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="title-cyber text-sm font-bold text-red-400">SOCIAL MEDIA & NEWS FEEDS</h2>
                <button onClick={fetchSocial} className="text-xs text-slate-500 hover:text-red-400 font-mono">↻ REFRESH</button>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { id: 'all', label: `ALL (${socialPosts.length})` },
                  { id: 'nve', label: `🔴 NVE / EXTREMISM (${socialPosts.filter(p => p.isNVE).length})` },
                  { id: 'darknetlive', label: 'Darknetlive' },
                  { id: 'krebs', label: 'KrebsOnSecurity' },
                  { id: 'bleeping', label: 'BleepingComputer' },
                  { id: 'record', label: 'The Record' },
                ].map(f => (
                  <button key={f.id} onClick={() => setSocialFilter(f.id)} className={`text-[10px] font-mono px-3 py-1 rounded ${socialFilter === f.id ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-slate-900/50 text-slate-500 border border-slate-700'}`}>{f.label}</button>
                ))}
              </div>
              {socialLoading && <p className="text-slate-500 font-mono text-sm mb-3">Fetching from {SOCIAL_FEEDS.length} sources...</p>}

              {filteredSocial.length > 0 && (
                <div className="mb-4">
                  <div className="card-cyber p-3 rounded-lg mb-3 bg-red-950/20 border border-red-500/20">
                    <p className="text-red-400 text-xs font-mono font-bold">🔴 NVE / EXTREMISM MATCHES: {socialPosts.filter(p => p.isNVE).length} articles flagged</p>
                    <p className="text-slate-500 text-[10px] font-mono mt-1">Monitoring for: 764, nihilistic, extremism, accelerationism, O9A, violent ideology, mass casualty, manifesto</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {filteredSocial.map((p, i) => (
                  <div key={i} className={`card-cyber p-4 rounded-lg ${p.isNVE ? 'border border-red-500/30 bg-red-950/10' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${srcColor(p.source)}`}>{p.source}</span>
                        {p.isNVE && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/30 font-bold">🔴 NVE FLAG</span>}
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">{p.published?.slice(0, 16)}</span>
                    </div>
                    <h3 className={`text-sm font-bold font-mono mb-1 ${p.isNVE ? 'text-red-300' : 'text-white'}`}>{p.title}</h3>
                    <p className="text-slate-400 text-xs font-mono line-clamp-2">{p.description}</p>
                    {p.categories?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{p.categories.slice(0, 4).map((c, j) => <span key={j} className="bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-mono">{c}</span>)}</div>}
                    {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-red-400 text-[10px] font-mono mt-2 inline-flex items-center gap-1 hover:text-red-300"><FiExternalLink size={10} /> READ FULL ARTICLE</a>}
                  </div>
                ))}
                {filteredSocial.length === 0 && !socialLoading && <p className="text-slate-500 font-mono text-sm">No social/news posts found for this filter.</p>}
              </div>
            </div>
          )}

          {/* ═══ PHILIPPINES TAB ═══ */}
          {activeTab === 'philippines' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="title-cyber text-sm font-bold text-blue-400">🇵🇭 PHILIPPINES CYBER THREAT MONITOR</h2>
                <button onClick={fetchPhil} className="text-xs text-slate-500 hover:text-blue-400 font-mono">↻ REFRESH</button>
              </div>

              {/* NULSEC / PH Hacker Groups */}
              <div className="card-cyber p-4 rounded-lg mb-4">
                <h3 className="title-cyber text-xs font-bold text-red-400 mb-3">🔴 PH HACKER GROUPS — ACTIVE MONITORING</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PH_HACKER_GROUPS.map((g, i) => (
                    <div key={i} className={`bg-slate-900/50 p-3 rounded cyber-border ${g.type === 'extremism' ? 'border-red-500/40' : g.type === 'hacktivist' ? 'border-orange-500/30' : g.type === 'ransomware' ? 'border-red-600/30' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs font-mono font-bold">{g.name}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${g.status === 'active' ? 'bg-red-600/30 text-red-400 border border-red-500/30' : g.status === 'watchlist' ? 'bg-yellow-600/30 text-yellow-400 border border-yellow-500/30' : g.status === 'legitimate' ? 'bg-green-600/30 text-green-400 border border-green-500/30' : 'bg-slate-700/30 text-slate-400 border border-slate-600/30'}`}>{g.status.toUpperCase()}</span>
                      </div>
                      <p className="text-slate-400 text-[10px] font-mono">{g.desc}</p>
                      <div className="flex gap-2 mt-1.5 text-[9px] font-mono">
                        <span className="text-slate-500">type: <span className="text-cyan-400">{g.type}</span></span>
                        <span className="text-slate-500">last: <span className="text-yellow-400">{g.lastSeen}</span></span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.targets.map((t, j) => <span key={j} className="bg-slate-800/80 text-slate-400 px-1 py-0.5 rounded text-[8px] font-mono">{t}</span>)}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.keywords.map((k, j) => <span key={j} className="bg-purple-900/30 text-purple-400 px-1 py-0.5 rounded text-[8px] font-mono border border-purple-500/20">{k}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ransomware Actors */}
              <div className="card-cyber p-4 rounded-lg mb-4 bg-red-950/10 border border-red-500/20">
                <h3 className="title-cyber text-xs font-bold text-red-400 mb-3">🔒 RANSOMWARE ACTORS — PH TARGETS</h3>
                <div className="space-y-2">
                  {PH_RANSOMWARE_ACTORS.map((r, i) => (
                    <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border flex items-center justify-between">
                      <div>
                        <span className="text-red-300 text-xs font-mono font-bold">{r.name}</span>
                        <p className="text-slate-500 text-[10px] font-mono">{r.desc}</p>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-600/20 text-red-400">ACTIVE</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Breach Keywords */}
              <div className="card-cyber p-4 rounded-lg mb-4 bg-yellow-950/10 border border-yellow-500/20">
                <h3 className="title-cyber text-xs font-bold text-yellow-400 mb-3">⚠️ PH DATA BREACH KEYWORDS TRACKED</h3>
                <div className="flex flex-wrap gap-1.5">
                  {PH_DATA_BREACH_KEYWORDS.map((kw, i) => {
                    const matches = philPosts.filter(p => `${p.title} ${p.description}`.toLowerCase().includes(kw.toLowerCase())).length
                    return (
                      <span key={i} className={`text-[9px] font-mono px-2 py-1 rounded ${matches > 0 ? 'bg-red-600/30 text-red-400 border border-red-500/30' : 'bg-slate-800/50 text-slate-500 border border-slate-700'}`}>{kw} {matches > 0 ? `(${matches})` : ''}</span>
                    )
                  })}
                </div>
              </div>

              {/* Feed Filters */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { id: 'all', label: `ALL (${philPosts.length})` },
                  { id: 'breach', label: `🔴 BREACHES (${philPosts.filter(p => p.isBreach).length})` },
                  { id: 'ransomware', label: `🔒 RANSOMWARE (${philPosts.filter(p => p.isRansomware).length})` },
                  { id: 'extremism', label: `☠️ EXTREMISM (${philPosts.filter(p => p.isExtremism).length})` },
                  { id: 'hacktivism', label: `⚡ HACKTIVISM (${philPosts.filter(p => p.isHacktivism).length})` },
                ].map(f => (
                  <button key={f.id} onClick={() => setPhilFilter(f.id)} className={`text-[10px] font-mono px-3 py-1 rounded ${philFilter === f.id ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'bg-slate-900/50 text-slate-500 border border-slate-700'}`}>{f.label}</button>
                ))}
              </div>

              {philLoading && <p className="text-slate-500 font-mono text-sm mb-3">Scanning PH threat landscape — feeds + Ahmia.fi + URLhaus...</p>}

              <div className="space-y-3">
                {philPosts.filter(p => {
                  if (philFilter === 'all') return true
                  if (philFilter === 'breach') return p.isBreach
                  if (philFilter === 'ransomware') return p.isRansomware
                  if (philFilter === 'extremism') return p.isExtremism
                  if (philFilter === 'hacktivism') return p.isHacktivism
                  return true
                }).map((p, i) => (
                  <div key={i} className={`card-cyber p-4 rounded-lg ${p.isBreach ? 'border border-red-500/30 bg-red-950/10' : p.isExtremism ? 'border border-red-600/30 bg-red-950/20' : p.isRansomware ? 'border border-orange-500/30 bg-orange-950/10' : p.isHacktivism ? 'border border-yellow-500/30 bg-yellow-950/10' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${p.source.includes('Ahmia') ? 'text-purple-400 bg-purple-900/30 border border-purple-500/30' : p.source.includes('URLhaus') ? 'text-red-400 bg-red-900/30 border border-red-500/30' : 'text-blue-400 bg-blue-900/30 border border-blue-500/30'}`}>{p.source}</span>
                        {p.isBreach && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/30 font-bold">🔴 BREACH</span>}
                        {p.isRansomware && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-orange-600/30 text-orange-400 border border-orange-500/30 font-bold">🔒 RANSOM</span>}
                        {p.isExtremism && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-700/30 text-red-300 border border-red-400/30 font-bold">☠️ EXTREMISM</span>}
                        {p.isHacktivism && <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-yellow-600/30 text-yellow-400 border border-yellow-500/30 font-bold">⚡ HACKTIVISM</span>}
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">{p.published?.slice(0, 16)}</span>
                    </div>
                    <h3 className="text-sm font-bold font-mono mb-1 text-white">{p.title}</h3>
                    <p className="text-slate-400 text-xs font-mono line-clamp-2">{p.description}</p>
                    {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-[10px] font-mono mt-2 inline-flex items-center gap-1 hover:text-blue-300"><FiExternalLink size={10} /> VIEW SOURCE</a>}
                  </div>
                ))}
                {philPosts.length === 0 && !philLoading && <p className="text-slate-500 font-mono text-sm">No PH threat data loaded. Click REFRESH to scan.</p>}
              </div>
            </div>
          )}

          {/* ═══ OSAEC ALERT TAB ═══ */}
          {activeTab === 'osaec' && (
            <div>
              {/* CRITICAL ALERT BANNER */}
              {osaecAlerts.length > 0 && (
                <div className="card-cyber p-4 rounded-lg mb-4 bg-red-950/30 border-2 border-red-500/50 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-red-400 text-2xl">🚨</div>
                      <div>
                        <h3 className="text-red-400 text-sm font-bold font-mono">OSAEC ALERT — {osaecAlerts.length} CRITICAL FINDINGS</h3>
                        <p className="text-red-300/70 text-[10px] font-mono mt-0.5">Sound alerts: {soundEnabled ? '🔔 ENABLED' : '🔇 DISABLED'} | {osaecAlertCount} total alerts this session</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSoundEnabled(!soundEnabled)} className={`text-[10px] font-mono px-3 py-1.5 rounded ${soundEnabled ? 'bg-green-600/30 text-green-400 border border-green-500/30' : 'bg-slate-700/30 text-slate-400 border border-slate-600'}`}>
                        {soundEnabled ? '🔔 SOUND ON' : '🔇 SOUND OFF'}
                      </button>
                      <button onClick={() => { playAlertSound() }} className="text-[10px] font-mono px-3 py-1.5 rounded bg-red-600/30 text-red-400 border border-red-500/30 hover:bg-red-500/30">🔔 TEST ALERT</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h2 className="title-cyber text-sm font-bold text-red-400">🔴 OSAEC — ONLINE SEXUAL ABUSE & EXPLOITATION OF CHILDREN</h2>
                <div className="flex items-center gap-2">
                  {soundEnabled && <span className="text-green-400 text-[10px] font-mono animate-pulse">● LIVE AUDIO</span>}
                  <button onClick={fetchOsaec} className="text-xs text-slate-500 hover:text-red-400 font-mono">↻ FULL SCAN</button>
                </div>
              </div>

              {/* Sound Control Bar */}
              <div className="card-cyber p-3 rounded-lg mb-4 bg-slate-900/50 border border-slate-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs font-mono">🔊 ALERT SOUND:</span>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className={`text-xs font-mono px-3 py-1 rounded ${soundEnabled ? 'bg-green-600/30 text-green-400 border border-green-500/30' : 'bg-slate-700/30 text-slate-400 border border-slate-600'}`}>
                      {soundEnabled ? '✅ ENABLED' : '❌ DISABLED'}
                    </button>
                    <button onClick={() => playAlertSound()} className="text-[10px] font-mono px-2 py-1 rounded bg-slate-700/50 text-slate-400 border border-slate-600 hover:text-white">🔊 TEST</button>
                    <button onClick={() => playCriticalAlert()} className="text-[10px] font-mono px-2 py-1 rounded bg-red-600/30 text-red-400 border border-red-500/30 hover:bg-red-500/30">🚨 CRITICAL TEST</button>
                  </div>
                  <div className="text-[9px] text-slate-600 font-mono">
                    {lastOsaecScan ? `Last scan: ${lastOsaecScan.slice(11, 19)}` : 'Not scanned yet'}
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="card-cyber p-3 rounded-lg text-center">
                  <p className="text-red-400 text-lg font-bold font-mono">{osaecPosts.filter(p => p.severity === 'CRITICAL').length}</p>
                  <p className="text-[9px] text-slate-500 font-mono">CRITICAL</p>
                </div>
                <div className="card-cyber p-3 rounded-lg text-center">
                  <p className="text-orange-400 text-lg font-bold font-mono">{osaecPosts.filter(p => p.severity === 'HIGH').length}</p>
                  <p className="text-[9px] text-slate-500 font-mono">HIGH</p>
                </div>
                <div className="card-cyber p-3 rounded-lg text-center">
                  <p className="text-purple-400 text-lg font-bold font-mono">{osaecAlerts.length}</p>
                  <p className="text-[9px] text-slate-500 font-mono">ALERTS</p>
                </div>
                <div className="card-cyber p-3 rounded-lg text-center">
                  <p className="text-blue-400 text-lg font-bold font-mono">{osaecPosts.length}</p>
                  <p className="text-[9px] text-slate-500 font-mono">TOTAL</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { id: 'all', label: `ALL (${osaecPosts.length})` },
                  { id: 'critical', label: `🚨 CRITICAL (${osaecPosts.filter(p => p.severity === 'CRITICAL').length})` },
                  { id: 'darkweb', label: `🌐 DARK WEB (${osaecPosts.filter(p => p.type === 'darkweb').length})` },
                  { id: 'news', label: `📰 PH NEWS (${osaecPosts.filter(p => p.type === 'news').length})` },
                  { id: 'urlhaus', label: `🔗 URLHAUS (${osaecPosts.filter(p => p.type === 'urlhaus').length})` },
                  { id: 'intl', label: `🌍 INTL (${osaecPosts.filter(p => p.type === 'intl').length})` },
                  { id: 'forum', label: `💬 FORUMS (${osaecPosts.filter(p => p.type === 'forum').length})` },
                ].map(f => (
                  <button key={f.id} onClick={() => setOsaecFilter(f.id)} className={`text-[10px] font-mono px-3 py-1 rounded ${osaecFilter === f.id ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-slate-900/50 text-slate-500 border border-slate-700'}`}>{f.label}</button>
                ))}
              </div>

              {osaecLoading && <p className="text-slate-500 font-mono text-sm mb-3">🚨 Scanning dark web, forums, PH news, Telegram channels for OSAEC content...</p>}

              {/* OSAEC Findings */}
              <div className="space-y-3">
                {osaecPosts.filter(p => {
                  if (osaecFilter === 'all') return true
                  if (osaecFilter === 'critical') return p.severity === 'CRITICAL'
                  return p.type === osaecFilter
                }).map((p, i) => (
                  <div key={i} className={`card-cyber p-4 rounded-lg ${p.severity === 'CRITICAL' ? 'border-2 border-red-500/50 bg-red-950/20' : 'border border-red-500/20 bg-red-950/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${p.severity === 'CRITICAL' ? 'bg-red-600/40 text-red-300 border border-red-500/50 font-bold' : 'bg-orange-600/30 text-orange-400 border border-orange-500/30'}`}>
                          {p.severity === 'CRITICAL' ? '🚨 CRITICAL' : '⚠️ HIGH'}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${p.source.includes('Ahmia') ? 'text-purple-400 bg-purple-900/30 border border-purple-500/30' : p.source.includes('URLhaus') ? 'text-red-400 bg-red-900/30 border border-red-500/30' : 'text-blue-400 bg-blue-900/30 border border-blue-500/30'}`}>{p.source}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-500 border border-slate-700">{p.type?.toUpperCase()}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">{p.published?.slice(0, 16)}</span>
                    </div>
                    <h3 className={`text-sm font-bold font-mono mb-1 ${p.severity === 'CRITICAL' ? 'text-red-300' : 'text-white'}`}>{p.title}</h3>
                    <p className="text-slate-400 text-xs font-mono line-clamp-3">{p.description}</p>
                    {p.categories?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{p.categories.map((c, j) => <span key={j} className="bg-red-900/20 text-red-400/70 px-1.5 py-0.5 rounded text-[9px] font-mono border border-red-500/10">{c}</span>)}</div>}
                    {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-red-400 text-[10px] font-mono mt-2 inline-flex items-center gap-1 hover:text-red-300"><FiExternalLink size={10} /> VIEW EVIDENCE</a>}
                  </div>
                ))}
                {osaecPosts.length === 0 && !osaecLoading && <p className="text-slate-500 font-mono text-sm">No OSAEC data loaded. Click FULL SCAN to monitor.</p>}
              </div>

              {/* Telegram Channels for Monitoring */}
              <div className="card-cyber p-4 rounded-lg mt-5">
                <h3 className="title-cyber text-xs font-bold text-blue-400 mb-3">📱 TELEGRAM CHANNELS — OSAEC MONITORING</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {OSAEC_TELEGRAM_CHANNELS.map((ch, i) => (
                    <div key={i} className="bg-slate-900/50 p-3 rounded cyber-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs font-mono font-bold">{ch.name}</span>
                        <div className="flex items-center gap-1">
                          {ch.verified && <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-green-600/30 text-green-400 border border-green-500/30">✓ VERIFIED</span>}
                          <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${ch.type === 'law-enforcement' ? 'bg-blue-600/30 text-blue-400' : ch.type === 'government' ? 'bg-cyan-600/30 text-cyan-400' : ch.type === 'intl-org' ? 'bg-purple-600/30 text-purple-400' : ch.type === 'ngo' ? 'bg-green-600/30 text-green-400' : 'bg-slate-700/30 text-slate-400'}`}>{ch.type.toUpperCase()}</span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-[10px] font-mono">{ch.desc}</p>
                      <a href={`https://t.me/${ch.channel.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-[10px] font-mono mt-1 inline-flex items-center gap-1 hover:text-blue-300"><FiExternalLink size={10} /> {ch.channel}</a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dark Web Monitoring Queries */}
              <div className="card-cyber p-4 rounded-lg mt-5 bg-purple-950/10 border border-purple-500/20">
                <h3 className="title-cyber text-xs font-bold text-purple-400 mb-3">🌐 DARK WEB MONITORING QUERIES</h3>
                <div className="space-y-2">
                  {OSAEC_DARK_WEB_MONITORING.map((m, i) => (
                    <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border flex items-center justify-between">
                      <div>
                        <span className="text-white text-[11px] font-mono font-bold">{m.name}</span>
                        <p className="text-slate-500 text-[9px] font-mono">{m.desc}</p>
                      </div>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-400">AUTO-SCAN</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Forum Monitoring */}
              <div className="card-cyber p-4 rounded-lg mt-5 bg-orange-950/10 border border-orange-500/20">
                <h3 className="title-cyber text-xs font-bold text-orange-400 mb-3">💬 FORUM MONITORING — OSAEC SECTIONS</h3>
                <div className="space-y-2">
                  {OSAEC_FORUM_MONITORING.map((fm, i) => (
                    <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border flex items-center justify-between">
                      <div>
                        <span className="text-white text-[11px] font-mono font-bold">{fm.name}</span>
                        <p className="text-slate-500 text-[9px] font-mono">{fm.desc}</p>
                      </div>
                      <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-400">{fm.forum}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PH Organizations */}
              <div className="card-cyber p-4 rounded-lg mt-5">
                <h3 className="title-cyber text-xs font-bold text-cyan-400 mb-3">🏛️ PH OSAEC REPORTING ORGANIZATIONS</h3>
                <div className="space-y-2">
                  {OSAEC_PH_ORGS.map((org, i) => (
                    <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-white text-[11px] font-mono font-bold">{org.name}</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${org.type === 'law-enforcement' ? 'bg-blue-600/30 text-blue-400' : org.type === 'government' ? 'bg-cyan-600/30 text-cyan-400' : org.type === 'ngo' ? 'bg-green-600/30 text-green-400' : 'bg-purple-600/30 text-purple-400'}`}>{org.type.toUpperCase()}</span>
                      </div>
                      <p className="text-slate-500 text-[9px] font-mono">{org.desc}</p>
                      {org.url && <a href={org.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-[9px] font-mono mt-0.5 inline-flex items-center gap-1 hover:text-cyan-300"><FiExternalLink size={9} /> {org.url}</a>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SEARCH TAB ═══ */}
          {activeTab === 'search' && (
            <div>
              <form onSubmit={handleSearch} className="flex gap-3 mb-4">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="$ search dark web + forums + social (via Ahmia.fi)..." className="flex-1 font-mono text-sm px-4 py-3" />
                <button type="submit" disabled={searchLoading} className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm"><FiSearch /> {searchLoading ? 'SEARCHING...' : 'SEARCH'}</button>
              </form>
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h2 className="title-cyber text-sm font-bold text-red-400">RESULTS ({searchResults.length})</h2>
                  {searchResults.map((r, i) => (
                    <div key={i} className="card-cyber p-4 rounded-lg">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${srcColor(r.source)}`}>{r.source}</span>
                      <h3 className="text-white text-sm font-bold font-mono mt-1">{r.title}</h3>
                      {r.onion_url && <a href={r.onion_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 text-xs font-mono break-all hover:text-purple-300">{r.onion_url}</a>}
                      <p className="text-slate-400 text-xs font-mono mt-1">{r.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {!searchLoading && searchResults.length === 0 && searchQuery && <p className="text-slate-500 font-mono text-sm">No results for "{searchQuery}"</p>}
            </div>
          )}

          {/* ═══ IOCs TAB ═══ */}
          {activeTab === 'iocs' && (
            <div>
              <form onSubmit={handleIOCSearch} className="flex gap-3 mb-4">
                <input type="text" value={iocQuery} onChange={(e) => setIocQuery(e.target.value)} placeholder="$ search IOCs (IP, domain, hash)..." className="flex-1 font-mono text-sm px-4 py-3" />
                <button type="submit" disabled={iocLoading} className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm"><FiLock /> {iocLoading ? 'SCANNING...' : 'SEARCH IOCs'}</button>
              </form>
              {iocs && (
                <div className="space-y-4">
                  {[['ips', 'IP ADDRESSES', 'text-red-400'], ['domains', 'DOMAINS', 'text-orange-400'], ['urls', 'MALICIOUS URLs', 'text-yellow-400'], ['hashes', 'FILE HASHES', 'text-purple-400']].map(([key, label, color]) => (
                    iocs[key]?.length > 0 && (
                      <div key={key} className="card-cyber p-4 rounded-lg">
                        <h3 className={`title-cyber text-sm font-bold mb-2 ${color}`}>{label} ({iocs[key].length})</h3>
                        <div className="space-y-1">
                          {iocs[key].map((item, j) => (
                            <div key={j} className="flex items-center justify-between bg-slate-900/50 p-2 rounded cyber-border">
                              <span className="text-white text-xs font-mono break-all">{item.value}</span>
                              <button onClick={() => copyToClipboard(item.value)} className="text-slate-500 hover:text-red-400 ml-2 shrink-0">{copied === item.value ? <FiCheck size={12} className="text-green-400" /> : <FiCopy size={12} />}</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                  {iocs.ips?.length === 0 && iocs.domains?.length === 0 && iocs.urls?.length === 0 && iocs.hashes?.length === 0 && <p className="text-slate-500 font-mono text-sm">No IOCs found.</p>}
                </div>
              )}
            </div>
          )}

          {/* ═══ KEYWORDS TAB ═══ */}
          {activeTab === 'keywords' && (
            <div>
              <h2 className="title-cyber text-sm font-bold text-red-400 mb-3">NVE / EXTREMISM KEYWORDS</h2>
              <p className="text-slate-500 text-xs font-mono mb-4">Tracking 764 network and nihilistic violent extremism terms across all feeds</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {DEFAULT_KEYWORDS.map((kw, i) => {
                  const feedCount = feeds.filter(f => `${f.title} ${f.description}`.toLowerCase().includes(kw.toLowerCase())).length
                  const socialCount = socialPosts.filter(p => `${p.title} ${p.description}`.toLowerCase().includes(kw.toLowerCase())).length
                  const total = feedCount + socialCount
                  return (
                    <div key={i} className={`card-cyber p-3 rounded-lg ${total > 0 ? 'border border-red-500/30' : ''}`}>
                      <p className="text-red-400 text-xs font-mono font-bold">{kw}</p>
                      <p className="text-slate-500 text-[10px] font-mono mt-1">{total} match{total !== 1 ? 'es' : ''} across feeds + social + PH</p>
                      {total > 0 && <div className="flex gap-2 mt-1 text-[9px] font-mono"><span className="text-blue-400">feeds:{feedCount}</span><span className="text-purple-400">social:{socialCount}</span><span className="text-cyan-400">ph:{philPosts.filter(p => `${p.title} ${p.description}`.toLowerCase().includes(kw.toLowerCase())).length}</span></div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ═══ SIDEBAR ═══ */}
        <div className="space-y-5">
          {/* ALERTS */}
          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-red-400"><FiAlertTriangle /> ALERTS ({alerts.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {alerts.length === 0 && <p className="text-slate-500 text-xs font-mono">Loading...</p>}
              {alerts.map((a, i) => (
                <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${sevColor(a.severity)}`}>{a.severity}</span>
                    <span className="text-[9px] text-slate-600 font-mono">{a.source}</span>
                  </div>
                  <p className="text-white text-xs font-mono">{a.title}</p>
                  {a.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{a.tags.slice(0, 3).map((t, j) => <span key={j} className="bg-slate-800 text-slate-500 px-1 rounded text-[8px] font-mono">{t}</span>)}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* OSAEC ALERT PANEL */}
          <div className="card-cyber p-4 rounded-lg bg-red-950/20 border border-red-500/30">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-red-400">
              <FiAlertTriangle /> OSAEC ALERTS
              {soundEnabled && <span className="text-green-400 text-[9px] animate-pulse">● LIVE</span>}
            </h2>
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-300 text-xs font-mono">{osaecAlerts.length} alerts | {osaecPosts.length} findings</span>
              <button onClick={() => setSoundEnabled(!soundEnabled)} className={`text-[9px] font-mono px-2 py-0.5 rounded ${soundEnabled ? 'bg-green-600/30 text-green-400' : 'bg-slate-700/30 text-slate-400'}`}>
                {soundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {osaecAlerts.slice(0, 8).map((a, i) => (
                <a key={i} href={a.link || '#'} target="_blank" rel="noopener noreferrer" className="block bg-slate-900/50 p-2 rounded cyber-border hover:bg-red-950/20">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${a.severity === 'CRITICAL' ? 'bg-red-600/40 text-red-300' : 'bg-orange-600/30 text-orange-400'}`}>{a.severity}</span>
                    <span className="text-[8px] text-slate-600 font-mono">{a.source}</span>
                  </div>
                  <p className="text-[10px] font-mono text-red-300 truncate">{a.title}</p>
                </a>
              ))}
              {osaecAlerts.length === 0 && <p className="text-slate-600 text-[10px] font-mono">No alerts yet — click FULL SCAN</p>}
            </div>
          </div>

          {/* FORUM STATUS SUMMARY */}
          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-red-400"><FiMessageCircle /> FORUM STATUS</h2>
            <div className="space-y-1">
              {forums.slice(0, 10).map((f, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 truncate">{f.name}</span>
                  <span className={f.status === 'online' ? 'text-green-400' : f.status === 'offline' ? 'text-red-400' : 'text-slate-600'}>
                    {f.status === 'online' ? '●' : f.status === 'offline' ? '○' : '?'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* NVE SOCIAL MATCHES */}
          <div className="card-cyber p-4 rounded-lg bg-red-950/10 border border-red-500/20">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-red-400"><FiAlertTriangle /> NVE MATCHES</h2>
            <p className="text-red-300 text-xs font-mono mb-2">{socialPosts.filter(p => p.isNVE).length} articles flagged</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {socialPosts.filter(p => p.isNVE).slice(0, 8).map((p, i) => (
                <a key={i} href={p.link} target="_blank" rel="noopener noreferrer" className="block text-[10px] font-mono text-red-300 hover:text-red-200 truncate">▸ {p.title}</a>
              ))}
            </div>
          </div>

          {/* 🇵🇭 PHILIPPINES THREAT SUMMARY */}
          <div className="card-cyber p-4 rounded-lg bg-blue-950/10 border border-blue-500/20">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiShield /> 🇵🇭 PH THREATS</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Hacker Groups</span>
                <span className="text-red-400">{PH_HACKER_GROUPS.length} tracked</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Active (red)</span>
                <span className="text-red-400">{PH_HACKER_GROUPS.filter(g => g.status === 'active').length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Watchlist</span>
                <span className="text-yellow-400">{PH_HACKER_GROUPS.filter(g => g.status === 'watchlist').length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Breaches found</span>
                <span className="text-orange-400">{philPosts.filter(p => p.isBreach).length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Ransomware</span>
                <span className="text-red-400">{philPosts.filter(p => p.isRansomware).length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Extremism</span>
                <span className="text-red-300">{philPosts.filter(p => p.isExtremism).length}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Hacktivism</span>
                <span className="text-yellow-400">{philPosts.filter(p => p.isHacktivism).length}</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700/30">
              <p className="text-[9px] text-slate-600 font-mono">Sources: Rappler, Inquirer, Manila Bulletin, ABS-CBN, PH-CERT, Ahmia.fi, URLhaus</p>
            </div>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {philPosts.filter(p => p.isBreach || p.isRansomware).slice(0, 5).map((p, i) => (
                <a key={i} href={p.link} target="_blank" rel="noopener noreferrer" className="block text-[10px] font-mono text-blue-300 hover:text-blue-200 truncate">▸ {p.title}</a>
              ))}
            </div>
          </div>

          {/* TRENDS */}
          <div className="card-cyber p-4 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-red-400"><FiActivity /> TRENDS</h2>
            {trends ? (
              <div>
                <p className="text-slate-500 text-[10px] font-mono mb-2">{trends.total} articles analyzed</p>
                {trends.topics?.length > 0 && <div className="space-y-1 mb-3"><p className="text-[10px] text-slate-500 font-mono">TOPICS:</p>{trends.topics.map((t, i) => (<div key={i} className="flex items-center gap-2"><span className="text-white text-[10px] font-mono w-24 truncate">{t.topic}</span><div className="flex-1 bg-slate-800 rounded h-2"><div className="bg-red-500/60 h-2 rounded" style={{ width: `${Math.min((t.count / (trends.topics[0]?.count || 1)) * 100, 100)}%` }}></div></div><span className="text-slate-500 text-[9px] font-mono w-6 text-right">{t.count}</span></div>))}</div>}
                {trends.sources?.length > 0 && <div className="space-y-1"><p className="text-[10px] text-slate-500 font-mono">SOURCES:</p>{trends.sources.map((s, i) => (<div key={i} className="flex items-center justify-between"><span className="text-slate-400 text-[10px] font-mono">{s.source}</span><span className="text-blue-400 text-[10px] font-mono">{s.count}</span></div>))}</div>}
              </div>
            ) : <p className="text-slate-500 text-xs font-mono">Loading...</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DarkWebMonitor
