import { FiUser, FiMail, FiPhone, FiGlobe, FiShield, FiLink, FiTerminal, FiLock, FiDatabase, FiSearch } from 'react-icons/fi'
import { Link } from 'react-router-dom'

function Home() {
  const tools = [
    { icon: <FiUser size={28} />, title: 'USERNAME OSINT', desc: '50+ platforms - social media, dev, gaming', path: '/username', color: 'from-blue-600/20 to-blue-900/20', border: 'border-blue-500/30', hover: 'hover:border-blue-400/50' },
    { icon: <FiMail size={28} />, title: 'EMAIL OSINT', desc: 'Breaches, DNS, social discovery, reputation', path: '/email', color: 'from-cyan-600/20 to-cyan-900/20', border: 'border-cyan-500/30', hover: 'hover:border-cyan-400/50' },
    { icon: <FiPhone size={28} />, title: 'PHONE OSINT', desc: '27 countries, carrier, timezone, validation', path: '/phone', color: 'from-indigo-600/20 to-indigo-900/20', border: 'border-indigo-500/30', hover: 'hover:border-indigo-400/50' },
    { icon: <FiGlobe size={28} />, title: 'DOMAIN RECON', desc: 'WHOIS, DNS, subdomains, fingerprints', path: '/domain', color: 'from-sky-600/20 to-sky-900/20', border: 'border-sky-500/30', hover: 'hover:border-sky-400/50' },
    { icon: <FiLink size={28} />, title: 'URL INVESTIGATE', desc: 'IP, geolocation, SSL, tech, phishing detect', path: '/url', color: 'from-blue-700/20 to-blue-950/20', border: 'border-blue-600/30', hover: 'hover:border-blue-500/50' },
  ]

  const stats = [
    { label: 'PLATFORMS', value: '50+', icon: <FiDatabase /> },
    { label: 'COUNTRIES', value: '27', icon: <FiGlobe /> },
    { label: 'BREACH DB', value: 'HIBP', icon: <FiLock /> },
    { label: 'MODULES', value: '6', icon: <FiTerminal /> },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <FiTerminal className="text-blue-400 text-3xl" />
          <h1 className="title-cyber text-4xl font-bold text-blue-400 glow-text">OSINT TMC/CLARK</h1>
        </div>
        <p className="text-slate-500 text-sm mb-4">CYBER INTELLIGENCE PLATFORM v2.0</p>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm leading-relaxed">
          Advanced Open Source Intelligence gathering platform for cybersecurity professionals.
          Enumerate usernames, emails, phone numbers, domains, and URLs with deep forensic analysis.
        </p>

        <div className="flex items-center justify-center gap-2 mt-5">
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent w-32"></div>
          <FiShield className="text-yellow-400" />
          <span className="text-yellow-400/80 text-xs font-mono">AUTHORIZED SECURITY RESEARCH ONLY</span>
          <FiShield className="text-yellow-400" />
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent w-32"></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-10">
        {stats.map((stat, idx) => (
          <div key={idx} className="card-cyber p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
              {stat.icon}
              <span className="text-2xl font-bold title-cyber">{stat.value}</span>
            </div>
            <p className="text-slate-500 text-xs font-mono">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {tools.map((tool, idx) => (
          <Link key={idx} to={tool.path}
            className={`bg-gradient-to-br ${tool.color} p-5 rounded-lg border ${tool.border} ${tool.hover} transition-all duration-300 hover-glow group`}>
            <div className="flex items-start gap-4">
              <div className="text-blue-400 group-hover:text-blue-300 transition-colors mt-1">
                {tool.icon}
              </div>
              <div>
                <h3 className="font-bold text-white mb-1 title-cyber text-sm tracking-wider">{tool.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{tool.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card-cyber p-6 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <FiTerminal className="text-blue-400" />
          <h2 className="title-cyber text-lg font-bold text-blue-400 tracking-wider">INTELLIGENCE MODULES</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs font-mono">
          {[
            'GitHub / GitLab / Bitbucket',
            'Reddit / Twitter(X) / Instagram',
            'TikTok / YouTube / Twitch',
            'Facebook / Steam / Spotify',
            'LinkedIn / Telegram / Discord',
            'TryHackMe / HackTheBox',
            'StackOverflow / HackerNews',
            'Medium / Dev.to / Keybase',
            'HIBP Breach + Paste Check',
            'Gravatar Profile Discovery',
            'Email DNS / MX / SPF / DMARC',
            'Phone Carrier + Timezone',
            'WHOIS / DNS / Subdomains',
            'SSL Certificate Analysis',
            'IP Geolocation + ISP',
            'Technology Stack Detection',
            'Phishing Detection Engine',
            'Reputation Scoring System',
          ].map((mod, i) => (
            <div key={i} className="flex items-center gap-2 text-slate-400">
              <span className="text-blue-500">&#9656;</span>
              <span>{mod}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent mb-4"></div>
        <p className="text-slate-600 text-xs font-mono">
          OSINT TMC/CLARK v2.0 | Built for Cybersecurity Professionals | Use Responsibly
        </p>
      </div>
    </div>
  )
}

export default Home
