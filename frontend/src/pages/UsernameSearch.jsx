import { useState, useEffect } from 'react'
import { searchUsername, captureUsernameEvidence, listUsernameEvidence } from '../services/api'
import { clientSearchUsername } from '../services/clientFallbacks'
import { FiSearch, FiExternalLink, FiUser, FiMail, FiShield, FiAlertTriangle, FiGlobe, FiCalendar, FiImage, FiTerminal, FiSave, FiFileText, FiClock, FiTag } from 'react-icons/fi'

function UsernameSearch() {
  const [username, setUsername] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [priority, setPriority] = useState('medium')
  const [caseId, setCaseId] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [evidenceList, setEvidenceList] = useState([])
  const [showEvidence, setShowEvidence] = useState(false)

  useEffect(() => {
    fetchEvidenceList()
  }, [])

  const fetchEvidenceList = async () => {
    try {
      const data = await listUsernameEvidence()
      setEvidenceList(data)
    } catch (err) {
      console.error('Failed to fetch evidence list')
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!username) return
    setLoading(true)
    setSaved(false)
    try {
      const data = await searchUsername(username)
      setResults(data)
    } catch (err) {
      console.error('Backend unavailable, using client-side fallback:', err.message)
      try {
        const data = await clientSearchUsername(username)
        setResults(data)
      } catch (clientErr) {
        console.error(clientErr)
        alert('Error searching username: ' + clientErr.message)
      }
    }
    setLoading(false)
  }

  const handleCaptureEvidence = async () => {
    if (!results) return
    setSaving(true)
    try {
      const data = await captureUsernameEvidence({
        username: username,
        notes: notes,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        priority: priority,
        case_id: caseId
      })
      setSaved(true)
      fetchEvidenceList()
    } catch (err) {
      console.error(err)
      alert('Error saving evidence')
    }
    setSaving(false)
  }

  const riskColor = (score) => {
    if (score >= 40) return 'text-red-400 glow-text-red'
    if (score >= 20) return 'text-orange-400'
    if (score >= 10) return 'text-yellow-400'
    return 'text-blue-400 glow-text'
  }

  const platformColors = {
    github: 'bg-slate-800/80 border border-slate-600/30', gitlab: 'bg-orange-950/50 border border-orange-600/20',
    bitbucket: 'bg-blue-950/50 border border-blue-600/20', reddit: 'bg-orange-950/50 border border-orange-500/20',
    twitter: 'bg-sky-950/50 border border-sky-500/20', x: 'bg-sky-950/50 border border-sky-500/20',
    instagram: 'bg-pink-950/50 border border-pink-500/20', tiktok: 'bg-red-950/50 border border-red-500/20',
    youtube: 'bg-red-950/50 border border-red-600/20', twitch: 'bg-purple-950/50 border border-purple-500/20',
    facebook: 'bg-blue-950/50 border border-blue-600/20', steam: 'bg-slate-800/80 border border-slate-500/20',
    linkedin: 'bg-blue-950/50 border border-blue-500/20', discord: 'bg-indigo-950/50 border border-indigo-500/20',
    telegram: 'bg-blue-950/50 border border-blue-400/20', tryhackme: 'bg-red-950/50 border border-red-500/20',
    hackthebox: 'bg-blue-950/50 border border-blue-500/20', keybase: 'bg-cyan-950/50 border border-cyan-500/20',
    mastodon: 'bg-purple-950/50 border border-purple-400/20', gravatar: 'bg-blue-950/50 border border-blue-500/20',
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-blue-400" />
          <h1 className="title-cyber text-2xl font-bold text-blue-400 glow-text">USERNAME OSINT</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Enumerate digital footprint across 50+ platforms + evidence capture</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="$ enter-target-username..."
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'SCANNING...' : 'ENUMERATE'}
        </button>
      </form>

      {results?.client_mode && (
        <div className="card-cyber p-3 rounded-lg mb-5 border border-yellow-500/30 bg-yellow-950/10">
          <p className="text-yellow-300 text-xs font-mono">⚡ Scanned in-browser — backend offline, results are from client-side OSINT</p>
        </div>
      )}

      {/* EVIDENCE CAPTURE FORM */}
      {results && (
        <div className="card-cyber p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="title-cyber text-sm font-bold flex items-center gap-2 text-blue-400">
              <FiSave /> EVIDENCE CAPTURE
            </h2>
            <button onClick={() => setShowEvidence(!showEvidence)}
              className="text-xs text-slate-500 hover:text-blue-400 font-mono flex items-center gap-1">
              <FiFileText /> {showEvidence ? 'HIDE' : 'SHOW'} SAVED ({evidenceList.length})
            </button>
          </div>
          
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
              placeholder="Investigation notes, context, findings..."
              rows={2}
              className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
          </div>
          
          <div className="mb-3">
            <label className="text-[10px] text-slate-500 font-mono block mb-1">TAGS (comma separated)</label>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="suspect, scam, verification"
              className="w-full bg-slate-900/50 rounded px-3 py-2 font-mono text-xs cyber-border" />
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleCaptureEvidence} disabled={saving}
              className={`px-4 py-2 rounded text-xs font-mono flex items-center gap-2 ${saved ? 'bg-green-600/30 text-green-400' : 'btn-cyber'}`}>
              {saved ? <><FiCheck /> SAVED</> : saving ? 'SAVING...' : <><FiSave /> CAPTURE EVIDENCE</>}
            </button>
            {saved && (
              <span className="text-green-400 text-xs font-mono">Evidence captured successfully</span>
            )}
          </div>
        </div>
      )}

      {/* EVIDENCE LIST */}
      {showEvidence && evidenceList.length > 0 && (
        <div className="card-cyber p-4 rounded-lg mb-6">
          <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400">
            <FiFileText /> SAVED EVIDENCE ({evidenceList.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {evidenceList.map((ev, i) => (
              <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400">{ev.evidence_id}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                    ev.priority === 'critical' ? 'bg-red-600/30 text-red-400' :
                    ev.priority === 'high' ? 'bg-orange-600/30 text-orange-400' :
                    ev.priority === 'medium' ? 'bg-yellow-600/30 text-yellow-400' :
                    'bg-slate-600/30 text-slate-400'
                  }`}>{ev.priority?.toUpperCase()}</span>
                </div>
                <div className="text-slate-500 text-[10px] mt-1">
                  <FiClock className="inline mr-1" />{ev.timestamp?.split('T')[0]}
                  <FiUser className="inline ml-2 mr-1" />{ev.target}
                </div>
                {ev.notes && <p className="text-slate-400 text-[10px] mt-1">{ev.notes}</p>}
                {ev.tags?.length > 0 && (
                  <div className="mt-1 flex gap-1 flex-wrap">
                    {ev.tags.map((tag, j) => (
                      <span key={j} className="bg-blue-600/20 text-blue-400 px-1 rounded text-[9px]">
                        <FiTag className="inline" /> {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-[9px] text-slate-600 mt-1">HASH: {ev.evidence_hash}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-5">
          {results.evidence && (
            <>
              <div className="card-cyber p-5 rounded-lg">
                <h2 className="title-cyber text-lg font-bold mb-4 flex items-center gap-2 text-blue-400">
                  <FiShield /> INTELLIGENCE SUMMARY
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-900/50 rounded cyber-border">
                    <p className="text-3xl font-bold text-blue-400 title-cyber">{results.evidence.total_platforms}</p>
                    <p className="text-slate-500 text-xs font-mono mt-1">PLATFORMS</p>
                  </div>
                  <div className="text-center p-3 bg-slate-900/50 rounded cyber-border">
                    <p className={`text-3xl font-bold title-cyber ${riskColor(results.evidence.risk_score)}`}>{results.evidence.risk_score}</p>
                    <p className="text-slate-500 text-xs font-mono mt-1">RISK SCORE</p>
                  </div>
                  <div className="text-center p-3 bg-slate-900/50 rounded cyber-border">
                    <p className="text-3xl font-bold text-purple-400 title-cyber">{results.evidence.total_followers?.toLocaleString() || 0}</p>
                    <p className="text-slate-500 text-xs font-mono mt-1">FOLLOWERS</p>
                  </div>
                  <div className="text-center p-3 bg-slate-900/50 rounded cyber-border">
                    <p className="text-3xl font-bold text-cyan-400 title-cyber">{results.evidence.email_candidates?.length || 0}</p>
                    <p className="text-slate-500 text-xs font-mono mt-1">EMAILS</p>
                  </div>
                </div>
                {results.evidence.full_name && (
                  <p className="text-sm font-mono mb-2"><span className="text-slate-500">[+]</span> Full Name: <span className="text-blue-400 font-bold">{results.evidence.full_name}</span></p>
                )}
                {results.evidence.risk_factors?.length > 0 && (
                  <div className="mt-3 p-3 bg-red-950/20 rounded border border-red-500/20">
                    <p className="text-red-400 text-xs font-mono mb-1">&#9656; RISK FACTORS:</p>
                    {results.evidence.risk_factors.map((f, i) => (
                      <p key={i} className="text-red-300 text-xs font-mono ml-4">- {f}</p>
                    ))}
                  </div>
                )}
              </div>

              {results.evidence.email_candidates?.length > 0 && (
                <div className="card-cyber p-4 rounded-lg">
                  <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiMail /> DISCOVERED EMAILS</h2>
                  <div className="flex flex-wrap gap-2">
                    {results.evidence.email_candidates.map((email, i) => (
                      <span key={i} className="bg-blue-950/50 text-blue-300 px-3 py-1 rounded text-xs font-mono cyber-border">{email}</span>
                    ))}
                  </div>
                </div>
              )}

              {results.evidence.bio_snippets?.length > 0 && (
                <div className="card-cyber p-4 rounded-lg">
                  <h2 className="title-cyber text-sm font-bold mb-2 text-blue-400">&#9656; INTEL FROM BIOS</h2>
                  <div className="space-y-2">
                    {results.evidence.bio_snippets.map((b, i) => (
                      <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border">
                        <span className="text-blue-400 font-bold text-xs font-mono uppercase">[{b.platform}]</span>
                        <p className="text-slate-300 text-xs mt-1">{b.bio}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.evidence.profile_images?.length > 0 && (
                <div className="card-cyber p-4 rounded-lg">
                  <h2 className="title-cyber text-sm font-bold mb-3 flex items-center gap-2 text-blue-400"><FiImage /> PROFILE IMAGES</h2>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                    {results.evidence.profile_images.map((img, i) => (
                      <div key={i} className="text-center">
                        <img src={img.url} alt={img.platform} className="w-14 h-14 rounded-full mx-auto mb-1 object-cover cyber-border" />
                        <p className="text-[10px] text-slate-500 font-mono">{img.platform}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.evidence.creation_dates?.length > 0 && (
                <div className="card-cyber p-4 rounded-lg">
                  <h2 className="title-cyber text-sm font-bold mb-2 flex items-center gap-2 text-blue-400"><FiCalendar /> ACCOUNT TIMELINE</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {results.evidence.creation_dates.map((c, i) => (
                      <div key={i} className="bg-slate-900/50 p-2 rounded cyber-border text-xs">
                        <span className="text-blue-400 font-mono uppercase">{c.platform}</span>
                        <p className="text-slate-400 font-mono">{typeof c.date === 'number' ? new Date(c.date * 1000).toLocaleDateString() : new Date(c.date).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="card-cyber p-5 rounded-lg">
            <h2 className="title-cyber text-sm font-bold mb-4 text-blue-400">&#9656; ALL DISCOVERED PROFILES ({results.profiles?.length || 0})</h2>
            {results.profiles?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {results.profiles.map((profile, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${platformColors[profile.platform] || 'bg-slate-800/80 border border-slate-600/30'} hover:opacity-90 transition`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs uppercase text-white font-mono">{profile.platform}</span>
                      {profile.url && (
                        <a href={profile.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                          <FiExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {profile.full_name && <p className="text-white font-medium text-xs">{profile.full_name}</p>}
                    {profile.bio && <p className="text-slate-400 text-[11px] mt-1 line-clamp-2">{profile.bio}</p>}
                    {profile.email && <p className="text-blue-300 text-[11px] mt-1 font-mono">{profile.email}</p>}
                    <div className="flex gap-3 text-[10px] text-slate-500 mt-1 font-mono">
                      {profile.followers != null && <span>followers:{typeof profile.followers === 'number' ? profile.followers.toLocaleString() : profile.followers}</span>}
                      {profile.following != null && <span>following:{profile.following}</span>}
                    </div>
                    {profile.created_at && (
                      <p className="text-[10px] text-slate-600 mt-1 font-mono">
                        created:{typeof profile.created_at === 'number' ? new Date(profile.created_at * 1000).toISOString().split('T')[0] : new Date(profile.created_at).toISOString().split('T')[0]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 font-mono text-sm">$ no profiles found for this target</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UsernameSearch
