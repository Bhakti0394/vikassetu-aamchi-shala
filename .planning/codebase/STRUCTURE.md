# Project Structure

## Directory Layout

```text
vikassetu-aamchi-shala/
├── backend/                  # FastAPI REST API
│   ├── app/
│   │   ├── main.py           # App initialization, CORS, root/docs endpoints
│   │   ├── database.py       # SQLite connection, PRAGMA foreign_keys=ON, get_db
│   │   ├── models.py         # SQLAlchemy ORM models (Child, Activity, Observation, Attendance, ActivityLog)
│   │   ├── schemas.py        # Pydantic v2 schemas with camelCase aliases
│   │   ├── services.py       # Score derivation logic, ID/slug generator
│   │   └── routers/          # Modular API endpoints
│   │       ├── children.py
│   │       ├── activities.py
│   │       ├── observations.py
│   │       ├── attendance.py
│   │       ├── activity_logs.py
│   │       └── dashboard.py
│   ├── seed.py               # Seed CLI script (--reset)
│   ├── seed_data.py          # Sample data definitions
│   ├── requirements.txt      # Production Python packages
│   ├── requirements-dev.txt  # Testing Python packages
│   └── venv/                 # Virtual environment
├── src/                      # React 19 Frontend
│   ├── routes/               # TanStack file-based routes
│   │   ├── __root.tsx        # Global shell, navigation, offline banner
│   │   ├── index.tsx         # Dashboard page
│   │   ├── children.index.tsx# Roster & search
│   │   ├── children.$id.tsx  # Child 360 profile & developmental radar
│   │   ├── attendance.tsx    # Daily roll call & monthly calendar
│   │   ├── activities.index.tsx # Activity library
│   │   ├── activities.$id.tsx   # Step-by-step activity guide
│   │   ├── recommendations.tsx  # Rule-based suggestions
│   │   └── progress.tsx      # Developmental trajectory charts
│   ├── components/           # Reusable UI primitives
│   │   ├── ui/               # Radix/Tailwind components
│   │   └── ui-kit.tsx        # VikasSetu-specific UI tokens (Avatar, DomainChip, etc.)
│   ├── lib/                  # Business logic & utilities
│   │   ├── data.ts           # Types, domain constants, helper functions
│   │   ├── store.tsx         # React context & local storage state
│   │   └── utils.ts          # clsx + tailwind-merge helper
│   └── test/                 # Frontend tests
│       ├── setup.ts          # Testing library setup
│       └── app-routing.test.tsx # Route matching tests
├── docs/                     # Specifications
│   └── BACKEND_CONTRACT.md   # Complete backend contract & API spec
├── .planning/                # GSD (Get Shit Done) planning workspace
├── PROJECT_CONTEXT.md        # Consolidated AI context document
├── package.json              # Frontend npm/bun dependencies
├── vite.config.ts            # Vite configuration
└── tsconfig.json             # TypeScript compiler settings
```
