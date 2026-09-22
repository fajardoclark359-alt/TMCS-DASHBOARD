import { useState } from 'react'
import { FiX, FiAlertTriangle, FiUpload, FiSend } from 'react-icons/fi'

const CATEGORIES = [
  { id: 'gambling', label: 'Illegal Online Gambling', icon: '🎰', color: '#f59e0b' },
  { id: 'fraud', label: 'Financial Fraud', icon: '💳', color: '#ef4444' },
  { id: 'osaec', label: 'OSAEC', icon: '🚨', color: '#dc2626' },
  { id: 'govt', label: 'Threat to Government', icon: '🏛️', color: '#8b5cf6' },
  { id: 'infodis', label: 'Information Disorder', icon: '📰', color: '#3b82f6' },
  { id: 'violence', label: 'Violent Extremism', icon: '💥', color: '#f97316' },
  { id: 'illicit', label: 'Illicit Trade Services', icon: '📦', color: '#10b981' },
  { id: 'unlawful', label: 'Unlawful Online Activities', icon: '⚠️', color: '#6366f1' },
]

const SEVERITIES = [
  { id: 'critical', label: 'CRITICAL', color: '#bd2426' },
  { id: 'high', label: 'HIGH', color: '#f5a623' },
  { id: 'medium', label: 'MEDIUM', color: '#dcd126' },
  { id: 'low', label: 'LOW', color: '#50c8e8' },
]

export default function ReportModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    category: '',
    severity: '',
    title: '',
    description: '',
    sourceUrl: '',
    location: '',
    reporterName: '',
    anonymous: false,
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.category || !form.severity || !form.title) return
    setSubmitted(true)
    setTimeout(() => {
      onSubmit && onSubmit(form)
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg" style={{ background: '#1c2333', border: '1px solid #30363d', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #30363d' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(189,36,38,0.15)' }}>
              <FiAlertTriangle size={20} style={{ color: '#bd2426' }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#c9d1d9', fontFamily: 'Orbitron, sans-serif', letterSpacing: '1px' }}>
                REPORT INCIDENT
              </h2>
              <p className="text-xs" style={{ color: '#8b949e' }}>TMCS — Threat Monitoring Center System</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5">
            <FiX size={20} style={{ color: '#8b949e' }} />
          </button>
        </div>

        {submitted ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#3fb950', fontFamily: 'Orbitron, sans-serif' }}>REPORT SUBMITTED</h3>
            <p className="text-sm" style={{ color: '#8b949e' }}>Incident report has been logged in the TMCS system.</p>
            <p className="text-xs mt-2" style={{ color: '#58a6ff' }}>Reference ID: TMCS-{Date.now().toString(36).toUpperCase()}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">

            {/* Category */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: '#8b949e', letterSpacing: '1px' }}>THREAT CATEGORY *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => setForm(prev => ({ ...prev, category: cat.id }))}
                    className="flex items-center gap-2 p-3 rounded-lg text-left text-sm transition-all"
                    style={{
                      background: form.category === cat.id ? `${cat.color}15` : '#0d1117',
                      border: `1px solid ${form.category === cat.id ? cat.color : '#30363d'}`,
                      color: form.category === cat.id ? cat.color : '#8b949e',
                    }}>
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: '#8b949e', letterSpacing: '1px' }}>SEVERITY *</label>
              <div className="flex gap-2">
                {SEVERITIES.map(sev => (
                  <button key={sev.id} type="button" onClick={() => setForm(prev => ({ ...prev, severity: sev.id }))}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: form.severity === sev.id ? `${sev.color}20` : '#0d1117',
                      border: `1px solid ${form.severity === sev.id ? sev.color : '#30363d'}`,
                      color: form.severity === sev.id ? sev.color : '#8b949e',
                      letterSpacing: '1px',
                    }}>
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: '#8b949e', letterSpacing: '1px' }}>TITLE *</label>
              <input name="title" value={form.title} onChange={handleChange} required
                placeholder="Brief summary of the incident..."
                className="w-full p-3 rounded-lg text-sm"
                style={{ background: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: '#8b949e', letterSpacing: '1px' }}>DESCRIPTION</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={4}
                placeholder="Detailed description of the threat or incident..."
                className="w-full p-3 rounded-lg text-sm resize-none"
                style={{ background: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }} />
            </div>

            {/* Source URL + Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#8b949e', letterSpacing: '1px' }}>SOURCE URL</label>
                <input name="sourceUrl" value={form.sourceUrl} onChange={handleChange}
                  placeholder="https://..."
                  className="w-full p-3 rounded-lg text-sm"
                  style={{ background: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#8b949e', letterSpacing: '1px' }}>LOCATION</label>
                <input name="location" value={form.location} onChange={handleChange}
                  placeholder="City, Region, Country"
                  className="w-full p-3 rounded-lg text-sm"
                  style={{ background: '#0d1117', border: '1px solid #30363d', color: '#c9d1d9' }} />
              </div>
            </div>

            {/* Evidence Upload */}
            <div>
              <label className="block text-xs font-bold mb-2" style={{ color: '#8b949e', letterSpacing: '1px' }}>EVIDENCE / ATTACHMENTS</label>
              <div className="flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                style={{ background: '#0d1117', border: '1px dashed #30363d' }}>
                <FiUpload size={20} style={{ color: '#58a6ff' }} />
                <div>
                  <p className="text-sm" style={{ color: '#c9d1d9' }}>Click to upload or drag files</p>
                  <p className="text-xs" style={{ color: '#8b949e' }}>Screenshots, logs, documents (max 10MB)</p>
                </div>
              </div>
            </div>

            {/* Reporter */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: '#8b949e', letterSpacing: '1px' }}>REPORTER NAME</label>
                <input name="reporterName" value={form.reporterName} onChange={handleChange}
                  disabled={form.anonymous}
                  placeholder="Your name or alias"
                  className="w-full p-3 rounded-lg text-sm"
                  style={{ background: '#0d1117', border: '1px solid #30363d', color: form.anonymous ? '#4a5568' : '#c9d1d9', opacity: form.anonymous ? 0.5 : 1 }} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="anonymous" checked={form.anonymous} onChange={handleChange}
                    className="w-4 h-4 rounded" style={{ accentColor: '#58a6ff' }} />
                  <span className="text-sm" style={{ color: '#8b949e' }}>Submit Anonymously</span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-3 rounded-lg text-sm font-bold transition-all"
                style={{ background: '#0d1117', border: '1px solid #30363d', color: '#8b949e', letterSpacing: '1px' }}>
                CANCEL
              </button>
              <button type="submit"
                className="flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg, #bd2426, #8b0000)', color: '#fff', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(189,36,38,0.3)' }}>
                <FiSend size={16} />
                SUBMIT REPORT
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
