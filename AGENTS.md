# ZONABET — Base44 Dev Environment

## Architecture
Fullstack single-origin app: `tsx server.ts` starts an Express API server with Vite in middleware mode on port 3000. The Vite dev server is embedded (no separate process), so frontend hot-reloads and API routes share one origin. No external data container or persistence is needed — the backend uses an in-memory `DataStore` (`backend/src/store/store.ts`) initialized with competitions, teams, and admin users.

## Running
- `docker compose -f docker-compose.base44.yml up -d` — starts the app on port 3000.
- The compose uses `node:22-alpine`, bind-mounts the source, runs `npm install` then `npm run dev` at startup.
- Health check: `GET /api/health` returns `{"status":"ok"}`.
- Frontend is served as live Vite source (not a prebuilt bundle), so edits hot-reload.

## Credentials (all optional)
The app boots without any external credentials. `JWT_SECRET` has a dev fallback. All are wired through compose `environment:` from `/run/base44/app.env`.

## Demo accounts (in-memory store)
- Admin: `admin@example.com` / `Admin123!ChangeMe`
- Admin: `jmachesso@zonabet.co.mz` / `872344381`
- Bettor accounts are created via the registration UI.

## Key files
- `server.ts` — entry point, wires Express + Vite middleware.
- `backend/src/app.ts` — Express app, routes registered under `/api` and root.
- `backend/src/store/store.ts` — in-memory store with initial data.
- `backend/src/config/index.ts` — config, JWT secret handling, bet limits.
- `src/App.tsx` — React frontend root.
- `vite.config.ts` — Vite + PWA + Tailwind config.
