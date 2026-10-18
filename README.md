# VikasSetu — Aamchi Shala

A preschool support platform that helps government preschool teachers manage children's records, take attendance, record classroom observations, and plan suitable learning activities for children aged 3–4.

## Why this project exists

In many government preschools, one teacher looks after a whole class and cannot give every child individual attention. Children who need extra support can go unnoticed and fall behind.

VikasSetu gives the teacher one simple place to record what they see in class, spot which children need more support, and pick age-appropriate activities to help them. It supports the teacher's judgement. It does not diagnose children or label them.

## Features

| Feature | What it does |
|---|---|
| **Dashboard** | Total children, attendance today, observations recorded, learning progress, and children who need attention |
| **Children Profiles** | Basic records and a progress view for each child |
| **Observation Management** | Record observations across five learning areas, with a score and a note |
| **Activity Library** | Age-appropriate preschool activities with steps, duration and difficulty |
| **Recommendations** | Simple rule-based activity suggestions, with the reason shown |
| **Attendance** | Daily attendance and monthly summaries |
| **Progress Tracking** | Charts and summaries of each child's learning over time |

**Learning areas:** Alphabet, Numbers, Colours & Shapes, Art & Creativity, Stories & Habits.

**Scores:** 1 = Needs Support, 2 = Developing, 3 = Good.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, TanStack Start and Router, Vite |
| Styling and UI | Tailwind CSS v4, Radix UI, Lucide icons |
| Charts | Recharts |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite with SQLAlchemy 2.0 |
| Validation | Pydantic v2 and database constraints |
| Frontend package manager | Bun |

## Project structure

```text
.
├── src/                  # Frontend (React + TypeScript)
│   ├── routes/           # Pages: dashboard, children, observations, attendance, activities, recommendations
│   ├── components/       # Shared UI components
│   └── lib/              # data.ts (types), store.tsx (app state), api.ts (backend calls)
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py       # App setup, CORS, routers
│   │   ├── database.py   # SQLite connection
│   │   ├── models.py     # Database tables
│   │   ├── schemas.py    # Request and response validation
│   │   ├── services.py   # Score derivation and shared helpers
│   │   └── routers/      # children, observations, attendance, activities, activity_logs, dashboard
│   ├── seed_data.py      # Sample children, activities and observations
│   ├── seed.py           # Loads the sample data into the database
│   └── requirements.txt
└── docs/
    └── BACKEND_CONTRACT.md   # Full database design and API specification
```

## Getting started

### Prerequisites

- Node.js and [Bun](https://bun.sh)
- Python 3.10 or newer
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Bhakti0394/vikassetu-aamchi-shala.git
cd vikassetu-aamchi-shala
```

### 2. Run the backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\venv\Scripts\python.exe seed.py --reset
.\venv\Scripts\uvicorn.exe app.main:app --port 8000 --reload
```

On macOS or Linux:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python seed.py --reset
uvicorn app.main:app --port 8000 --reload
```

The API is now running at `http://localhost:8000`. Interactive API documentation is at `http://localhost:8000/docs`.

`seed.py --reset` creates `backend/vikassetu.db` with 9 sample children, 11 activities, 51 observations and attendance history. The database file is not committed to Git, so every developer runs the seed on their own machine.

### 3. Run the frontend

Open a second terminal in the project root:

```bash
bun install
bun run dev
```

The terminal prints the local address to open in your browser.

## Database

| Table | Purpose |
|---|---|
| `children` | Child profile: name, age, avatar, scores per learning area, strengths, needs |
| `activities` | The activity library: domain, difficulty, minutes, skills, steps, target levels |
| `observations` | A teacher's observation: child, learning area, activity, score (1–3), note, date |
| `attendance` | One row per child per day. A child can have only one record per date |
| `activity_logs` | Whether an activity was tried and how it went |

Data integrity is enforced by foreign keys (deleting a child deletes their related records), CHECK constraints (valid scores, learning areas and difficulty), and a unique constraint on attendance.

## API overview

Base URL: `http://localhost:8000/api`

| Area | Endpoints |
|---|---|
| Health | `GET /health` |
| Children | `GET /children`, `POST /children`, `GET /children/{id}`, `PUT /children/{id}`, `DELETE /children/{id}` |
| Observations | `GET /observations`, `POST /observations`, `PUT /observations/{id}`, `DELETE /observations/{id}` |
| Attendance | `GET /attendance`, `POST /attendance`, `POST /attendance/bulk` |
| Activities | `GET /activities`, `GET /activities/{id}` |
| Activity logs | `GET /activity-logs`, `POST /activity-logs` |
| Dashboard | `GET /dashboard/summary` |

Request and response shapes, validation rules and error formats are documented in [`docs/BACKEND_CONTRACT.md`](docs/BACKEND_CONTRACT.md).

### How scores work

- A child's score in each learning area comes from their **latest observation** in that area.
- After any observation is created, edited or deleted, the child's scores, strengths and needs are recalculated.
- A child appears in "needs attention" only when a learning area they have actually been observed in has a latest score of 1. A newly added child with no observations is not flagged.
- Recommendations are computed in the frontend from these scores and always include a reason. A single observation is never used to label a child.

## Team and responsibilities

| Member | Module |
|---|---|
| Bhakti | Backend and database: schema, API, validation, seed data, API contract |
| Member 2 | Observation management: the Record Observation form and saved observations |
| Member 3 | Observation and recommendation engine, activity logs |
| Member 4 | Dashboard, attendance, children profiles and progress charts |

### Working together

- Each member works on their own branch and opens a pull request into `main`.
- Frontend pages call the backend only through `src/lib/api.ts`.
- After any observation is created, updated or deleted, re-fetch that child with `GET /api/children/{id}` so scores stay in sync.
- Database or API changes go through the backend owner, and `docs/BACKEND_CONTRACT.md` is updated with them.

## Testing

With the backend virtual environment active:

```bash
cd backend
pytest
```

You can also try every endpoint in the browser at `http://localhost:8000/docs`.

## Known limitations

- **Single-classroom prototype.** There is no login or user accounts. This is intended for one teacher using the app for one class.
- **Local database.** Each developer has their own SQLite file. A multi-school rollout would move to a shared database such as PostgreSQL (the change is mainly the connection URL, because SQLAlchemy is used) and would add teacher accounts and per-school access control.
- **Supportive, not diagnostic.** Recommendations are suggestions to help the teacher plan activities. They do not diagnose a child or replace professional judgement.
