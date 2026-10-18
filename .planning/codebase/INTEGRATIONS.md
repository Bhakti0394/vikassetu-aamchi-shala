# Integrations & External Services

## Current Integrations

### Internal Frontend ↔ Backend Integration (Bridge)

- **Status:** Specified in `docs/BACKEND_CONTRACT.md` but pending implementation in `src/lib/api.ts`.
- **Target Backend API Base:** `http://localhost:8000/api` (configurable via `VITE_API_URL`).
- **CORS Configuration:** Configured in `backend/app/main.py` allowing origins `localhost:5173`, `localhost:8080`, `localhost:3000`.

### Client Storage & Offline Fallback

- **Browser LocalStorage:** `KEY = "vikassetu-v1"` in `src/lib/store.tsx`.
- **Persistence Pattern:** Initialized with static seed data (`SEED_CHILDREN`, `SEED_OBSERVATIONS`), synced to `localStorage` on change.

### External APIs & 3rd Party Services

- **None currently integrated.** The application is strictly local/offline-first.
- **Potential future integrations:**
  - WhatsApp Business API (Parent report card dispatch)
  - Poshan Tracker / National Early Childhood portals (Nutrition & health tracking)
  - Web Speech API / Whisper (Marathi/Hindi voice observation transcription)
