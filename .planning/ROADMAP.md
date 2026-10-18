# Roadmap: VikasSetu — Observation & Recommendation Engine (Phase 1)

## Milestone 1: Observation & Recommendation Engine

**Lead:** Member 3 (Yash Desai)  
**Status:** In Planning  
**Coverage:** 15 requirements (REC-01 to REC-06, BACK-01 to BACK-06, UI-01 to UI-03)

---

### Phase 1: Pure Recommendation Engine (`src/lib/recommend.ts`)

**Goal:** Implement and test the core rule-based recommendation logic as a standalone pure function.

- **Tasks:**
  1. Create `src/lib/recommend.ts` defining:
     - Domain priority calculation (observed score 1 before 2, skipping 3).
     - Activity matching by domain, difficulty, and `forLevel`.
     - Deprioritization of previously successful activities (`tried_helped`).
     - Pedagogical explanation / reason generator.
  2. Create unit test suite in `src/test/recommend.test.ts` validating:
     - Lowest-scoring domain prioritization.
     - Unobserved domains handling.
     - Reason strings formatting.
- **Success Criteria:** Vitest test suite passes with 100% assertions on recommendation rules.

---

### Phase 2: Backend Hardening & Activity Logs Testing (`backend/`)

**Goal:** Harden the activity logs & activities endpoints and establish the backend test suite without touching shared modules.

- **Tasks:**
  1. Add validation rules to `ActivityLogCreate` in `backend/app/schemas.py`:
     - Step validation: `completed_steps <= total_steps` when `total_steps > 0`.
  2. Update `backend/app/routers/activity_logs.py`:
     - Explicit 404 responses for invalid `child_id` or `activity_id`.
     - Order query results by `ActivityLog.created_at.desc(), ActivityLog.id.desc()`.
  3. Create `backend/tests/conftest.py` with in-memory SQLite database engine and mock data.
  4. Create `backend/tests/test_activity_logs.py` covering:
     - 404 on unknown child/activity.
     - Valid log creation with 201 status.
     - Validation rejection on negative or overflowing step counts.
     - Query filtering by `child_id`.
  5. Document additive schema updates in `docs/BACKEND_CONTRACT.md`.
- **Success Criteria:** Pytest passes all test cases in `backend/tests/test_activity_logs.py`.

---

### Phase 3: Recommendations UI & Outcome Logging (`src/routes/recommendations.tsx`)

**Goal:** Elevate the recommendations page with the new pure engine, step-level activity logging, and resilient offline error handling.

- **Tasks:**
  1. Import and wire `generateRecommendations` from `src/lib/recommend.ts` in `src/routes/recommendations.tsx`.
  2. Implement interactive Activity Outcome modal / card actions:
     - Quick outcome buttons (`tried_helped`, `tried_needs_support`, `not_tried`).
     - Step progress checklist/slider.
     - Notes field.
  3. Add resilient fetch/save handler:
     - Attempts POST to `http://localhost:8000/api/activity-logs`.
     - If network/backend is unavailable, shows a friendly, non-blocking toast warning (`"Backend unavailable: Activity log saved locally/offline"`).
     - Page continues rendering even if backend is offline.
  4. Verify UI responsiveness on mobile and desktop viewports.
- **Success Criteria:** Teachers can see recommendations with clear reasons, try activities, and log outcomes with zero page crashes even if the backend is stopped.

---

### Phase 4: Review, Verification & Documentation Hand-off

**Goal:** Run full verification across frontend Vitest, backend Pytest, and manual UI walk-through.

- **Tasks:**
  1. Run `npm test` and `pytest`.
  2. Verify that `src/lib/store.tsx`, `src/lib/api.ts`, and untouched backend routers remain untouched.
  3. Update `docs/BACKEND_CONTRACT.md` and `PROJECT_CONTEXT.md` with final additive schemas.
- **Success Criteria:** Clean test pass, clean git diff confined strictly to Member 3 scope.
