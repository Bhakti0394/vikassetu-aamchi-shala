# Requirements: VikasSetu — Observation & Recommendation Engine (Member 3)

**Defined:** 2026-10-18  
**Module Owner:** Member 3 (Yash Desai)  
**Core Value:** Provide preschool teachers with explainable, rule-based activity recommendations and guided activity-log outcome tracking that works seamlessly online or offline.

---

## Boundaries & Constraints (Strict)

- **Allowed Frontend Changes:**
  - `src/lib/recommend.ts` (New module: pure recommendation engine)
  - `src/routes/recommendations.tsx` (Enhanced recommendations UI with activity logging and resilient offline behavior)
  - Any dedicated helper/test files for recommendation logic
- **Prohibited Frontend Changes:**
  - DO NOT edit `src/lib/store.tsx` (Owned by backend/store lead)
  - DO NOT create `src/lib/api.ts` (Owned by backend/store lead)
- **Allowed Backend Changes:**
  - `backend/app/routers/activity_logs.py`
  - `backend/app/routers/activities.py`
  - Activity & ActivityLog schemas in `backend/app/schemas.py`
  - `backend/tests/test_activity_logs.py` & testing fixtures
  - Documentation updates in `docs/BACKEND_CONTRACT.md` (additive only)
- **Prohibited Backend Changes:**
  - DO NOT touch `observations.py`, `children.py`, `attendance.py`, `dashboard.py`
  - DO NOT touch `recalculate_child_scores` or score derivation in `backend/app/services.py`
  - DO NOT alter any shared database table or columns

---

## Phase 1 Requirements

### 1. Pure Recommendation Engine (`src/lib/recommend.ts`)

- [ ] **REC-01**: Pure function `generateRecommendations(child, activities, pastLogs?, observations?)` that accepts generic objects and runs independently of any specific data store.
- [ ] **REC-02**: Prioritizes domains where the child has an observed score of 1 ("Needs Support"), followed by score 2 ("Developing").
- [ ] **REC-03**: Matches activities with appropriate difficulty and `forLevel` matching the child's current domain level.
- [ ] **REC-04**: Filters or deprioritizes activities recently logged with `tried_helped` (already mastered) in favor of fresh activities.
- [ ] **REC-05**: Generates human-readable, supportive pedagogical reasons for each recommendation (e.g., _"Recommended because Aarav needs extra support in Number recognition and this activity uses tactile counting"_).
- [ ] **REC-06**: Unit tests in Vitest validating recommendation matching, tie-breaking, and reason generation.

### 2. Backend Hardening & Testing (`backend/`)

- [ ] **BACK-01**: In `backend/app/routers/activity_logs.py`, enforce validation:
  - `completed_steps >= 0` and `total_steps >= 0`
  - `completed_steps <= total_steps` (if `total_steps > 0`)
  - `outcome` strictly in `('tried_helped', 'tried_needs_support', 'not_tried')`
- [ ] **BACK-02**: Return HTTP `404 Not Found` with clear detail when `child_id` or `activity_id` does not exist.
- [ ] **BACK-03**: Order activity logs newest-first (`created_at desc, id desc`).
- [ ] **BACK-04**: In `backend/app/routers/activities.py`, ensure domain filtering and 404 for unknown activity ID are robust.
- [ ] **BACK-05**: Create `backend/tests/test_activity_logs.py` covering:
  - Creation of valid activity log
  - Rejection of non-existent child / activity (404)
  - Rejection of invalid outcome / step count (422)
  - Newest-first ordering in `GET /api/activity-logs`
  - Filter by `child_id` query param
- [ ] **BACK-06**: Document any schema/behavior updates in `docs/BACKEND_CONTRACT.md`.

### 3. Recommendations Page & Outcome Tracking (`src/routes/recommendations.tsx`)

- [ ] **UI-01**: Display recommendations powered by `src/lib/recommend.ts` with prominent "Why this activity?" explanation cards.
- [ ] **UI-02**: Allow the teacher to log activity outcomes directly from the recommendation card:
  - Outcome selector: "Helped Child" (`tried_helped`), "Needs More Support" (`tried_needs_support`), "Not Tried" (`not_tried`).
  - Step progress tracker (`completed_steps` / `total_steps`).
  - Optional observational note.
- [ ] **UI-03**: Offline & Resilience Safety:
  - If backend is offline or unreachable, page continues to render recommendations without crashing.
  - If saving an activity log fails due to network or backend unavailability, display a non-blocking toast/alert notification with the error rather than crashing the page.

---

## Out of Scope for Phase 1

- Modifying `store.tsx` or introducing a global `api.ts` (reserved for store/backend owner).
- Changes to attendance, children CRUD, or dashboard routers.
- Diagnostic labeling or automated child scoring changes.
