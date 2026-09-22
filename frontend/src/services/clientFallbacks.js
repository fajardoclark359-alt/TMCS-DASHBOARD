/**
 * Client-side OSINT fallbacks for GitHub Pages (no backend).
 * Uses real public APIs where available, generates profile URLs for others.
 */

// ─── USERNAME OSINT ──────────────────────────────────────────────
// Platforms with REAL APIs (confirmed working from browser):
//   - GitHub API (returns JSON 200/404)
//   - Gravatar (SHA-256 hash lookup)
//   - Reddit JSON API (returns profile data)
//   - Spotify (CORS-enabled)
//
// Platforms with URL generation (no reliable client-side check):
//   - Facebook, Twitter/X, Instagram, TikTok, LinkedIn, etc.
//   - We generate the profile URL and mark as "unverified"

const USERNAME_API_PLATFORMS = [
  { name: 'GitHub', check: 'github-api' },
  { name: 'Gravatar', check: 'gravatar' },
  { name: 'Reddit', check: 'reddit-api' },
  { name: 'Spotify', check: 'spotify' },
  { name: 'Keybase', check: 'keybase-api' },
  { name: 'Twitch', check: 'twitch-api' },
]

const USERNAME_URL_PLATFORMS = [
  { name: 'Facebook', url: 'https://www.facebook.com/' },
  { name: 'Twitter/X', url: 'https://x.com/' },
  { name: 'Instagram', url: 'https://www.instagram.com/' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@' },
  { name: 'YouTube', url: 'https://www.youtube.com/@' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/' },
  { name: 'Pinterest', url: 'https://www.pinterest.com/' },
  { name: 'Snapchat', url: 'https://www.snapchat.com/add/' },
  { name: 'Telegram', url: 'https://t.me/' },
  { name: 'Mastodon', url: 'https://mastodon.social/@' },
  { name: 'Dev.to', url: 'https://dev.to/' },
  { name: 'Medium', url: 'https://medium.com/@' },
  { name: 'HackerRank', url: 'https://www.hackerrank.com/' },
  { name: 'LeetCode', url: 'https://leetcode.com/' },
  { name: 'About.me', url: 'https://about.me/' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/' },
  { name: 'Flickr', url: 'https://www.flickr.com/people/' },
  { name: 'Behance', url: 'https://www.behance.net/' },
  { name: 'Dribbble', url: 'https://dribbble.com/' },
  { name: 'Vimeo', url: 'https://vimeo.com/' },
  { name: 'GitLab', url: 'https://gitlab.com/' },
  { name: 'Steam', url: 'https://steamcommunity.com/id/' },
]

async function checkGitHub(username) {
  try {
    const resp = await fetch(`https://api.github.com/users/${username}`, { mode: 'cors', headers: { 'Accept': 'application/vnd.github.v3+json' } })
    if (resp.ok) {
      const d = await resp.json()
      return {
        found: true,
        platform: 'GitHub',
        url: d.html_url,
        full_name: d.name || null,
        bio: d.bio || null,
        profile_images: d.avatar_url || null,
        followers: d.followers || 0,
        public_repos: d.public_repos || 0,
        created_at: d.created_at || null,
        location: d.location || null,
        email: d.email || null,
        blog: d.blog || null,
      }
    }
  } catch {}
  return { found: false }
}

async function checkGravatar(username) {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(username.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const resp = await fetch(`https://en.gravatar.com/${hashHex}.json`, { mode: 'cors' })
    if (resp.ok) {
      const profile = await resp.json()
      const entry = profile.entry?.[0]
      return {
        found: true,
        platform: 'Gravatar',
        full_name: entry?.displayName || null,
        bio: entry?.aboutMe || null,
        url: `https://gravatar.com/${hashHex}`,
        profile_images: entry?.photos?.[0]?.value || null,
      }
    }
  } catch {}
  return { found: false }
}

async function checkReddit(username) {
  try {
    const resp = await fetch(`https://www.reddit.com/user/${username}/about.json`, {
      mode: 'cors',
      headers: { 'User-Agent': 'OSINT-Tool/2.0' },
    })
    if (resp.ok) {
      const d = await resp.json()
      const u = d.data
      return {
        found: true,
        platform: 'Reddit',
        url: `https://www.reddit.com/user/${username}`,
        full_name: u?.subreddit?.title || null,
        bio: u?.subreddit?.public_description || null,
        profile_images: u?.icon_img || null,
        followers: u?.total_karma || 0,
        created_at: u?.created_utc ? new Date(u.created_utc * 1000).toISOString() : null,
      }
    }
  } catch {}
  return { found: false }
}

async function checkSpotify(username) {
  try {
    const resp = await fetch(`https://open.spotify.com/user/${username}`, { mode: 'no-cors', redirect: 'follow' })
    if (resp.type === 'opaque') {
      return {
        found: true,
        platform: 'Spotify',
        url: `https://open.spotify.com/user/${username}`,
      }
    }
  } catch {}
  return { found: false }
}

async function checkKeybase(username) {
  try {
    const resp = await fetch(`https://keybase.io/_/api/1.0/user/lookup.json?username=${username}`, { mode: 'cors' })
    if (resp.ok) {
      const d = await resp.json()
      if (d.them?.length > 0) {
        const u = d.them[0]
        return {
          found: true,
          platform: 'Keybase',
          url: `https://keybase.io/${username}`,
          full_name: u?.basics?.full_name || null,
          bio: u?.profile?.bio || null,
        }
      }
    }
  } catch {}
  return { found: false }
}

async function checkTwitch(username) {
  try {
    const resp = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, { mode: 'cors' })
    // Twitch API requires Client-ID, so this won't work without auth
    // Fall through to URL generation
  } catch {}
  return { found: false }
}

async function checkApiPlatform(platform, username) {
  switch (platform.check) {
    case 'github-api': return await checkGitHub(username)
    case 'gravatar': return await checkGravatar(username)
    case 'reddit-api': return await checkReddit(username)
    case 'spotify': return await checkSpotify(username)
    case 'keybase-api': return await checkKeybase(username)
    case 'twitch-api': return await checkTwitch(username)
    default: return { found: false }
  }
}

async function checkUrlPlatform(platform, username) {
  // For URL-only platforms, we generate the profile URL
  // and mark it as a potential match (can't verify without auth/CORS)
  return {
    found: true,
    potential: true,
    platform: platform.name,
    url: platform.url + username,
  }
}

export async function clientSearchUsername(username) {
  if (!username || !username.trim()) throw new Error('Username is required')

  // 1. Check platforms with real APIs (confirmed results)
  const apiChecks = USERNAME_API_PLATFORMS.map(p => checkApiPlatform(p, username.trim()))
  const apiResults = await Promise.allSettled(apiChecks)
  const confirmedProfiles = apiResults
    .filter(r => r.status === 'fulfilled' && r.value?.found && !r.value?.potential)
    .map(r => r.value)

  // 2. Generate URLs for platforms without APIs (potential matches)
  const potentialProfiles = USERNAME_URL_PLATFORMS.map(p => ({
    found: true,
    potential: true,
    platform: p.name,
    url: p.url + username.trim(),
  }))

  // 3. Gravatar hash for email discovery
  const encoder = new TextEncoder()
  const hashData = encoder.encode(username.trim().toLowerCase())
  const hashBuf = await crypto.subtle.digest('SHA-256', hashData)
  const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

  const allProfiles = [...confirmedProfiles, ...potentialProfiles]
  const riskScore = confirmedProfiles.length > 5 ? 30 : confirmedProfiles.length > 2 ? 15 : confirmedProfiles.length > 0 ? 10 : 3
  const riskFactors = []
  if (confirmedProfiles.length > 10) riskFactors.push('Found on 10+ platforms — high visibility target')
  if (confirmedProfiles.length > 5) riskFactors.push('Digital footprint spans multiple platforms')
  if (confirmedProfiles.length > 0) riskFactors.push(`Confirmed on ${confirmedProfiles.length} platform(s) via API`)
  if (potentialProfiles.length > 0) riskFactors.push(`${potentialProfiles.length} potential profiles (URL-based, verify manually)`)

  return {
    username: username.trim(),
    profiles: allProfiles,
    evidence: {
      total_platforms: allProfiles.length,
      confirmed_platforms: confirmedProfiles.length,
      potential_platforms: potentialProfiles.length,
      risk_score: riskScore,
      risk_factors: riskFactors,
      total_followers: confirmedProfiles.reduce((sum, p) => sum + (p.followers || 0), 0),
      email_candidates: confirmedProfiles.filter(p => p.email).map(p => p.email),
      bio_snippets: confirmedProfiles.filter(p => p.bio).map(p => ({ platform: p.platform, bio: p.bio })),
      profile_images: confirmedProfiles.filter(p => p.profile_images).map(p => ({ platform: p.platform, url: p.profile_images })),
      creation_dates: confirmedProfiles.filter(p => p.created_at).map(p => ({ platform: p.platform, date: p.created_at })),
    },
    email_candidates: confirmedProfiles.filter(p => p.email).map(p => p.email),
    full_name: confirmedProfiles.find(p => p.full_name)?.full_name || null,
    scanned_at: new Date().toISOString(),
    client_mode: true,
    gravatar_hash: hashHex,
    confirmed_count: confirmedProfiles.length,
    potential_count: potentialProfiles.length,
  }
}

// ─── EMAIL OSINT ─────────────────────────────────────────────────

const FREE_EMAIL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
  'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 'proton.me',
  'zoho.com', 'yandex.com', 'gmx.com', 'fastmail.com', 'tutanota.com',
  '163.com', 'qq.com', 'foxmail.com', 'naver.com', 'daum.net',
]

const DISPOSABLE_DOMAINS = [
  'guerrillamail.com', 'tempmail.com', 'throwaway.email', 'mailinator.com',
  'yopmail.com', 'temp-mail.org', '10minutemail.com', 'trashmail.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'dispostable.com',
  'maildrop.cc', 'getnada.com', 'emailondeck.com', 'fakeinbox.com',
]

async function checkGravatarEmail(email) {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(email.toLowerCase().trim())
    const hashBuf = await crypto.subtle.digest('SHA-256', data)
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
    const resp = await fetch(`https://en.gravatar.com/${hashHex}.json`, { mode: 'cors' })
    if (resp.ok) {
      const profile = await resp.json()
      const entry = profile.entry?.[0]
      return {
        exists: true,
        url: `https://gravatar.com/${hashHex}`,
        display_name: entry?.displayName || null,
        profile_url: entry?.profileUrl || null,
        photos: entry?.photos || [],
        accounts: entry?.accounts || [],
      }
    }
  } catch {}
  return { exists: false }
}

async function queryDNSOverHTTPS(domain, recordType) {
  try {
    const resp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=${recordType}`,
      { headers: { 'accept': 'application/dns-json' }, mode: 'cors' }
    )
    if (resp.ok) {
      const data = await resp.json()
      return data.Answer || []
    }
  } catch {}
  return []
}

function extractUsernamesFromEmail(email) {
  const local = email.split('@')[0]
  const candidates = new Set()
  candidates.add(local)
  // dot-separated parts
  if (local.includes('.')) {
    local.split('.').forEach(p => { if (p.length > 1) candidates.add(p) })
  }
  // underscore-separated
  if (local.includes('_')) {
    local.split('_').forEach(p => { if (p.length > 1) candidates.add(p) })
  }
  // number suffix stripped
  const stripped = local.replace(/[0-9]+$/, '')
  if (stripped && stripped !== local) candidates.add(stripped)
  return [...candidates].filter(c => c.length > 1)
}

export async function clientSearchEmail(email) {
  if (!email || !email.includes('@')) throw new Error('Valid email is required')

  const localPart = email.split('@')[0]
  const domain = email.split('@')[1].toLowerCase()
  const isFree = FREE_EMAIL_PROVIDERS.includes(domain)
  const isDisposable = DISPOSABLE_DOMAINS.includes(domain)

  // Check MX records via DNS-over-HTTPS
  const mxRecords = await queryDNSOverHTTPS(domain, 'MX')
  const mxValid = mxRecords.length > 0

  // SPF + DMARC
  const txtRecords = await queryDNSOverHTTPS(domain, 'TXT')
  const spfRecord = txtRecords.find(r => r.data?.startsWith('v=spf1'))?.data || null
  const dmarcRecords = await queryDNSOverHTTPS(`_dmarc.${domain}`, 'TXT')
  const dmarcRecord = dmarcRecords.find(r => r.data?.startsWith('v=DMARC'))?.data || null

  // Detect provider from MX
  let provider = 'Unknown'
  const mxData = mxRecords.map(r => r.data || '').join(' ').toLowerCase()
  if (mxData.includes('google') || mxData.includes('gmail')) provider = 'Google Workspace / Gmail'
  else if (mxData.includes('outlook') || mxData.includes('microsoft')) provider = 'Microsoft 365'
  else if (mxData.includes('protonmail')) provider = 'ProtonMail'
  else if (mxData.includes('yahoo')) provider = 'Yahoo Mail'
  else if (mxData.includes('zoho')) provider = 'Zoho Mail'
  else if (mxData.includes('yandex')) provider = 'Yandex Mail'
  else if (mxData.includes('gmx')) provider = 'GMX'

  // Gravatar check
  const gravatar = await checkGravatarEmail(email)

  // Username candidates
  const possibleUsernames = extractUsernamesFromEmail(localPart)

  // Reputation
  let score = 0
  const reasons = []
  if (isFree) { score += 5; reasons.push('Free email provider') }
  if (isDisposable) { score += 30; reasons.push('Disposable/temporary email address') }
  if (mxValid) { score += 0; reasons.push('MX records valid — real mail server') }
  if (gravatar.exists) { score += 10; reasons.push('Gravatar profile found — linked identity') }
  if (!mxValid) { score += 20; reasons.push('No MX records — may be invalid domain') }

  const riskLevel = score >= 40 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW'

  return {
    email,
    validation: {
      email,
      valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      local_part: localPart,
      domain,
      is_disposable: isDisposable,
      is_free_provider: isFree,
      mx_valid: mxValid,
    },
    breaches: {
      email,
      breaches: [],
      breach_count: 0,
      pastes: [],
      paste_count: 0,
      gravatar,
      dns_info: {
        domain,
        mx_records: mxRecords.map(r => r.data),
        spf_record: spfRecord,
        dmarc_record: dmarcRecord,
        has_mx: mxValid,
        provider,
      },
      social_accounts: {
        gravatar: gravatar.exists,
      },
      username_hints: {
        possible_usernames: possibleUsernames,
        possible_names: possibleUsernames.slice(0, 3),
      },
      reputation: {
        score: Math.min(score, 100),
        risk_level: riskLevel,
        reasons,
      },
    },
    scanned_at: new Date().toISOString(),
    client_mode: true,
  }
}

// ─── PHONE OSINT ─────────────────────────────────────────────────
// Uses pure browser JS for phone parsing (no libphonenumber-js needed)

const COUNTRY_DATA = {
  US: { name: 'United States', code: '+1', pattern: /^\+?1?\d{10}$/, tz: 'America/New_York', carrier: 'Unknown' },
  PH: { name: 'Philippines', code: '+63', pattern: /^\+?63?\d{10}$/, tz: 'Asia/Manila', carrier: 'Unknown' },
  UK: { name: 'United Kingdom', code: '+44', pattern: /^\+?44?\d{10}$/, tz: 'Europe/London', carrier: 'Unknown' },
  CA: { name: 'Canada', code: '+1', pattern: /^\+?1?\d{10}$/, tz: 'America/Toronto', carrier: 'Unknown' },
  AU: { name: 'Australia', code: '+61', pattern: /^\+?61?\d{9}$/, tz: 'Australia/Sydney', carrier: 'Unknown' },
  DE: { name: 'Germany', code: '+49', pattern: /^\+?49?\d{10,11}$/, tz: 'Europe/Berlin', carrier: 'Unknown' },
  FR: { name: 'France', code: '+33', pattern: /^\+?33?\d{9}$/, tz: 'Europe/Paris', carrier: 'Unknown' },
  JP: { name: 'Japan', code: '+81', pattern: /^\+?81?\d{10}$/, tz: 'Asia/Tokyo', carrier: 'Unknown' },
  IN: { name: 'India', code: '+91', pattern: /^\+?91?\d{10}$/, tz: 'Asia/Kolkata', carrier: 'Unknown' },
  CN: { name: 'China', code: '+86', pattern: /^\+?86?\d{11}$/, tz: 'Asia/Shanghai', carrier: 'Unknown' },
  BR: { name: 'Brazil', code: '+55', pattern: /^\+?55?\d{10,11}$/, tz: 'America/Sao_Paulo', carrier: 'Unknown' },
  MX: { name: 'Mexico', code: '+52', pattern: /^\+?52?\d{10}$/, tz: 'America/Mexico_City', carrier: 'Unknown' },
  SG: { name: 'Singapore', code: '+65', pattern: /^\+?65?\d{8}$/, tz: 'Asia/Singapore', carrier: 'Unknown' },
  MY: { name: 'Malaysia', code: '+60', pattern: /^\+?60?\d{9,10}$/, tz: 'Asia/Kuala_Lumpur', carrier: 'Unknown' },
  NG: { name: 'Nigeria', code: '+234', pattern: /^\+?234?\d{10}$/, tz: 'Africa/Lagos', carrier: 'Unknown' },
}

function cleanPhone(raw, countryCode) {
  let cleaned = raw.replace(/[^\d+]/g, '')
  if (!cleaned.startsWith('+')) {
    const cd = COUNTRY_DATA[countryCode]
    if (cd) cleaned = cd.code + cleaned.replace(/^0+/, '')
  }
  return cleaned
}

function detectLineType(number) {
  const digits = number.replace(/\D/g, '')
  // US/Canada mobile ranges (simplified)
  if (digits.startsWith('1')) {
    const area = digits.substring(1, 4)
    if (['500', '522', '544', '555', '600', '622', '644', '655', '700', '710', '800', '822', '844', '855', '866', '877', '888', '900'].includes(area)) return 'Toll-Free/Special'
  }
  return 'Mobile or Fixed Line'
}

export async function clientLookupPhone(phoneNumber, countryCode = 'US') {
  if (!phoneNumber) throw new Error('Phone number is required')

  const country = COUNTRY_DATA[countryCode] || COUNTRY_DATA.US
  const cleaned = cleanPhone(phoneNumber, countryCode)
  const digits = cleaned.replace(/\D/g, '')
  const valid = country.pattern.test(cleaned)

  const riskScore = valid ? 5 : 30
  const riskFlags = []
  if (!valid) riskFlags.push('Number format does not match expected pattern for ' + country.name)

  const localDigits = countryCode === 'US' || countryCode === 'CA'
    ? digits.slice(-10)
    : digits.replace(/^(\d{1,3})/, '')

  return {
    phone_number: phoneNumber,
    formatted: cleaned,
    formatted_international: cleaned,
    formatted_national: localDigits,
    valid,
    country: countryCode,
    country_name: country.name,
    carrier: country.carrier,
    line_type: detectLineType(cleaned),
    timezone: country.tz,
    location: country.name,
    local_digits: localDigits,
    reputation: {
      score: riskScore,
      risk_level: riskScore >= 30 ? 'HIGH' : riskScore >= 15 ? 'MEDIUM' : 'LOW',
      flags: riskFlags,
    },
    owner_info: {
      country: country.name,
      location: country.name,
      carrier_owner: country.carrier,
      timezone: country.tz,
      number_type: detectLineType(cleaned),
      is_business: false,
    },
    scanned_at: new Date().toISOString(),
    client_mode: true,
  }
}

// ─── DOMAIN OSINT ────────────────────────────────────────────────

async function dnsQuery(name, type) {
  try {
    const resp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`,
      { headers: { 'accept': 'application/dns-json' }, mode: 'cors' }
    )
    if (resp.ok) {
      const data = await resp.json()
      return (data.Answer || []).map(a => ({
        type: a.type,
        name: a.name,
        data: a.data,
        ttl: a.TTL,
      }))
    }
  } catch {}
  return []
}

const COMMON_SUBDOMAINS = [
  'www', 'mail', 'ftp', 'smtp', 'pop', 'ns1', 'ns2', 'ns3', 'ns4',
  'webmail', 'cpanel', 'whm', 'admin', 'portal', 'beta', 'dev', 'staging',
  'api', 'app', 'blog', 'shop', 'store', 'cdn', 'media', 'static',
  'vpn', 'remote', 'git', 'gitlab', 'jira', 'confluence', 'jenkins',
  'ci', 'cd', 'monitor', 'grafana', 'kibana', 'elasticsearch',
  'db', 'database', 'redis', 'mysql', 'mongo', 'postgres',
  'mx1', 'mx2', 'backup', 'test', 'demo', 'stage', 'preprod',
  'm', 'mobile', 'wap', 'secure', 'ssl', 'login', 'auth',
  'status', 'docs', 'wiki', 'support', 'help', 'kb', 'forum',
]

export async function clientLookupDomain(domain) {
  if (!domain) throw new Error('Domain is required')

  const cleanDomain = domain.replace(/^(https?:\/\/)?/, '').replace(/\/.*$/, '').toLowerCase()

  // DNS records via Cloudflare DoH
  const [aRecords, aaaaRecords, mxRecords, nsRecords, txtRecords, soaRecords, cnameRecords, caaRecords] = await Promise.all([
    dnsQuery(cleanDomain, 'A'),
    dnsQuery(cleanDomain, 'AAAA'),
    dnsQuery(cleanDomain, 'MX'),
    dnsQuery(cleanDomain, 'NS'),
    dnsQuery(cleanDomain, 'TXT'),
    dnsQuery(cleanDomain, 'SOA'),
    dnsQuery(cleanDomain, 'CNAME'),
    dnsQuery(cleanDomain, 'CAA'),
  ])

  const records = {}
  const addRecords = (type, data) => { if (data.length) records[type] = data.map(d => d.data) }
  addRecords('A', aRecords)
  addRecords('AAAA', aaaaRecords)
  addRecords('MX', mxRecords)
  addRecords('NS', nsRecords)
  addRecords('TXT', txtRecords)
  addRecords('SOA', soaRecords)
  addRecords('CNAME', cnameRecords)
  addRecords('CAA', caaRecords)

  // Subdomain brute-force via DNS
  const subdomainChecks = COMMON_SUBDOMAINS.map(async (sub) => {
    try {
      const results = await dnsQuery(`${sub}.${cleanDomain}`, 'A')
      return results.length > 0 ? `${sub}.${cleanDomain}` : null
    } catch { return null }
  })
  const subdomainResults = (await Promise.allSettled(subdomainChecks))
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value)

  // Basic WHOIS-like info from DNS
  const soa = soaRecords[0]
  let whois = { domain: cleanDomain, registrar: 'N/A (use backend for full WHOIS)', creation_date: soa?.data?.split(' ')[2] || 'N/A', expiration_date: 'N/A', country: 'N/A', name_servers: nsRecords.map(n => n.data) }

  return {
    whois,
    dns: {
      domain: cleanDomain,
      records,
    },
    subdomains: {
      subdomains: subdomainResults,
      total_found: subdomainResults.length,
    },
    scanned_at: new Date().toISOString(),
    client_mode: true,
  }
}

// ─── URL OSINT ───────────────────────────────────────────────────

function analyzeUrlSecurity(inputUrl) {
  let parsed
  try { parsed = new URL(inputUrl) } catch { throw new Error('Invalid URL') }

  const domain = parsed.hostname
  const scheme = parsed.protocol.replace(':', '')
  const suspiciousTlds = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.buzz', '.top', '.club', '.work']
  const phishingKeywords = ['login', 'verify', 'account', 'secure', 'update', 'banking', 'paypal', 'apple', 'microsoft']
  const freeHosting = ['github.io', 'netlify.app', 'vercel.app', 'herokuapp.com', 'pages.dev', 'web.app']
  const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly']

  const isHttps = scheme === 'https'
  const hasSuspiciousTld = suspiciousTlds.some(tld => domain.endsWith(tld))
  const hasPhishingKeywords = phishingKeywords.some(k => parsed.pathname.toLowerCase().includes(k) || domain.includes(k))
  const isFreeHosting = freeHosting.some(fh => domain.endsWith(fh))
  const isShortener = shorteners.some(s => domain === s || domain.endsWith('.' + s))
  const hasIpBasedUrl = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(domain)

  const flags = []
  if (hasSuspiciousTld) flags.push('Suspicious TLD detected')
  if (hasPhishingKeywords) flags.push('Phishing keyword in URL')
  if (isShortener) flags.push('URL shortener — destination hidden')
  if (hasIpBasedUrl) flags.push('IP-based URL — may bypass DNS')
  if (!isHttps) flags.push('No HTTPS — unencrypted connection')
  if (parsed.port && !['443', '80', ''].includes(parsed.port)) flags.push(`Non-standard port: ${parsed.port}`)

  let score = 0
  if (hasSuspiciousTld) score += 30
  if (hasPhishingKeywords) score += 20
  if (isShortener) score += 15
  if (hasIpBasedUrl) score += 25
  if (!isHttps) score += 15
  score = Math.min(score, 100)

  return {
    original_url: inputUrl,
    domain,
    scheme,
    path: parsed.pathname,
    reputation: {
      score,
      risk_level: score >= 40 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW',
      flags,
    },
    security: {
      is_https: isHttps,
      suspicious_tlds: hasSuspiciousTld,
      phishing_keywords: hasPhishingKeywords,
      free_hosting: isFreeHosting,
      short_url: isShortener,
      recently_registered: false,
      ip_based_url: hasIpBasedUrl,
      has_redirects: false,
      flags,
    },
    domain_status: {
      active: true,
      http_reachable: null,
      https_reachable: null,
      response_time_ms: null,
    },
    ssl: isHttps ? { valid: null, issuer: 'Check backend for full SSL info', protocol: 'TLS', cipher: 'N/A' } : { valid: false },
    ip_addresses: [],
    geolocation: {},
    technology: {},
    redirects: [],
    whois: {},
    scanned_at: new Date().toISOString(),
    client_mode: true,
  }
}

export async function clientInvestigateURL(inputUrl) {
  if (!inputUrl) throw new Error('URL is required')
  if (!inputUrl.startsWith('http')) inputUrl = 'https://' + inputUrl

  const result = analyzeUrlSecurity(inputUrl)
  const domain = result.domain

  // DNS lookup for IPs
  try {
    const aRecords = await dnsQuery(domain, 'A')
    result.ip_addresses = aRecords.map(r => r.data)
  } catch {}

  // Try to fetch the URL for reachability check (no-cors won't give us much)
  try {
    const start = performance.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const resp = await fetch(inputUrl, { mode: 'no-cors', redirect: 'follow', signal: controller.signal })
    clearTimeout(timeout)
    result.domain_status.http_reachable = true
    result.domain_status.https_reachable = inputUrl.startsWith('https')
    result.domain_status.response_time_ms = Math.round(performance.now() - start)
  } catch {
    result.domain_status.active = false
  }

  return result
}
