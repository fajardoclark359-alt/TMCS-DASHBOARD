import { useState } from 'react'
import { lookupPhone } from '../services/api'
import { FiSearch, FiCheck, FiX, FiTerminal, FiPhone } from 'react-icons/fi'

function PhoneSearch() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!phoneNumber) return
    setLoading(true)
    try {
      const data = await lookupPhone(phoneNumber, countryCode)
      setResults(data)
    } catch (err) {
      console.error(err)
      alert('Error looking up phone')
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FiTerminal className="text-green-400" />
          <h1 className="title-cyber text-2xl font-bold text-green-400 glow-text">PHONE OSINT</h1>
        </div>
        <p className="text-slate-500 text-sm font-mono ml-7">Phone intelligence - 27 countries, carrier, timezone analysis</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
          className="bg-slate-900/50 rounded px-3 py-3 font-mono text-sm cyber-border">
          <option value="US">US (+1)</option>
          <option value="PH">PH (+63)</option>
          <option value="UK">UK (+44)</option>
          <option value="CA">CA (+1)</option>
          <option value="AU">AU (+61)</option>
          <option value="DE">DE (+49)</option>
          <option value="FR">FR (+33)</option>
          <option value="JP">JP (+81)</option>
          <option value="IN">IN (+91)</option>
          <option value="CN">CN (+86)</option>
          <option value="BR">BR (+55)</option>
          <option value="MX">MX (+52)</option>
          <option value="KR">KR (+82)</option>
          <option value="IT">IT (+39)</option>
          <option value="ES">ES (+34)</option>
          <option value="NL">NL (+31)</option>
          <option value="SG">SG (+65)</option>
          <option value="MY">MY (+60)</option>
          <option value="TH">TH (+66)</option>
          <option value="VN">VN (+84)</option>
          <option value="ID">ID (+62)</option>
          <option value="NG">NG (+234)</option>
          <option value="ZA">ZA (+27)</option>
          <option value="AE">AE (+971)</option>
          <option value="SA">SA (+966)</option>
          <option value="PK">PK (+92)</option>
          <option value="BD">BD (+880)</option>
        </select>
        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="$ enter-target-phone..."
          className="flex-1 font-mono text-sm px-4 py-3" />
        <button type="submit" disabled={loading}
          className="btn-cyber px-6 py-3 rounded flex items-center gap-2 text-sm">
          <FiSearch /> {loading ? 'LOOKING UP...' : 'ENUMERATE'}
        </button>
      </form>

      {results && (
        <div className="card-cyber p-5 rounded-lg">
          <h2 className="title-cyber text-lg font-bold mb-4 flex items-center gap-2 text-green-400"><FiPhone /> PHONE INTELLIGENCE</h2>

          {results.error && (
            <p className="text-red-400 text-sm font-mono mb-4">! {results.error}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/50 p-3 rounded cyber-border">
              <p className="text-[10px] text-slate-500 font-mono mb-1">NUMBER</p>
              <p className="font-mono text-sm text-white">{results.phone_number}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded cyber-border">
              <p className="text-[10px] text-slate-500 font-mono mb-1">E.164 FORMAT</p>
              <p className="font-mono text-sm text-green-400">{results.formatted || 'N/A'}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded cyber-border">
              <p className="text-[10px] text-slate-500 font-mono mb-1">VALID</p>
              <p className={`text-sm font-mono font-bold ${results.valid ? 'text-green-400' : 'text-red-400'}`}>
                {results.valid ? <span className="flex items-center gap-1"><FiCheck /> VALID</span> : <span className="flex items-center gap-1"><FiX /> INVALID</span>}
              </p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded cyber-border">
              <p className="text-[10px] text-slate-500 font-mono mb-1">COUNTRY</p>
              <p className="font-mono text-sm text-white">{results.country_name || results.country || 'Unknown'}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded cyber-border">
              <p className="text-[10px] text-slate-500 font-mono mb-1">CARRIER</p>
              <p className="font-mono text-sm text-cyan-400">{results.carrier || 'Unknown'}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded cyber-border">
              <p className="text-[10px] text-slate-500 font-mono mb-1">LINE TYPE</p>
              <p className="font-mono text-sm text-white">{results.line_type || 'Unknown'}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded cyber-border">
              <p className="text-[10px] text-slate-500 font-mono mb-1">TIMEZONE</p>
              <p className="font-mono text-sm text-yellow-400">{results.timezone || 'Unknown'}</p>
            </div>
            <div className="bg-slate-900/50 p-3 rounded cyber-border">
              <p className="text-[10px] text-slate-500 font-mono mb-1">COUNTRY CODE</p>
              <p className="font-mono text-sm text-white">{results.country || 'Unknown'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PhoneSearch
