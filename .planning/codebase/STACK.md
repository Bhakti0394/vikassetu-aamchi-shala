# Technology Stack

## Core Technologies

### Frontend

- **Framework:** React 19.2.0
- **Language:** TypeScript 5.8.3
- **Routing & Fullstack Framework:** TanStack Start 1.168.60 & TanStack Router 1.170.41 (file-based routing under `src/routes/`)
- **Build Tool:** Vite 8.1.5 with `@lovable.dev/vite-tanstack-config`
- **Styling:** Tailwind CSS v4.2.1, `@tailwindcss/vite`
- **Component Primitives:** Radix UI (`@radix-ui/react-*`), `class-variance-authority`, `clsx`, `tailwind-merge`
- **Icons:** `lucide-react` 0.575.0
- **Data Visualization:** `recharts` 2.15.4
- **Forms & Validation:** `react-hook-form` 7.71.2, `@hookform/resolvers`, `zod` 3.25.76
- **Package Manager:** Bun (primary lockfile `bun.lock`) / npm (secondary)

### Backend

- **Framework:** FastAPI 0.143.3 (Python 3.10+)
- **Server:** Uvicorn 0.54.0 with standard extras (httptools, uvloop/watchfiles)
- **Database:** SQLite 3 (`backend/vikassetu.db`)
- **ORM:** SQLAlchemy 2.1.5 (connection listener enables `PRAGMA foreign_keys=ON`)
- **Data Validation & Serialization:** Pydantic 2.14.1 (`pydantic-core` 2.50.1, `alias_generator=to_camel`)
- **Timezone Support:** `tzdata` 2026.5 (`zoneinfo.ZoneInfo("Asia/Kolkata")`)

## Development & Test Dependencies

- **Frontend Testing:** Vitest 4.1.10, jsdom 20.0.3, `@testing-library/react` 16.0.0
- **Frontend Quality:** ESLint 9.32.0, Prettier 3.7.3, TypeScript-ESLint 8.56.1
- **Backend Testing:** Pytest 9.1.1, HTTPX 0.28.1 (installed in virtual environment)
