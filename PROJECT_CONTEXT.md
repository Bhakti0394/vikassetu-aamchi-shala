# VikasSetu — Aamchi Shala

## Complete System Architecture, Domain Context & AI Feature Generation Guide

> **Target Audience for this Document:** Software engineers, AI coding agents, and product managers building or extending features for the VikasSetu platform.

---

## 1. Executive Summary & Problem Space

In government preschools and Anganwadis across India, a single teacher or Anganwadi worker (Sevika) often manages 20–30 young children aged 3 to 4. Because teacher attention is stretched, children with mild developmental delays, motor-skill lags, or language hesitation often slip through the cracks until formal primary schooling.

**VikasSetu ("Bridge to Progress" — "Our School")** provides teachers with a simple, intuitive digital companion to:

1. **Take daily attendance** in seconds.
2. **Record quick, observational assessments** across five core early-childhood developmental areas.
3. **Automatically identify children needing gentle support** without stigmatizing or labeling them.
4. **Suggest targeted, play-based activities** with clear instructions, duration, and rationale.
5. **Log guided activity trials** to track what helped and visualize individual/classroom progress.

---

## 2. Core Developmental Framework

Learning and observation is organized around **5 Foundational Learning Domains**:

| Domain ID  | Learning Area               | Focus Areas                                                            |
| ---------- | --------------------------- | ---------------------------------------------------------------------- |
| `alphabet` | **Alphabet & Language**     | Letter recognition, phonics, vocabulary, listening comprehension       |
| `numbers`  | **Numbers & Counting**      | Number sense (1–10), counting objects, size comparisons                |
| `colours`  | **Colours & Shapes**        | Color naming, 2D shape identification, pattern matching                |
| `art`      | **Art & Creativity**        | Fine motor skills, crayon gripping, paper tearing, imagination         |
| `stories`  | **Stories, Habits & Games** | Social skills, sharing, personal hygiene, following classroom routines |

### Scoring Matrix (1 to 3 Scale)

- **1 — Needs Support:** Child needs extra practice, guided scaffolding, or simpler activities.
- **2 — Developing:** Child understands concept partially, makes progress with peer assistance.
- **3 — Good:** Child consistently demonstrates mastery for their age group.

### Ethical Guardrails & Rules

- **Non-Diagnostic:** The platform never labels a child as "slow" or "deficient". It describes areas as _"Doing well in [Domain]"_ or _"More practice in [Domain]"_.
- **Unobserved Invariant:** Newly added children default to score 1 with state `"First observations pending"` and are **never** flagged in the "Needs Attention" list until an actual classroom observation is recorded.
- **Dynamic Derivation:** A child's current domain score is always their **most recent observation score** in that domain.
- **Simple, Teacher-Friendly Language:** Use everyday, familiar English without educational jargon or fancy terminology. Activities must have direct, intuitive titles that describe what children will do (e.g. *"Jump and Learn Numbers"* instead of *"Number Hopscotch"*, *"Mix Colours"* instead of *"Colour Mixing Lab"*, *"Find Things in Nature"* instead of *"Nature Treasure Mandala"*). Instructions and skills must be short, clear, and actionable without requiring prior educational training.

---

## 3. Technology Stack

### Frontend

- **Framework:** React 19, TypeScript
- **Routing & SSR:** TanStack Start & TanStack Router (file-based routing under `src/routes/`)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4, Lucide React icons, Radix UI primitives
- **Visualizations:** Recharts (Radar charts for domain spider graphs, Bar charts for class distributions)
- **State Management:** React Context (`StoreCtx`) with dual-mode sync (localStorage cache + REST API client `src/lib/api.ts`)

### Backend

- **Framework:** Python 3.10+ · FastAPI · Uvicorn (ASGI)
- **Database:** SQLite 3 (`backend/vikassetu.db`)
- **ORM:** SQLAlchemy 2.0 (Foreign key enforcement enabled via `PRAGMA foreign_keys=ON`)
- **Data Validation & Serialization:** Pydantic v2 (CamelModel configured with `alias_generator=to_camel` for automatic snake_case ↔ camelCase mapping)
- **Testing:** Pytest, HTTPX

---

## 4. Overall System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             TEACHER'S BROWSER                               │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   React 19 + TanStack Router (Vite)                   │  │
│  │                                                                       │  │
│  │  [Dashboard]      [Children Profiles]   [Observations Form]           │  │
│  │  - Today KPIs     - Child List & Radar  - Quick 1-3 Score             │  │
│  │  - Attention list - Strengths & Needs   - Voice/Text notes            │  │
│  │                                                                       │  │
│  │  [Activity Hub]   [Recommendations]     [Attendance Matrix]           │  │
│  │  - Step-by-step   - Rule-based suggestions - Single / Bulk mark       │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
│                                     │ fetch / REST                          │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FASTAPI BACKEND                                  │
│                                                                             │
│  ┌───────────────────────────────┐     ┌─────────────────────────────────┐  │
│  │         API Routers           │     │       Services & Logic          │  │
│  │  • /api/children              │     │  • Score Derivation Engine      │  │
│  │  • /api/observations          ├────►│  • Dynamic Strengths/Needs      │  │
│  │  • /api/activities            │     │  • IST / Asia/Kolkata Timezone  │  │
│  │  • /api/attendance            │     │  • Non-baseline Filtering       │  │
│  │  • /api/activity-logs         │     └────────────────┬────────────────┘  │
│  │  • /api/dashboard/summary     │                      │                   │
│  └───────────────────────────────┘                      ▼                   │
│                                           ┌───────────────────────────┐     │
│                                           │      SQLAlchemy 2.0       │     │
│                                           │  PRAGMA foreign_keys=ON   │     │
│                                           └─────────────┬─────────────┘     │
└─────────────────────────────────────────────────────────┼───────────────────┘
                                                          │
                                                          ▼
                                            ┌───────────────────────────┐
                                            │         SQLite 3          │
                                            │     (vikassetu.db)        │
                                            │                           │
                                            │ • children                │
                                            │ • activities              │
                                            │ • observations            │
                                            │ • attendance              │
                                            │ • activity_logs           │
                                            └───────────────────────────┘
```

---

## 5. Database Schema & Entities

### 1. `children`

- `id` (VARCHAR 60, PK): Slug + random hex (e.g., `rohan-a1b2`).
- `name` (VARCHAR 100, NOT NULL): Child's name.
- `age` (INTEGER, CHECK: 2–6): Child's age.
- `avatar` (VARCHAR 10): Emoji avatar.
- `tone` (VARCHAR 20): Theme color (`teal`, `sun`, `coral`, `sky`, `primary`).
- `scores` (JSON): `{ "alphabet": 1-3, "numbers": 1-3, "colours": 1-3, "art": 1-3, "stories": 1-3 }`.
- `strengths` (JSON List): Generated text bullets (e.g., `["Doing well in Colours & Shapes"]`).
- `needs` (JSON List): Generated text bullets (e.g., `["More practice in Numbers & Counting"]`).
- **Dynamic Property:** `observed_domains` (Unique domains with at least 1 observation).

### 2. `activities`

- `id` (VARCHAR 50, PK): e.g., `alphabet-match`, `clay-shaping`.
- `name` (VARCHAR 150): Display title.
- `domain` (VARCHAR 30, CHECK: 5 domains).
- `difficulty` (VARCHAR 20, CHECK: `Easy`, `Medium`).
- `minutes` (INTEGER): Estimated classroom time (e.g., 10, 15).
- `emoji` (VARCHAR 10): Icon.
- `skills` (JSON List): Skills exercised (e.g., `["Letter recognition", "Memory"]`).
- `steps` (JSON List): Step-by-step instructions for the teacher.
- `for_level` (JSON List): Target score levels (e.g., `[1, 2]`).

### 3. `observations`

- `id` (VARCHAR 50, PK): `obs-` + 10-char UUID.
- `child_id` (VARCHAR 60, FK → `children.id` ON DELETE CASCADE).
- `activity_id` (VARCHAR 50, FK → `activities.id` ON DELETE CASCADE).
- `domain` (VARCHAR 30, CHECK: 5 domains).
- `score` (INTEGER, CHECK: 1, 2, 3).
- `note` (VARCHAR 500): Teacher's observational notes.
- `date` (VARCHAR 40): UTC ISO 8601 string (`YYYY-MM-DDTHH:MM:SSZ`).
- `is_baseline` (BOOLEAN): `True` for initial 45 baseline seed records, `False` for actual teacher entries.

### 4. `attendance`

- `id` (INTEGER, PK autoincrement).
- `child_id` (VARCHAR 60, FK → `children.id` ON DELETE CASCADE).
- `date` (VARCHAR 10): `YYYY-MM-DD`.
- `present` (BOOLEAN, default `True`).
- **Constraint:** `UniqueConstraint(child_id, date)`.

### 5. `activity_logs`

- `id` (INTEGER, PK autoincrement).
- `child_id` (VARCHAR 60, FK → `children.id` ON DELETE CASCADE).
- `activity_id` (VARCHAR 50, FK → `activities.id` ON DELETE CASCADE).
- `completed_steps` (INTEGER).
- `total_steps` (INTEGER).
- `outcome` (VARCHAR 30, CHECK: `tried_helped`, `tried_needs_support`, `not_tried`).
- `note` (VARCHAR 500, Optional).
- `created_at` (VARCHAR 40): Timestamp.

---

## 6. Core Business Algorithms & Invariants

### A. Score Derivation Engine (`backend/app/services.py`)

Triggered automatically whenever an observation is **created**, **updated**, or **deleted**:

1. Query all observations for the child ordered by `date DESC, id DESC`.
2. Find the latest score for each observed domain.
3. If observed: Set score to latest value. If score == 3, add to `strengths`; if < 3, add to `needs`.
4. If unobserved: Default score is 1, and no strengths/needs are generated for that domain.
5. If the child has zero observations across all domains: `needs = ["First observations pending"]`.
6. Atomic JSON re-assignment persists changes in SQLite.

### B. Dashboard KPI Calculations (`Asia/Kolkata` timezone)

- `today_kolkata`: Computed in `Asia/Kolkata` (`YYYY-MM-DD`).
- `total_children`: Total records in `children`.
- `present_today`: Count of attendance where `date == today_kolkata` and `present == True`.
- `activities_done`: Count of observations where `is_baseline == False`.
- `needs_attention_count` / `attention_list`: Children having at least one **observed** domain with latest score = 1. Sorted by lowest average observed score.
- `domain_distribution`: 1–3 score breakdown across only observed domains.

---

## 7. Complete API Surface

Base URL: `http://localhost:8000`

| Endpoint                 | Method   | Key Parameters / Body                          | Purpose                                          |
| ------------------------ | -------- | ---------------------------------------------- | ------------------------------------------------ |
| `/`                      | `GET`    | —                                              | API status, quick links, and documentation index |
| `/docs`                  | `GET`    | —                                              | Interactive OpenAPI / Swagger UI                 |
| `/api/health`            | `GET`    | —                                              | Health check (`{"status": "healthy"}`)           |
| `/api/children`          | `GET`    | —                                              | List all children with `observedDomains`         |
| `/api/children`          | `POST`   | `{ name, age }`                                | Create new child profile                         |
| `/api/children/{id}`     | `GET`    | —                                              | Retrieve single child with timeline              |
| `/api/children/{id}`     | `PUT`    | `{ name?, age? }`                              | Edit child details                               |
| `/api/children/{id}`     | `DELETE` | —                                              | Cascade delete child and records                 |
| `/api/observations`      | `GET`    | `?child_id=&include_baseline=false`            | Query observation history                        |
| `/api/observations`      | `POST`   | `{ childId, domain, activityId, score, note }` | Record observation & re-derive scores            |
| `/api/observations/{id}` | `PUT`    | `{ domain?, activityId?, score?, note? }`      | Edit observation & re-derive scores              |
| `/api/observations/{id}` | `DELETE` | —                                              | Delete observation & re-derive scores            |
| `/api/attendance`        | `GET`    | `?month=YYYY-MM`                               | Full monthly attendance matrix                   |
| `/api/attendance`        | `POST`   | `{ childId, date, present }`                   | Upsert single attendance                         |
| `/api/attendance/bulk`   | `POST`   | `{ date, records: [{ childId, present }] }`    | Bulk submit daily classroom roll call            |
| `/api/activities`        | `GET`    | `?domain=`                                     | List activities filtered by domain               |
| `/api/activities/{id}`   | `GET`    | —                                              | Activity details, steps, difficulty              |
| `/api/activity-logs`     | `GET`    | `?child_id=`                                   | Retrieve activity trial history                  |
| `/api/activity-logs`     | `POST`   | `{ childId, activityId, outcome, note, ... }`  | Log guided session outcome                       |
| `/api/dashboard/summary` | `GET`    | —                                              | Live dashboard metrics and KPIs                  |

---

## 8. Frontend Route Structure

```text
src/routes/
├── __root.tsx              # App shell (navigation bar, offline badge, layout)
├── index.tsx               # Dashboard (KPI cards, Needs Attention, Domain breakdown)
├── children.index.tsx      # Roster list of children, filters, and Add Child modal
├── children.$id.tsx        # 360° Child Profile (Radar chart, developmental timeline)
├── attendance.tsx          # Class attendance roll-call interface + monthly matrix
├── activities.index.tsx    # Filterable activity library
├── activities.$id.tsx      # Step-by-step activity guide with outcome logging
├── recommendations.tsx     # Rule-based suggestions tailored to children needing support
└── progress.tsx            # Class-wide and per-domain progress tracking charts
```

---

## 9. How to Run & Test the Application

### Backend (Terminal 1)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
$env:PYTHONUTF8=1; .\venv\Scripts\python.exe seed.py --reset
.\venv\Scripts\uvicorn.exe app.main:app --port 8000 --reload
```

### Frontend (Terminal 2)

```powershell
bun install
bun run dev
```

---

## 10. AI Feature Generation Prompts & Roadmap

If sharing with an AI assistant for brainstorming or building new features, use the prompts below:

### Prompt 1: Multilingual / Vernacular Audio Notes

> _"Design an offline-ready voice note recording feature for Anganwadi teachers using Web Speech API or local Whisper. The teacher speaks in Marathi or Hindi, the system transcribes it, extracts observations for a child, maps it to one of the 5 domains, and suggests an initial score of 1–3 for teacher confirmation."_

### Prompt 2: WhatsApp-Friendly Parent Report Card Generator

> _"Create a frontend component and backend endpoint that compiles a child's monthly learning journey into a friendly, non-stigmatizing, visual PDF/image card. It must list 2 strengths, 1 focus area described positively, an attendance badge, and a fun at-home game the parent can play with the child."_

### Prompt 3: Poshan Tracker / Growth & Nutrition Sync

> _"Extend the database schema with a `health_records` table tracking height (cm), weight (kg), MUAC (cm), and midday meal status. Calculate WHO growth standard percentiles (underweight, stunting, wasting) and present an Anganwadi Health card alongside the developmental learning domains."_

### Prompt 4: Multi-School / Multi-Teacher Role Based Access Control

> _"Propose a migration from SQLite to PostgreSQL adding multi-tenancy. Model roles for Anganwadi Worker (Sevika), Supervisor (Mukhya Sevika / CDPO), and Parent. Include JWT authentication, role guards in FastAPI routers, and a supervisor dashboard showing attendance and attention metrics across 20+ Anganwadi centers."_

### Prompt 5: AI-Powered Remedial Play Planner

> _"Build an automated weekly lesson planner that analyzes the class's `needs_attention_count` and unobserved domains, then generates a 5-day play schedule balancing gross motor, fine motor, storytelling, and early math using easily accessible Anganwadi toys and natural materials."_
