# System Architecture

## Architecture Overview

VikasSetu is structured as a two-tier application:

1. **Frontend Client:** React 19 SPA running on Vite with TanStack Start/Router for file-based routing and SSR readiness.
2. **Backend Server:** Python FastAPI REST API with SQLAlchemy 2.0 ORM backed by SQLite 3.

```text
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│    TanStack Router (routes/) · StoreContext (lib/)     │
└───────────────────────────┬────────────────────────────┘
                            │ (Planned REST via api.ts)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│    Routers (routers/) · Score Derivation (services.py) │
└───────────────────────────┬────────────────────────────┘
                            │ SQLAlchemy 2.0 ORM
                            ▼
┌────────────────────────────────────────────────────────┐
│                  SQLite (vikassetu.db)                 │
│         children, activities, observations,            │
│               attendance, activity_logs                │
└────────────────────────────────────────────────────────┘
```

## Architectural Patterns & Decisions

1. **Dual State Pattern (Current Transition):**
   - Frontend currently uses client-side state in `src/lib/store.tsx` with `localStorage` persistence.
   - Target pattern: `src/lib/api.ts` handles network communication with optimistic updates / query caching, and `localStorage` acts as an offline cache.

2. **Dynamic Score Derivation Pattern:**
   - Observations are the single source of truth for child competence.
   - Scores are NOT stored as independent editable values; they are derived from the latest observation in each of the 5 domains.
   - Any create/update/delete operation on observations triggers `recalculate_child_scores()`.

3. **Domain Segregation:**
   - 5 Early Childhood Development Domains: `alphabet`, `numbers`, `colours`, `art`, `stories`.
   - All validation, models, and UI components enforce these domains strictly.

4. **Timezone Anchor:**
   - Daily attendance and dashboard metrics are explicitly evaluated against `Asia/Kolkata` time, avoiding UTC date boundary skew.
