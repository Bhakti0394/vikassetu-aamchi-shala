# VikasSetu — Aamchi Shala

## What This Is

A preschool and Anganwadi classroom support platform for government preschool teachers managing children aged 3–4. It provides single-tap daily attendance, observational assessment across five foundational learning domains, dynamic identification of children who need extra support, and play-based activity recommendations.

## Core Value

Empower preschool teachers with a lightweight, supportive, non-diagnostic companion that turns classroom observations into immediate, actionable learning activities so no child falls behind.

## Requirements

### Validated

- ✓ Modern React 19 UI with TanStack Start/Router for Dashboard, Children, Activities, Attendance, Recommendations, and Progress screens.
- ✓ FastAPI backend with SQLite schema, foreign key cascade rules, and 19 REST endpoints.
- ✓ Score derivation engine deriving competence from the latest observation in each of 5 domains.
- ✓ SQLite database initialized with baseline seed data (9 children, 11 activities, 51 observations, 144 attendance records).

### Active

- [ ] Connect React frontend (`src/lib/api.ts` & `store.tsx`) to the running FastAPI backend.
- [ ] Add backend automated test suite (`backend/tests/`) using Pytest and HTTPX.
- [ ] Implement offline caching and sync queue for low-connectivity Anganwadi environments.
- [ ] Define scope for next-generation features (e.g. Marathi/Hindi voice notes, parent WhatsApp report cards, Poshan Tracker nutrition tracking, multi-classroom auth).

### Out of Scope (Current Prototype)

- Formal medical or cognitive diagnostic labeling (explicitly prohibited by project philosophy).
- High-stakes examination or grading systems (preschool learning is play-based and formative).

## Context

- Originally prototyped as a classroom app UI and separate FastAPI contract.
- Backend is currently running live on `http://127.0.0.1:8000`.
- Frontend is currently running live on `http://localhost:5173` via Vite.
- Primary user persona: Anganwadi worker (Sevika) with limited time for administrative paperwork.

## Constraints

- **Tech Stack:** React 19 + TanStack Router (frontend), Python 3.10+ + FastAPI + SQLite (backend).
- **Timezone:** All daily attendance and dashboard aggregations must adhere strictly to `Asia/Kolkata`.
- **Preservation:** All existing UI layouts, styling, models, and database records must be preserved.

## Key Decisions

| Decision                              | Rationale                                                                                           | Outcome               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------- |
| Dynamic Score Derivation              | Scores reflect the latest classroom observation rather than arbitrary manual ratings.               | ✓ Good                |
| CamelCase API Serialization           | Keeps Python backend idiomatic (`snake_case`) while serving standard JavaScript JSON (`camelCase`). | ✓ Good                |
| Baseline Flag (`is_baseline`)         | Separates historical benchmark data from teacher-recorded activities done today.                    | ✓ Good                |
| Dual-layer State (API + LocalStorage) | Prepares app for offline-first operation in rural preschools.                                       | — Pending Integration |
