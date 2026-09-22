import { HashRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import UsernameSearch from './pages/UsernameSearch'
import EmailSearch from './pages/EmailSearch'
import PhoneSearch from './pages/PhoneSearch'
import DomainSearch from './pages/DomainSearch'
import URLInvestigation from './pages/URLInvestigation'
import MediaForensics from './pages/MediaForensics'
import DarkWebMonitor from './pages/DarkWebMonitor'
import { FiHome, FiUser, FiMail, FiPhone, FiGlobe, FiLink, FiShield, FiTerminal, FiCamera, FiEye } from 'react-icons/fi'

function App() {
  return (
    <Router>
      <div className="min-h-screen flex">
        <nav className="w-64 nav-cyber p-4 relative">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <FiTerminal className="text-blue-400 text-xl" />
              <h1 className="title-cyber text-xl font-bold text-blue-400 glow-text">OSINT TMC/CLARK</h1>
            </div>
            <p className="text-xs text-slate-500 ml-7">CYBER INTELLIGENCE PLATFORM</p>
          </div>

          <ul className="space-y-1">
            <li>
              <NavLink to="/" className={({isActive}) => `flex items-center gap-3 p-2.5 rounded transition-all ${isActive ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-300 border border-transparent'}`}>
                <FiHome size={16} /> <span className="text-sm">HOME</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/username" className={({isActive}) => `flex items-center gap-3 p-2.5 rounded transition-all ${isActive ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-300 border border-transparent'}`}>
                <FiUser size={16} /> <span className="text-sm">USERNAME OSINT</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/email" className={({isActive}) => `flex items-center gap-3 p-2.5 rounded transition-all ${isActive ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-300 border border-transparent'}`}>
                <FiMail size={16} /> <span className="text-sm">EMAIL OSINT</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/phone" className={({isActive}) => `flex items-center gap-3 p-2.5 rounded transition-all ${isActive ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-300 border border-transparent'}`}>
                <FiPhone size={16} /> <span className="text-sm">PHONE OSINT</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/domain" className={({isActive}) => `flex items-center gap-3 p-2.5 rounded transition-all ${isActive ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-300 border border-transparent'}`}>
                <FiGlobe size={16} /> <span className="text-sm">DOMAIN RECON</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/url" className={({isActive}) => `flex items-center gap-3 p-2.5 rounded transition-all ${isActive ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-300 border border-transparent'}`}>
                <FiLink size={16} /> <span className="text-sm">URL INVESTIGATE</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/media" className={({isActive}) => `flex items-center gap-3 p-2.5 rounded transition-all ${isActive ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-blue-300 border border-transparent'}`}>
                <FiCamera size={16} /> <span className="text-sm">MEDIA FORENSICS</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/darkweb" className={({isActive}) => `flex items-center gap-3 p-2.5 rounded transition-all ${isActive ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-red-300 border border-transparent'}`}>
                <FiEye size={16} /> <span className="text-sm">DARK WEB MONITOR</span>
              </NavLink>
            </li>
          </ul>

          <div className="mt-8 p-3 bg-slate-900/50 rounded cyber-border text-xs">
            <div className="flex items-center gap-2 mb-2">
              <FiShield className="text-yellow-400" />
              <p className="text-yellow-400 font-bold">AUTHORIZED USE ONLY</p>
            </div>
            <p className="text-slate-500 leading-relaxed">For security research and authorized penetration testing only.</p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-600 font-mono">v2.0.0 | TMC/CLARK</p>
          </div>
        </nav>

        <main className="flex-1 p-6 bg-matrix-rain min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/username" element={<UsernameSearch />} />
            <Route path="/email" element={<EmailSearch />} />
            <Route path="/phone" element={<PhoneSearch />} />
            <Route path="/domain" element={<DomainSearch />} />
            <Route path="/url" element={<URLInvestigation />} />
            <Route path="/media" element={<MediaForensics />} />
            <Route path="/darkweb" element={<DarkWebMonitor />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
