# Product Requirements Document (PRD): VikasSetu — Observation & Recommendation Engine

**Project:** VikasSetu — Aamchi Shala  
**Module:** Observation & Recommendation Engine & Activity Logs (Member 3: Yash Desai)  
**Target User:** Government preschool / Anganwadi teachers managing children aged 3–4  
**Status:** Completed (Phase 1 Executed & Verified)

---

## 1. Objective & Value Proposition

Empower preschool teachers with an explainable, rule-based activity recommendation engine and guided activity-log outcome tracking. The system translates observational assessments (1–3 scores) across 5 developmental domains into immediate, play-based activities with clear pedagogical justifications, while tracking how well activities helped each child.

---

## 2. Strict Architectural Boundaries & Constraints

### ⚠️ Inviolable Rules (Do Not Cross):

1. **Frontend Isolation:**
   - **DO NOT** edit `src/lib/store.tsx` (Owned by store/backend lead).
   - **DO NOT** create `src/lib/api.ts` (Owned by store/backend lead).
   - Recommendation engine in `src/lib/recommend.ts` must be a **pure function** independent of any specific store implementation.
   - The Recommendations page must remain resilient: render recommendations even when backend is offline, and handle log save failures with friendly non-blocking messages.

2. **Backend Scope Limitation:**
   - Allowed files: `backend/app/routers/activity_logs.py`, `backend/app/routers/activities.py`, schemas in `backend/app/schemas.py`, and test files in `backend/tests/`.
   - **DO NOT** touch `observations.py`, `children.py`, `attendance.py`, `dashboard.py`.
   - **DO NOT** touch `recalculate_child_scores` in `backend/app/services.py`.
   - **DO NOT** modify any shared database tables or columns. All schema additions must be additive and documented in `docs/BACKEND_CONTRACT.md`.

---

## 3. Epics & User Stories

### Epic 1: Pure Rule-Based Recommendation Engine

- **US-1.1**: As a teacher, I want the system to prioritize learning domains where a child scored 1 ("Needs Support") followed by 2 ("Developing"), so I can support their weakest areas first.
- **US-1.2**: As a teacher, I want recommended activities to match the child's developmental level and appropriate difficulty (Easy / Medium).
- **US-1.3**: As a teacher, I want the system to avoid recommending activities that the child has already successfully mastered (`tried_helped`).
- **US-1.4**: As a teacher, I want clear, human-readable pedagogical explanations for why each activity was chosen (e.g. _"Recommended because Aarav needs extra support in Numbers and this activity uses tactile counting"_).

### Epic 2: Backend Activity Logs Hardening & Pytest Suite

- **US-2.1**: As an API consumer, I want `POST /api/activity-logs` to return 404 if `child_id` or `activity_id` does not exist.
- **US-2.2**: As an API consumer, I want `POST /api/activity-logs` to validate that `completed_steps <= total_steps` and `outcome` is valid.
- **US-2.3**: As an API consumer, I want `GET /api/activity-logs` to return records in newest-first order (`created_at desc, id desc`).
- **US-2.4**: As a developer, I want a complete Pytest test suite in `backend/tests/test_activity_logs.py` running against an in-memory test database.

### Epic 3: Recommendations UI & Outcome Logging

- **US-3.1**: As a teacher, I want to see personalized recommendation cards on `/recommendations` powered by `recommend.ts` with prominent "Why this activity?" explanation badges.
- **US-3.2**: As a teacher, I want to record activity trials directly from the recommendation card: outcome (`tried_helped`, `tried_needs_support`, `not_tried`), step progress, and optional notes.
- **US-3.3**: As a teacher in a low-connectivity classroom, I want the page to work smoothly without errors when the backend is offline.

---

## 4. Ralph Task Checklist

- [x] **TASK-01: Create Pure Recommendation Engine** (`src/lib/recommend.ts`)
  - Implemented `recommendFor(child, observations, logs)`, `observedDomainsOf()`, and `analyseChild()`
  - Observation-driven, baseline awareness, level matching, and activity-log rotation
  - Pure function with zero dependencies on React state or external APIs.

- [x] **TASK-02: Vitest Unit Tests for Recommendation Engine** (`src/lib/recommend.test.ts`)
  - Co-located test suite in `src/lib/recommend.test.ts`
  - Covers score prioritization, baseline flagging, activity rotation, and supportive language
  - 10 unit tests passing with 100% assertions.

- [x] **TASK-03: Harden Backend Activity Log Schemas** (`backend/app/schemas.py`)
  - Added model validator for `completed_steps <= total_steps` (when `total_steps > 0`)
  - Flagged as `[PENDING APPROVAL: Bhakti]`
  - Validates outcome in `('tried_helped', 'tried_needs_support', 'not_tried')`.

- [x] **TASK-04: Harden Backend Activity Logs Router** (`backend/app/routers/activity_logs.py`)
  - Orders activity logs newest-first by `created_at desc, id desc`
  - Verifies 404 for unknown child or activity
  - `backend/app/routers/activities.py` inspected and preserved untouched.

- [x] **TASK-05: Create Pytest Suite for Activity Logs** (`backend/tests/`)
  - Created `backend/tests/conftest.py` with in-memory SQLite fixtures
  - Created `backend/tests/test_activity_logs.py` with 8 tests covering 201s, 404s, 422s, ordering, and filtering
  - Pytest runs 8/8 tests passed with code 0.

- [x] **TASK-06: Upgrade Recommendations Route UI** (`src/routes/recommendations.tsx`)
  - Powered by `src/lib/recommend.ts`
  - Displays pedagogical reasons, classroom evidence, and early-suggestion badges.

- [x] **TASK-07: Implement Activity Outcome Logging Interface** (`src/routes/recommendations.tsx`)
  - Uses `src/lib/activityLogs.ts` helper
  - Three exact outcome buttons: `"Tried — Helped"`, `"Tried — Needs Support"`, `"Not Tried"`
  - Step tracker and notes input.

- [x] **TASK-08: Implement Offline Resilience & Error Handling** (`src/routes/recommendations.tsx`)
  - Save failures display inline error alert without crashing page
  - Page renders all recommendations normally even if backend is offline
  - Zero unrequested localStorage pollution.

- [x] **TASK-09: Update Backend Contract Documentation** (`docs/BACKEND_CONTRACT.md`)
  - Documented additive step validator with warning callout for Bhakti's approval
  - Documented newest-first ordering on `GET /api/activity-logs`.

- [x] **TASK-10: End-to-End Verification & Quality Pass**
  - `npm test` passes (17/17 tests passing)
  - `pytest` passes (8/8 backend tests passing)
  - `npm run build` succeeds cleanly
  - Boundary audit verified: zero edits to `store.tsx`, `api.ts`, or untouched backend routers.

### Phase 2: Activity Hub Execution & Child Profile Integration

- [x] **TASK-11: Activity History & In-Memory Offline Sync Queue** (`src/lib/activityLogs.ts`)
  - Implement `fetchChildActivityHistory(childId)`
  - Implement purely in-memory offline sync queue (`queuePendingTrial`, `getPendingTrials`, `syncPendingTrials`) without localStorage
  - Add comprehensive automated tests in `src/lib/activityLogs.test.ts` (12 passing tests)

- [x] **TASK-12: Interactive Activity Guide Logging & Step Completion** (`src/routes/activities.$id.tsx`)
  - Add child selector dropdown / switch capability
  - Implement step-count tracking (`completedSteps` strictly from teacher's checklist, `completedSteps <= totalSteps`)
  - Add 3 outcome buttons (`"Tried — Helped"`, `"Tried — Needs Support"`, `"Not Tried"`) and notes field
  - Display previous trial outcomes for this activity and child
  - Support in-memory offline queueing with amber pending badge

- [x] **TASK-13: 360° Child Profile Activity Timeline & Recommendation Integration** (`src/routes/children.$id.tsx`)
  - Integrate `logs` into `recommendFor(ch, obs, logs)` on child profile
  - Add Activity Trials Timeline section displaying past trials with outcome badges and step counts
  - Display pending in-memory sync badge and sync trigger if trials are pending
  - Strictly maintain supportive, non-diagnostic wording and existing design

- [x] **TASK-14: Verification, Boundary Audit & Documentation Sync**
  - Run `npm test` (34/34 passing), `pytest` (8/8 passing), `npm run build` (client & Nitro SSR clean)
  - Conduct strict boundary audit (`store.tsx`, `api.ts`, protected routers, shared tables untouched)
  - Verify `ActivityLogCreate` validator remains documented as pending Bhakti's approval
  - Update `docs/tasks/progress.txt` and `.planning/STATE.md`
