# AGENTS.md

FastAPI + React OSINT platform. Backend in `backend/`, Vite SPA in `frontend/`, deploy targets: Docker Compose, Render (`render.yaml`), GitHub Pages (`docs/`).

## Environment

- **Python 3.12 only** (`.python-version`). System `python3` is 3.14 and cannot build the pinned deps.
- A prepared venv exists at `backend/venv`. It has **no `pip` shim** — use `venv/bin/pip3`, and `venv/bin/python` for everything.
- If the venv is missing: `cd backend && python3.12 -m venv venv && venv/bin/pip3 install -r requirements-dev.txt`.
- Node 20+; `frontend/node_modules` is already installed.

## Commands

```bash
# Backend (run from backend/)
venv/bin/python -m pytest            # 30 tests, ~3s
venv/bin/python -m pytest tests/test_api.py::test_health_and_identity
venv/bin/uvicorn app.main:app --reload          # :8000, docs at /docs

# Frontend (run from frontend/)
npm run dev                          # :3000, proxies /api -> :8000
npm run build                        # output: frontend/dist (gitignored)
```

- `pytest.ini` sets `pythonpath=.` and `testpaths=tests`, so always run pytest from `backend/`.
- No frontend lint/test/typecheck scripts exist, despite the CI workflow calling `npm run lint || true`.
- Root `osint-launcher.sh` starts both servers and opens the dashboard.

## Architecture

- `backend/app/main.py` is the single FastAPI entrypoint: creates the app, mounts all routers under `/api/*`, and registers two evidence routes directly on `app`.
- `backend/app/routers/*` are thin HTTP layers; real work lives in `backend/app/services/*` (evidence store, URL investigation, breach scanning, media metadata).
- Persistence is split:
  - **SQLAlchemy async** models in `backend/app/models/` (SQLite by default at `backend/auosint.db`, Postgres via `DATABASE_URL`).
  - **File-based evidence** JSON in `backend/evidence/` and breach alerts in `backend/breach_alerts/`.
- `init_db()` uses `Base.metadata.create_all`; Alembic is a dependency but **no migrations exist** — schema changes require manual handling.
- Celery (`backend/app/celery_app.py`) uses Redis; beat schedule lives there.
- Frontend is a plain SPA (React Router); API calls go through `frontend/src/services/api.js` and the shared `frontend/src/services/http.js`.

## Non-obvious landmines (verified)

- **`get_db()` commits after `yield`.** Never use `async for db in get_db()`; it skips the commit and writes silently don't persist. This bug is still present in `routers/auth.py` and `routers/scan_history.py`. Use `Depends(get_db)` or `get_db_context()`.
- **Duplicate evidence route:** `app.get("/api/evidence/{evidence_id}")` in `main.py` shadows the router version in `routers/evidence.py` (the app-level route is registered first). Edit `main.py` for that path.
- **Rate limiting is not active:** `app.state.limiter` is set, but `SlowAPIMiddleware` is never added and no route has `@limiter.limit`.
- **API key auth is global and optional:** when `API_KEY` is set, *every* route requires `X-API-Key` — including `/health`, `/docs`, and `/api/auth/*`. The SPA sends it from `VITE_API_KEY`; these must match or all calls 401.
- **`DATABASE_URL` is normalized** in `config.py` (`postgres://`/`postgresql://` → `postgresql+asyncpg://`, `sslmode=` → `ssl=`). Don't re-add provider prefixes elsewhere.
- **`scan_tasks.py` imports nonexistent symbols** (`investigate_email`, `social_media_service.check_username`, `phone_lookup_service`), so those Celery tasks fail at import.
- **`routers/evidence.py` calls `.delay().get(timeout=30)` inside async handlers** — blocks the event loop and needs a live worker + Redis.
- **SSRF protection is partial:** `assert_public_host` checks only the initial URL; redirects and DNS rebinding are not revalidated, and some domain endpoints skip it.
- **Runtime data is tracked in git:** `backend/auosint.db`, `backend/evidence/*.json`, `backend/breach_alerts/*.json`. Treat as fixtures; don't delete or "clean" them.
- **CI is red on `ruff check .`** (~39 pre-existing errors). Run `ruff` yourself before assuming CI will pass; it is not installed in the venv (`venv/bin/pip3 install ruff`).
- **GitHub Pages is legacy branch deploy:** `master:/docs`, not Actions. `docs/` is a committed Vite build that nothing rebuilds automatically — rebuild it manually (command below), and remember `VITE_API_KEY` must be baked in for the hosted site to reach a key-protected API.

## Deploy / packaging notes

- Render: Postgres must be under root-level `databases:`, Redis/Key Value under `services: - type: keyvalue`. `render.yaml` is validated against Render's schema.
- `API_KEY` is `generateValue: true` and is synced into the static frontend via `fromService.envVarKey`. Anything baked into the SPA bundle is public — treat it as an abuse deterrent, not a secret.
- Rebuild GitHub Pages:
  ```bash
  cd frontend
  VITE_API_URL=https://advance-ultimate-osint-api.onrender.com npm run build -- --base=/TMCS-DASHBOARD/
  rm -rf ../docs && cp -r dist ../docs && touch ../docs/.nojekyll
  ```
- Docker Compose: nginx is behind the `production` profile; frontend build receives `VITE_API_KEY` from `API_KEY`.

## Conventions

- Product identity/version is duplicated in `backend/app/config.py` and `frontend/src/config.js` — update both together.
- Tests patch `evidence_store.EVIDENCE_DIR` and `breach_alerts.BREACH_ALERT_DIR` via a `tmp_path` fixture; keep new tests from writing into the tracked data dirs.
- No DB-backed tests exist for auth/scan/evidence routers, so transaction bugs pass CI.
