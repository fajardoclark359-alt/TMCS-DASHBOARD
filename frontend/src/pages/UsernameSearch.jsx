import { useState } from 'react'
import { searchUsername } from '../services/api'
import { FiSearch, FiExternalLink, FiUser, FiMail, FiShield, FiAlertTriangle, FiGlobe, FiCalendar, FiImage, FiTerminal } from 'react-icons/fi'

function UsernameSearch() {
  const [username, setUsername] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!username) return
    setLoading(true)
    try {
      const data = await searchUsername(username)
      setResults(data)
    } catch (err) {
      console.error(err)
      alert('Error searching username')
    }
    setLoading(false)
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
        <p className="text-slate-500 text-sm font-mono ml-7">Enumerate digital footprint across 50+ platforms</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="$ enter-target-username..."
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'SCANNING...' : 'ENUMERATE'}
        </button>
      </form>

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
