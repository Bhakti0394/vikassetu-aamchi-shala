# Code Conventions & Standards

## Coding Standards

### TypeScript / React

- **File Naming:**
  - Routes: Flat dot notation (`children.index.tsx`, `children.$id.tsx`). Dynamic parameters use `$` prefix.
  - Components: PascalCase for components (`Avatar`, `DomainChip`), kebab-case for generic UI (`ui-kit.tsx`).
- **Styling:**
  - Tailwind CSS utility classes organized via `cn(...)` (`clsx` + `tailwind-merge`).
  - Warm, playful, accessible palette (tones: `teal`, `sun`, `coral`, `sky`, `primary`).
- **Typing:**
  - Strict TypeScript; avoid `any`.
  - Shared domain models imported from `@/lib/data`.

### Python / FastAPI

- **Naming Conventions:**
  - Modules & files: `snake_case.py`.
  - Classes & ORM models: `PascalCase`.
  - Pydantic models: `PascalCase` with suffix (`ChildCreate`, `ChildResponse`).
- **Serialization:**
  - Python internal variables use `snake_case`.
  - API responses serialize to `camelCase` using Pydantic's `to_camel` alias generator.
- **ORM Patterns:**
  - Use SQLAlchemy 2.0 declarative models (`Base = declarative_base()`).
  - Mutable JSON columns (e.g. `child.scores`, `child.strengths`) must be reassigned with new dict/list instances: `child.scores = dict(new_scores)`.
- **Database Constraints:**
  - Foreign keys strictly enforce `ondelete="CASCADE"`.
  - Domain constraints enforce valid domain keys (`alphabet`, `numbers`, `colours`, `art`, `stories`).
  - Scores restricted to integers `1, 2, 3`.
