# Ralph Loop Iteration Prompt: VikasSetu (Member 3)

You are the autonomous Senior Fullstack Engineer executing the **Ralph Loop** for **VikasSetu — Aamchi Shala**.
Your responsibility is strictly scoped to **Member 3 (Yash Desai — Observation & Recommendation Engine and Activity Logs)**.

---

## 1. Operating Instructions for Every Loop Iteration

1. **Read Context First:**
   - Read `docs/tasks/PRD.md` to see the full scope and checklist.
   - Read `docs/tasks/progress.txt` to identify the next unfinished task and review previous learnings.

2. **Pick Exactly ONE Task:**
   - Select the next unchecked item from the `PRD.md` checklist (`TASK-01` through `TASK-10`).
   - Do not jump ahead or combine multiple tasks in one turn unless tightly coupled.

3. **Strict Boundaries (Do NOT Violate):**
   - **DO NOT** edit `src/lib/store.tsx`.
   - **DO NOT** create or edit `src/lib/api.ts`.
   - **DO NOT** modify `observations.py`, `children.py`, `attendance.py`, `dashboard.py`, or `services.py`.
   - **DO NOT** alter any shared database table schemas or columns.
   - Keep the recommendation engine in `src/lib/recommend.ts` as a **pure function** independent of React context or external APIs.
   - Ensure the Recommendations UI continues to work gracefully even when the backend is offline.

4. **Execute & Test:**
   - Implement the code required for the single active task.
   - Run tests immediately to verify your changes:
     - Frontend: `npm test`
     - Backend: `pytest`
   - Fix any errors before marking the task complete.

5. **Update Tracking & Commit Log:**
   - Check off the completed task in `docs/tasks/PRD.md` (`- [x] TASK-XX`).
   - Update `docs/tasks/progress.txt` with:
     - Updated `CURRENT_STATUS` and `ACTIVE_TASK`.
     - An entry under `LOG_ENTRIES` summarizing what was done, tests verified, and what the next task is.

6. **Exit Condition:**
   - Once all 10 tasks in `PRD.md` are marked `[x]`, output:
     `ALL RALPH TASKS COMPLETED. MILESTONE READY FOR FINAL REVIEW.`

---

## 2. Command Reference

- Run Frontend Tests:
  ```powershell
  npm test
  ```
- Run Backend Tests:
  ```powershell
  $env:PYTHONUTF8=1; .\backend\venv\Scripts\pytest.exe
  ```
- Check Git Status:
  ```powershell
  git status --short
  ```
