import axios from 'axios'

// '/api' by default (vite dev proxy + docker nginx). For GitHub Pages or a
// separately hosted backend, set VITE_API_URL, e.g. VITE_API_URL=https://my-backend.onrender.com
const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`

export const mediaExportUrl = (evidenceId, format = 'json') =>
  `${API_BASE}/media/evidence/${evidenceId}/export?format=${format}`

export const searchUsername = async (username) => {
  const response = await axios.post(`${API_BASE}/username/search`, { username })
  return response.data
}

export const captureUsernameEvidence = async (data) => {
  const response = await axios.post(`${API_BASE}/username/evidence/capture`, data)
  return response.data
}

export const listUsernameEvidence = async () => {
  const response = await axios.get(`${API_BASE}/username/evidence/list`)
  return response.data
}

export const getUsernameEvidence = async (evidenceId) => {
  const response = await axios.get(`${API_BASE}/username/evidence/${evidenceId}`)
  return response.data
}

export const deleteUsernameEvidence = async (evidenceId) => {
  const response = await axios.delete(`${API_BASE}/username/evidence/${evidenceId}`)
  return response.data
}

export const searchEmail = async (email) => {
  const response = await axios.post(`${API_BASE}/email/search`, { email })
  return response.data
}

export const captureEmailEvidence = async (data) => {
  const response = await axios.post(`${API_BASE}/email/evidence/capture`, data)
  return response.data
}

export const listEmailEvidence = async () => {
  const response = await axios.get(`${API_BASE}/email/evidence/list`)
  return response.data
}

export const getEmailEvidence = async (evidenceId) => {
  const response = await axios.get(`${API_BASE}/email/evidence/${evidenceId}`)
  return response.data
}

export const deleteEmailEvidence = async (evidenceId) => {
  const response = await axios.delete(`${API_BASE}/email/evidence/${evidenceId}`)
  return response.data
}

export const lookupPhone = async (phoneNumber, countryCode = 'US') => {
  const response = await axios.post(`${API_BASE}/phone/lookup`, { 
    phone_number: phoneNumber, 
    country_code: countryCode 
  })
  return response.data
}

export const captureEvidence = async (data) => {
  const response = await axios.post(`${API_BASE}/phone/evidence/capture`, data)
  return response.data
}

export const listEvidence = async () => {
  const response = await axios.get(`${API_BASE}/phone/evidence/list`)
  return response.data
}

export const getEvidence = async (evidenceId) => {
  const response = await axios.get(`${API_BASE}/phone/evidence/${evidenceId}`)
  return response.data
}

export const deleteEvidence = async (evidenceId) => {
  const response = await axios.delete(`${API_BASE}/phone/evidence/${evidenceId}`)
  return response.data
}

export const lookupDomain = async (domain) => {
  const [whoisResp, dnsResp] = await Promise.all([
    axios.post(`${API_BASE}/domain/whois`, { domain }),
    axios.post(`${API_BASE}/domain/dns`, { domain })
  ])
  return {
    whois: whoisResp.data,
    dns: dnsResp.data
  }
}

export const getDomainFootprint = async (domain) => {
  const response = await axios.post(`${API_BASE}/domain/footprint`, { domain })
  return response.data
}

export const subdomainEnum = async (domain) => {
  const response = await axios.post(`${API_BASE}/domain/subdomains`, { domain })
  return response.data
}

export const captureDomainEvidence = async (data) => {
  const response = await axios.post(`${API_BASE}/domain/evidence/capture`, data)
  return response.data
}

export const listDomainEvidence = async () => {
  const response = await axios.get(`${API_BASE}/domain/evidence/list`)
  return response.data
}

export const getDomainEvidence = async (evidenceId) => {
  const response = await axios.get(`${API_BASE}/domain/evidence/${evidenceId}`)
  return response.data
}

export const deleteDomainEvidence = async (evidenceId) => {
  const response = await axios.delete(`${API_BASE}/domain/evidence/${evidenceId}`)
  return response.data
}

export const investigateURL = async (url) => {
  const response = await axios.post(`${API_BASE}/url/investigate`, { url })
  return response.data
}

export const captureURLEvidence = async (data) => {
  const response = await axios.post(`${API_BASE}/url/evidence/capture`, data)
  return response.data
}

export const listURLEvidence = async () => {
  const response = await axios.get(`${API_BASE}/url/evidence/list`)
  return response.data
}

export const getURLEvidence = async (evidenceId) => {
  const response = await axios.get(`${API_BASE}/url/evidence/${evidenceId}`)
  return response.data
}

export const deleteURLEvidence = async (evidenceId) => {
  const response = await axios.delete(`${API_BASE}/url/evidence/${evidenceId}`)
  return response.data
}

export const analyzeMedia = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const response = await axios.post(`${API_BASE}/media/analyze`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const captureMediaEvidence = async (data) => {
  const response = await axios.post(`${API_BASE}/media/evidence/capture`, data)
  return response.data
}

export const listMediaEvidence = async () => {
  const response = await axios.get(`${API_BASE}/media/evidence/list`)
  return response.data
}

export const getMediaEvidence = async (evidenceId) => {
  const response = await axios.get(`${API_BASE}/media/evidence/${evidenceId}`)
  return response.data
}

export const deleteMediaEvidence = async (evidenceId) => {
  const response = await axios.delete(`${API_BASE}/media/evidence/${evidenceId}`)
  return response.data
}

// Client-side fallback — uses exifr in the browser, no backend needed
import { clientAnalyzeMedia as _clientAnalyzeMedia } from './clientExif'
export const clientAnalyzeMedia = _clientAnalyzeMedia
