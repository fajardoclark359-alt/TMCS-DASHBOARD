import axios from 'axios'

const API_BASE = '/api'

export const searchUsername = async (username) => {
  const response = await axios.post(`${API_BASE}/username/search`, { username })
  return response.data
}

export const searchEmail = async (email) => {
  const response = await axios.post(`${API_BASE}/email/search`, { email })
  return response.data
}

export const lookupPhone = async (phoneNumber, countryCode = 'US') => {
  const response = await axios.post(`${API_BASE}/phone/lookup`, { 
    phone_number: phoneNumber, 
    country_code: countryCode 
  })
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

export const subdomainEnum = async (domain) => {
  const response = await axios.post(`${API_BASE}/domain/subdomains`, { domain })
  return response.data
}

export const investigateURL = async (url) => {
  const response = await axios.post(`${API_BASE}/url/investigate`, { url })
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

export const exportEvidence = async (data) => {
  const response = await axios.post(`${API_BASE}/phone/evidence/export`, data)
  return response.data
}
