# 🛡️ OSINT TMC/CLARK — Cyber Intelligence Platform

> Advanced Open Source Intelligence gathering platform for cybersecurity professionals and penetration testers.

---

### 🚀 **[👉 CLICK HERE — LIVE DEMO](https://fajardoclark359-alt.github.io/cyber-intelligence-platform/)** 🚀

> ⬆️ **Open the TMCS Threat Monitoring Center Dashboard** — Real-time threat monitoring with 8 Philippine cybercrime categories, Wazuh-style UI, incident reporting, and live threat feed.

---

## Features

### Username OSINT
- Search 50+ platforms (GitHub, GitLab, Reddit, Twitter/X, Instagram, TikTok, YouTube, Twitch, Steam, Facebook, LinkedIn, Telegram, Discord, TryHackMe, HackTheBox, and more)
- Digital footprint evidence scoring
- Profile image collection
- Account timeline analysis

### Email OSINT
- HIBP breach and paste checking
- Social account discovery by email
- Gravatar profile lookup
- DNS/MX/SPF/DMARC analysis
- Disposable email detection
- Email age estimation
- Reputation scoring

### Phone OSINT
- 27 countries supported (US, PH, UK, CA, AU, DE, FR, JP, IN, CN, BR, MX, and more)
- Carrier detection
- Timezone identification
- Line type validation

### Domain Recon
- WHOIS lookup
- DNS enumeration (A, AAAA, MX, NS, TXT, CNAME, SOA)
- Subdomain discovery

### URL Investigation
- IP resolution (IPv4/IPv6)
- Exact geolocation with Google Maps link
- SSL certificate analysis
- Security headers check
- Technology stack detection
- Phishing/scam detection
- Redirect chain analysis
- Domain status (active/offline)
- Reputation scoring

### Media Forensics (NEW)
- Photo metadata scan: EXIF, camera make/model, timestamps, serials
- Video metadata scan: container tags, encoder, duration, resolution
- GPS extraction with Google Maps link + altitude
- Privacy risk score (0-100) with leak flags
- Report export: download JSON / printable HTML, copy JSON
- Evidence capture: save/view/export/delete reports with chain-of-custody hash

### 🛡️ TMCS — Threat Monitoring Center System (NEW)
- **Wazuh-style dashboard** — Enterprise security monitoring UI
- **8 Philippine Threat Categories:**
  - 🎰 Illegal Online Gambling
  - 💳 Financial Fraud
  - 🚨 OSAEC (Online Sexual Abuse & Exploitation of Children)
  - 🏛️ Threat to Government
  - 📰 Information Disorder
  - 💥 Violent Extremism
  - 📦 Illicit Trade Services
  - ⚠️ Unlawful Online Activities
- **Real-time threat feed** with live alerts
- **Incident reporting modal** with severity levels
- **System status monitoring** with uptime tracking
- **Severity breakdown** — Critical / High / Medium / Low / Info
- **Geographic threat origins** by Philippine region
- **DEFCON-style threat level indicator**

## Tech Stack

- **Backend**: Python FastAPI
- **Frontend**: React + Tailwind CSS
- **Deployment**: Docker + Docker Compose

## Quick Start

### Using Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/username/search` | POST | Search username across 50+ platforms |
| `/api/email/search` | POST | Email investigation with breach check |
| `/api/phone/lookup` | POST | Phone number lookup |
| `/api/domain/whois` | POST | WHOIS lookup |
| `/api/domain/dns` | POST | DNS enumeration |
| `/api/domain/subdomains` | POST | Subdomain discovery |
| `/api/url/investigate` | POST | Full URL investigation |
| `/api/media/analyze` | POST | Scan photo/video metadata (multipart upload) |
| `/api/media/evidence/capture` | POST | Save media report as evidence |
| `/api/media/evidence/list` | GET | List saved media reports |
| `/api/media/evidence/{id}` | GET | View a saved media report |
| `/api/media/evidence/{id}/export?format=json\|html` | GET | Export report as JSON or HTML |
| `/api/media/evidence/{id}` | DELETE | Delete a saved media report |

## Legal Disclaimer

This tool is intended for authorized security research and penetration testing only. Users are responsible for ensuring they have proper authorization before conducting any reconnaissance activities.

## Environment Variables

For production use:

```bash
# Have I Been Pwned API Key (optional, for breach checks)
HIBP_API_KEY=your_key_here
```

### GitHub Pages (frontend only)

The `gh-pages` branch hosts the built frontend. The API calls default to
same-origin `/api`, so the scan/investigation features need a reachable
backend. Point the frontend at a hosted backend at build time:

```bash
cd frontend
VITE_API_URL=https://your-backend-host:8000 npm run build -- --base=/cyber-intelligence-platform/
```

Without `VITE_API_URL`, the Media Forensics page reports
"Cannot reach backend API" instead of failing silently.
