# Testing Architecture & State

## Current Test State

### Frontend Tests

- **Runner:** Vitest (`vitest run` / `npm test`)
- **Environment:** jsdom + `@testing-library/react`
- **Location:** `src/test/`
- **Coverage:**
  - `src/test/app-routing.test.tsx`: 7 passing route-matching tests for core navigation paths (`/`, `/children`, `/activities`, `/progress`, `/recommendations`, `/attendance`).
- **Gaps:** Component interaction tests, form submission tests (e.g., adding observations, editing children), and store unit tests.

### Backend Tests

- **Runner:** Pytest (`pytest`)
- **Location:** Expected at `backend/tests/` (specified in `docs/BACKEND_CONTRACT.md`), currently empty/missing.
- **Gaps:**
  - Need `conftest.py` with in-memory SQLite fixtures.
  - Need test suite for `/api/children` CRUD.
  - Need test suite for `/api/observations` score recalculation and cascading deletes.
  - Need test suite for `/api/attendance` unique constraints and bulk marking.
  - Need test suite for `/api/dashboard/summary` metrics and attention filtering.
