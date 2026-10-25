# 🛡️ Advance Ultimate OSINT Tools

> OSINT, threat monitoring and digital forensics platform for cybersecurity professionals, incident responders and authorized penetration testers.

**Developer:** Clark Fajardo

---

### 🚀 **[👉 CLICK HERE — LIVE DEMO](https://fajardoclark359-alt.github.io/TMCS-DASHBOARD/)** 🚀

> ⬆️ Opens the hosted build in `docs/` — the OSINT modules plus the **TMCS Threat Monitoring Center** dashboard with 8 Philippine cybercrime categories, a live threat feed, and incident reporting.

The hosted build is frontend-only: investigation features need a reachable backend (see [Deployment](#deployment)).

---

## Features

### Username OSINT
- Search 50+ platforms (GitHub, GitLab, Reddit, Twitter/X, Instagram, TikTok, YouTube, Twitch, Steam, Facebook, LinkedIn, Telegram, Discord, TryHackMe, HackTheBox, and more)
- Concurrent platform checks with per-request timeouts
- Digital footprint evidence scoring, profile image collection, account timeline analysis

### Email OSINT
- HIBP breach and paste checking
- Social account discovery by email, Gravatar lookup
- DNS/MX/SPF/DMARC analysis, disposable-email detection, email age estimation, reputation scoring

### Phone OSINT
- 27 countries supported (US, PH, UK, CA, AU, DE, FR, JP, IN, CN, BR, MX, and more)
- Carrier detection, timezone identification, line type validation

### Domain Recon
- WHOIS lookup, DNS enumeration (A, AAAA, MX, NS, TXT, CNAME, SOA, SRV, CAA, DNSSEC records), subdomain discovery

### URL Investigation
- IP resolution (IPv4/IPv6), geolocation with map link, SSL certificate analysis
- Security headers, technology stack, phishing/scam heuristics, redirect chain, reputation scoring
- **SSRF protection** — loopback, private and link-local targets are refused by default

### Media Forensics
- Photo metadata (EXIF, camera make/model, timestamps, serials) and video metadata (container tags, encoder, duration, resolution)
- GPS extraction with map link + altitude, privacy risk score (0-100) with leak flags
- Report export: JSON / printable HTML, copy JSON
- Evidence capture with **verifiable chain-of-custody hashes**

### 🛡️ TMCS — Threat Monitoring Center System
- Wazuh-style dashboard with 8 Philippine threat categories (illegal online gambling, financial fraud, OSAEC, threats to government, information disorder, violent extremism, illicit trade services, unlawful online activities)
- Real-time threat feed, incident reporting, severity breakdown, regional origins, DEFCON-style threat level

---

## Tech Stack

- **Backend:** Python 3.12, FastAPI, Pydantic
- **Frontend:** React 18, Vite, Tailwind CSS
- **Deployment:** Docker Compose, Render, GitHub Pages

## Quick Start

Requires **Python 3.12** (the pinned dependencies have no wheels for 3.13/3.14).

### Backend

```bash
cd backend
uv venv --python 3.12 venv        # or: python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload     # http://localhost:8000  (docs at /docs)
```

### Frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:3000 (proxies /api to :8000)
```

### Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meta` | GET | Platform name, developer and version |
| `/health` | GET | Liveness probe |
| `/api/username/search` | POST | Search a username across 50+ platforms |
| `/api/email/search` | POST | Email investigation with breach check |
| `/api/phone/lookup` | POST | Phone number lookup |
| `/api/domain/whois` | POST | WHOIS lookup |
| `/api/domain/dns` | POST | DNS enumeration |
| `/api/domain/subdomains` | POST | Subdomain discovery |
| `/api/domain/footprint` | POST | Combined domain footprint |
| `/api/url/investigate` | POST | Full URL investigation |
| `/api/media/analyze` | POST | Scan photo/video metadata (multipart upload, 25 MB limit) |
| `/api/media/evidence/capture` | POST | Save a media report as evidence |
| `/api/media/evidence/list` | GET | List saved media reports |
| `/api/media/evidence/{id}` | GET | View a saved media report |
| `/api/media/evidence/{id}/export?format=json\|html` | GET | Export a report |
| `/api/media/evidence/{id}` | DELETE | Delete a saved report |
| `/api/evidence/{id}` | GET | Fetch any evidence record |
| `/api/evidence/{id}/verify` | GET | Recompute and verify the chain-of-custody hash |

`{username,email,phone,domain,url}/evidence/*` follow the same `capture / list / get / delete` shape. Unknown ids return `404`; invalid ids return `400`.

## Evidence & chain of custody

Every capture is stored as one JSON file in `backend/evidence/` (override with `EVIDENCE_DIR`):

- IDs are `EVD-<TYPE>-<UTC timestamp>-<random suffix>`, so concurrent captures never overwrite each other
- A SHA-256 hash is computed over the record and persisted inside it
- Files are written atomically and are owner-readable only (`0600`)
- `GET /api/evidence/{id}/verify` recomputes the hash and reports whether the record was modified

```bash
curl -s localhost:8000/api/evidence/EVD-MEDIA-20261025T101500-abc123/verify
# {"evidence_id": "...", "algorithm": "sha256", "stored_hash": "...", "computed_hash": "...", "verified": true}
```

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `HIBP_API_KEY` | – | Have I Been Pwned API key for breach checks |
| `EVIDENCE_DIR` | `backend/evidence` | Where evidence records are stored |
| `ALLOWED_ORIGINS` | localhost:3000/5173 + GitHub Pages | Comma-separated CORS allow-list |
| `ALLOW_PRIVATE_TARGETS` | `false` | Allow URL investigation of private/loopback hosts (lab use only) |
| `MAX_UPLOAD_BYTES` | `26214400` | Media upload limit |

## Deployment

### GitHub Pages (frontend only)

`docs/` is the published build. Rebuild it with:

```bash
cd frontend
VITE_API_URL=https://your-backend-host npm run build -- --base=/TMCS-DASHBOARD/
rm -rf ../docs && cp -r dist ../docs && touch ../docs/.nojekyll
```

Without `VITE_API_URL`, the frontend calls same-origin `/api` and the investigation pages report that the backend is unreachable.

### Render

`render.yaml` provisions the FastAPI backend; set `HIBP_API_KEY` in the dashboard if you want breach lookups.

## Legal Disclaimer

This tool is intended for authorized security research and penetration testing only. Users are responsible for ensuring they have proper authorization before conducting any reconnaissance activities, and for complying with applicable data-protection and privacy laws.
