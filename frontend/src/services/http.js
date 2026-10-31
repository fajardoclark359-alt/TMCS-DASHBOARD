// Shared HTTP configuration for every backend call.
//
// VITE_API_URL points at a separately hosted backend (Render, GitHub Pages,
// etc.). When it is unset we fall back to a relative path so the Vite dev
// proxy / nginx proxy can forward requests.
//
// VITE_API_KEY mirrors the backend's API_KEY. It is injected into the bundle
// at build time, so treat it as an abuse-deterrent rather than a real secret.

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const API_KEY = import.meta.env.VITE_API_KEY || ''

export const API_BASE = `${API_ORIGIN}/api`

export const apiUrl = (path = '') => `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

export const apiHeaders = (extra = {}) => ({
  ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
  ...extra,
})
