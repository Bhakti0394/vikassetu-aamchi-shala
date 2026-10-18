# Known Concerns, Tech Debt & Risk Areas

## Critical Gaps

1. **Frontend ↔ Backend Disconnect (High Priority):**
   - The React application is currently running against mock data stored in `localStorage` (`src/lib/store.tsx`).
   - The backend API client `src/lib/api.ts` has not been implemented.
   - Any data entered by the teacher in the browser currently does NOT reach the SQLite database (`vikassetu.db`).

2. **Missing Backend Automated Tests (High Priority):**
   - The backend has zero pytest test cases implemented.
   - Any refactoring of the score derivation logic or SQLAlchemy models risks uncaught regression.

3. **Offline & Network Resilience:**
   - In low-connectivity Anganwadi centers, network calls can fail.
   - A resilient caching layer is needed so the teacher can continue taking attendance or recording observations offline and sync when reconnected.

4. **Multi-Tenancy & Security:**
   - Currently a single-classroom prototype with no authentication or role differentiation.
   - In production rollout, requires teacher/school scoping, JWT authentication, and data privacy safeguards for minor children.

5. **Accessibility & Vernacular Localization:**
   - The interface is currently in English; most Anganwadi teachers require Marathi / Hindi UI and voice input.
