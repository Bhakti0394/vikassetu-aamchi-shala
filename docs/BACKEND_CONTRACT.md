# VikasSetu — Backend Contract & Architecture Specification

**Project:** VikasSetu — Aamchi Shala  
**Module:** Observation & Recommendation Engine (Preschool Ages 3–4)  
**Backend Stack:** Python 3.10+ · FastAPI · SQLite · SQLAlchemy 2.0 · Pydantic v2

---

## 1. Backend Directory Structure

All backend code resides in the `backend/` directory:

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app instance, CORS middleware, health check
│   ├── database.py          # Absolute SQLite path, PRAGMA foreign_keys=ON, get_db
│   ├── models.py            # SQLAlchemy ORM models with constraints & cascade rules
│   ├── schemas.py           # Pydantic v2 schemas (to_camel alias generator, StringConstraints)
│   ├── services.py          # Shared score derivation engine & ID/date helpers
│   └── routers/
│       ├── __init__.py
│       ├── children.py      # /api/children CRUD
│       ├── activities.py    # /api/activities endpoints
│       ├── observations.py  # /api/observations endpoints & score derivation trigger
│       ├── attendance.py    # /api/attendance & bulk marking
│       ├── activity_logs.py # /api/activity-logs (Member 3)
│       ├── recommendations.py # /api/recommendations/personalized & /status (Member 3)
│       └── dashboard.py     # /api/dashboard/summary (Asia/Kolkata timezone)
│   ├── ai_recommendations.py # Groq LLM integration & deterministic pedagogical fallback (Member 3)
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # In-memory SQLite test fixtures
│   ├── test_children.py
│   ├── test_observations.py
│   ├── test_attendance.py
│   ├── test_activity_logs.py
│   ├── test_recommendations.py
│   └── test_dashboard.py
├── seed_data.py             # ACTIVITIES, SEED_CHILDREN, SEED_OBSERVATIONS & seed_attendance()
├── seed.py                  # Seed script with baseline observations & score derivation verification
├── requirements.txt         # Runtime dependencies
├── requirements-dev.txt     # Test & dev dependencies (pytest, httpx)
├── .gitignore               # venv, *.db, cache ignores
└── README.md                # Quickstart instructions
```

### `requirements.txt`

```text
fastapi>=0.115.0,<1.0.0
uvicorn[standard]>=0.30.0,<1.0.0
sqlalchemy>=2.0.30,<3.0.0
pydantic>=2.8.0,<3.0.0
```

### `requirements-dev.txt`

```text
pytest>=8.2.0
httpx>=0.27.0
```

### `.gitignore`

```text
venv/
.venv/
*.db
__pycache__/
.pytest_cache/
.coverage
```

---

## 2. Database Connection & SQLite Prerequisites (`backend/app/database.py`)

1. **Absolute Path Resolution:** The SQLite database path is resolved dynamically relative to `backend/app/database.py`, preventing cwd/invocation directory discrepancies.
2. **Foreign Key Enforcement:** Enabled on every SQLite connection via `PRAGMA foreign_keys=ON`.

```python
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Resolve absolute path to backend/vikassetu.db
BACKEND_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BACKEND_DIR / "vikassetu.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Enable foreign key constraint enforcement on every SQLite connection
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

> [!IMPORTANT]
> **SQLAlchemy JSON Column Reassignment:**  
> In-place mutations on Python dictionaries or lists (e.g. `child.scores["alphabet"] = 2`) are not automatically detected as dirty. Reassign new dictionary/list instances when saving updates:  
> `child.scores = dict(new_scores)`  
> `child.strengths = list(new_strengths)`  
> `child.needs = list(new_needs)`

---

## 3. SQLAlchemy Table Design (`backend/app/models.py`)

Matches frontend types in `src/lib/data.ts` and `src/lib/store.tsx`.

```python
from sqlalchemy import (
    Column, String, Integer, Boolean, ForeignKey,
    CheckConstraint, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class Child(Base):
    __tablename__ = "children"

    id = Column(String(60), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    avatar = Column(String(10), nullable=False, default="🧒🏽")
    tone = Column(String(20), nullable=False, default="teal")
    scores = Column(JSON, nullable=False)        # Dict[DomainId, int]
    strengths = Column(JSON, nullable=False, default=list)     # List[str]
    needs = Column(JSON, nullable=False, default=list)         # List[str]

    __table_args__ = (
        CheckConstraint("age BETWEEN 2 AND 6", name="check_child_age"),
        CheckConstraint("tone IN ('teal', 'sun', 'coral', 'sky', 'primary')", name="check_child_tone"),
    )

    # Ordered by date desc, then id desc as tie-breaker
    observations = relationship(
        "Observation",
        back_populates="child",
        cascade="all, delete-orphan",
        order_by="desc(Observation.date), desc(Observation.id)"
    )
    attendance = relationship("Attendance", back_populates="child", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="child", cascade="all, delete-orphan")

    @property
    def observed_domains(self):
        """Dynamic property: list of unique domains that have at least one observation."""
        seen = set()
        out = []
        for obs in self.observations:
            if obs.domain not in seen:
                seen.add(obs.domain)
                out.append(obs.domain)
        return out


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String(50), primary_key=True, index=True)  # e.g., "alphabet-match"
    name = Column(String(150), nullable=False)
    domain = Column(String(30), nullable=False)
    difficulty = Column(String(20), nullable=False)
    minutes = Column(Integer, nullable=False)
    emoji = Column(String(10), nullable=False)
    skills = Column(JSON, nullable=False)       # List[str]
    steps = Column(JSON, nullable=False)        # List[str]
    for_level = Column(JSON, nullable=False)    # List[int]

    __table_args__ = (
        CheckConstraint("domain IN ('alphabet', 'numbers', 'colours', 'art', 'stories')", name="check_activity_domain"),
        CheckConstraint("difficulty IN ('Easy', 'Medium')", name="check_activity_difficulty"),
    )

    observations = relationship("Observation", back_populates="activity", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="activity", cascade="all, delete-orphan")


class Observation(Base):
    __tablename__ = "observations"

    id = Column(String(50), primary_key=True, index=True)
    child_id = Column(String(60), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(30), nullable=False)
    activity_id = Column(String(50), ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)
    note = Column(String(500), nullable=False, default="")
    date = Column(String(40), nullable=False)   # UTC ISO 8601: YYYY-MM-DDTHH:MM:SSZ
    is_baseline = Column(Boolean, nullable=False, default=False)  # True for baseline seed observations

    __table_args__ = (
        CheckConstraint("score IN (1, 2, 3)", name="check_observation_score"),
        CheckConstraint("domain IN ('alphabet', 'numbers', 'colours', 'art', 'stories')", name="check_observation_domain"),
    )

    child = relationship("Child", back_populates="observations")
    activity = relationship("Activity", back_populates="observations")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    child_id = Column(String(60), ForeignKey("children.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    present = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("child_id", "date", name="uq_child_attendance_date"),
    )

    child = relationship("Child", back_populates="attendance")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    child_id = Column(String(60), ForeignKey("children.id", ondelete="CASCADE"), nullable=False)
    activity_id = Column(String(50), ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    completed_steps = Column(Integer, nullable=False, default=0)
    total_steps = Column(Integer, nullable=False, default=0)
    outcome = Column(String(30), nullable=False, default="not_tried")
    note = Column(String(500), nullable=True)
    created_at = Column(String(40), nullable=False)

    __table_args__ = (
        CheckConstraint("outcome IN ('tried_helped', 'tried_needs_support', 'not_tried')", name="check_log_outcome"),
    )

    child = relationship("Child", back_populates="activity_logs")
    activity = relationship("Activity", back_populates="activity_logs")
```

---

## 4. Pydantic v2 Schemas (`backend/app/schemas.py`)

Using `alias_generator=to_camel`, `populate_by_name=True`, and `from_attributes=True` so ORM snake_case maps to camelCase JSON (`observedDomains`, `childId`, `activityId`, `isBaseline`).

```python
from typing import List, Dict, Literal, Optional, Annotated
from pydantic import BaseModel, ConfigDict, StringConstraints, Field
from pydantic.alias_generators import to_camel

DomainId = Literal["alphabet", "numbers", "colours", "art", "stories"]
ScoreVal = Literal[1, 2, 3]
ToneVal = Literal["teal", "sun", "coral", "sky", "primary"]
DifficultyVal = Literal["Easy", "Medium"]
LogOutcome = Literal["tried_helped", "tried_needs_support", "not_tried"]

TrimmedName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
TrimmedNote = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500)]

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

# --- Children ---
class ChildCreate(CamelModel):
    name: TrimmedName
    age: int = Field(..., ge=2, le=6)

class ChildUpdate(CamelModel):
    name: Optional[TrimmedName] = None
    age: Optional[int] = Field(None, ge=2, le=6)

class ChildResponse(CamelModel):
    id: str
    name: str
    age: int
    avatar: str
    tone: ToneVal
    scores: Dict[DomainId, ScoreVal]
    observed_domains: List[DomainId] = Field(default_factory=list)
    strengths: List[str]
    needs: List[str]

# --- Activities ---
class ActivityResponse(CamelModel):
    id: str
    name: str
    domain: DomainId
    difficulty: DifficultyVal
    minutes: int
    emoji: str
    skills: List[str]
    steps: List[str]
    for_level: List[ScoreVal]

# --- Observations ---
class ObservationCreate(CamelModel):
    child_id: str
    domain: DomainId
    activity_id: str
    score: ScoreVal
    note: TrimmedNote = ""

class ObservationUpdate(CamelModel):
    domain: Optional[DomainId] = None
    activity_id: Optional[str] = None
    score: Optional[ScoreVal] = None
    note: Optional[TrimmedNote] = None

class ObservationResponse(CamelModel):
    id: str
    child_id: str
    domain: DomainId
    activity_id: str
    score: ScoreVal
    note: str
    date: str
    is_baseline: bool = False

# --- Attendance ---
class AttendanceRecord(CamelModel):
    child_id: str
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    present: bool

class BulkAttendanceCreate(CamelModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    records: List[AttendanceRecord]

class AttendanceMapResponse(CamelModel):
    attendance: Dict[str, Dict[str, bool]]

# --- Activity Logs ---
class ActivityLogCreate(CamelModel):
    child_id: str
    activity_id: str
    completed_steps: int = Field(default=0, ge=0)
    total_steps: int = Field(default=0, ge=0)
    outcome: LogOutcome = "not_tried"
    note: Optional[TrimmedNote] = None

    # [PENDING APPROVAL: Bhakti] Additive validation: completed_steps <= total_steps
    @model_validator(mode="after")
    def validate_step_counts(self) -> "ActivityLogCreate":
        if self.total_steps > 0 and self.completed_steps > self.total_steps:
            raise ValueError("completed_steps cannot exceed total_steps")
        return self

> [!WARNING]
> **PENDING APPROVAL (Bhakti):** The additive step count validator on `ActivityLogCreate` (`completed_steps <= total_steps` when `total_steps > 0`) is pending approval from backend lead (Bhakti). No database columns, foreign keys, or cascade behaviors were modified.

class ActivityLogResponse(CamelModel):
    id: int
    child_id: str
    activity_id: str
    completed_steps: int
    total_steps: int
    outcome: LogOutcome
    note: Optional[str]
    created_at: str

# --- Recommendations (Member 3) ---
class ClientChildData(BaseModel):
    id: str
    name: str
    age: Optional[float] = 4.0
    strengths: Optional[List[str]] = []
    needs: Optional[List[str]] = []
    scores: Optional[dict] = {}

class ClientObservation(BaseModel):
    id: Optional[str] = None
    child_id: Optional[str] = None
    childId: Optional[str] = None
    domain: str
    score: Optional[int] = None
    note: Optional[str] = None
    date: Optional[str] = None

class ClientTrial(BaseModel):
    activity_id: Optional[str] = None
    activityId: Optional[str] = None
    outcome: str
    note: Optional[str] = None
    completed_steps: Optional[int] = None
    total_steps: Optional[int] = None
    created_at: Optional[str] = None

class PersonalizedRecommendationRequest(BaseModel):
    child_id: str
    limit_domains: int = 2
    child_data: Optional[ClientChildData] = None
    observations: Optional[List[ClientObservation]] = None
    recent_trials: Optional[List[ClientTrial]] = None

class RecommendationPedagogy(BaseModel):
    activity_id: str
    domain: str
    title: str
    reason: str
    observed_strengths: List[str] = Field(default_factory=list)
    focus_skills: List[str] = Field(default_factory=list)
    teaching_strategy: str
    teacher_steps: List[str] = Field(default_factory=list)
    success_criteria: str
    next_step_if_successful: str
    next_step_if_support_needed: str
    evidence: List[str] = Field(default_factory=list)
    is_ai_generated: bool = True

class ChildRecommendationResult(BaseModel):
    child_id: str
    recommendations: List[RecommendationPedagogy]
    generated_at: str
    model_used: Optional[str] = None
    fallback: bool = False
    fallback_reason: Optional[str] = None

class AIStatusResponse(BaseModel):
    configured: bool
    model: str
    engine: str = "Groq Hybrid Recommendation Engine"

# --- Dashboard ---
class DashboardSummaryResponse(CamelModel):
    total_children: int
    present_today: int
    needs_attention_count: int
    activities_done: int
    attention_list: List[ChildResponse]
    domain_distribution: Dict[DomainId, Dict[ScoreVal, int]]

# --- Health Check ---
class HealthResponse(CamelModel):
    status: str
    service: str
```

---

## 5. Domain Rules & Business Logic

### A. Child Creation (`POST /api/children`)

Matches [`src/lib/store.tsx`](file:///c:/Users/bhakti/Downloads/Bloom_cep/smooth-mobile-experience-main/src/lib/store.tsx#L87-L113):

1. **ID Generation:** Generates a URL-safe slug with a short random 4-character hex suffix:
   ```python
   import re, secrets
   slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
   child_id = f"{slug}-{secrets.token_hex(2)}"
   ```
2. **Initial State:**
   - `avatar`: Picked from avatars cyclically
   - `tone`: `"teal"`
   - `scores`: `{"alphabet": 1, "numbers": 1, "colours": 1, "art": 1, "stories": 1}`
   - `strengths`: `[]`
   - `needs`: `["First observations pending"]`
   - `observed_domains`: `[]` (unobserved)

### B. Observation Validation & Score Derivation Engine (`backend/app/services.py`)

Applies on `POST /api/observations`, `PUT /api/observations/{id}`, and `DELETE /api/observations/{id}`:

1. **Observation ID & Date Generation:**
   - ID is generated on the server using short UUID4 format: `f"obs-{uuid.uuid4().hex[:10]}"`.
   - Date is recorded as a UTC ISO 8601 string ending with `Z`: `datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")`.
2. **Existence Verification:** Return `404 Not Found` if `child_id` or `activity_id` does not exist.
3. **Merged Validation on Update (`PUT`):**  
   Validate that `domain` and `activity` match against **merged values**:
   ```python
   target_activity_id = update_data.get("activity_id") or existing_obs.activity_id
   target_domain = update_data.get("domain") or existing_obs.domain
   activity = db.query(Activity).filter_by(id=target_activity_id).first()
   if not activity:
       raise HTTPException(status_code=404, detail="Activity not found")
   if activity.domain != target_domain:
       raise HTTPException(status_code=422, detail=f"Activity '{activity.id}' domain '{activity.domain}' does not match observation domain '{target_domain}'")
   ```
4. **Score Derivation Rule:**
   For a given child, query all observations (including baseline) ordered by `date desc, id desc`:
   ```python
   DOMAIN_KEYS = ["alphabet", "numbers", "colours", "art", "stories"]
   DOMAIN_NAMES = {
       "alphabet": "Alphabet & Language",
       "numbers": "Numbers & Counting",
       "colours": "Colours & Shapes",
       "art": "Art & Creativity",
       "stories": "Stories, Habits & Games"
   }

   # Map each domain to its latest observation score
   latest_scores = {}
   for obs in child.observations:
       if obs.domain not in latest_scores:
           latest_scores[obs.domain] = obs.score

   new_scores = {}
   strengths = []
   needs = []

   for d in DOMAIN_KEYS:
       d_name = DOMAIN_NAMES[d]
       if d in latest_scores:
           # Observed domain: use latest observation score
           score = latest_scores[d]
           new_scores[d] = score
           if score == 3:
               strengths.append(f"Doing well in {d_name}")
           else:
               needs.append(f"More practice in {d_name}")
       else:
           # Unobserved domain: reset score to 1, remove strengths/needs for this domain
           new_scores[d] = 1

   if not latest_scores:
       needs = ["First observations pending"]

   # Reassign JSON columns to persist in SQLite
   child.scores = dict(new_scores)
   child.strengths = list(strengths)
   child.needs = list(needs)
   ```
5. **Frontend Store Refetch Invariant:**  
   After executing `POST`, `PUT`, or `DELETE` on `/api/observations`, the frontend store must re-fetch the updated child profile via `GET /api/children/{id}` to synchronize local state.

### C. Dashboard Summary Calculation (`GET /api/dashboard/summary`)

1. **Timezone:** "Today" is calculated strictly in the `Asia/Kolkata` timezone:
   ```python
   from zoneinfo import ZoneInfo
   from datetime import datetime
   today_kolkata = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d")
   ```
2. **`activities_done`:** Counts **non-baseline observations only**:
   `activities_done = db.query(Observation).filter(Observation.is_baseline == False).count()`
3. **`present_today`:** Count of attendance records where `date == today_kolkata` and `present == True`.
4. **Attention Invariant:**  
   `needs_attention_count` and `attention_list` count **only domains whose latest observation score is 1**. Children with no observations or only unobserved default scores are excluded. Ordered by lowest average score among observed domains.
5. **`domain_distribution`:** Counts **only observed domains**. Unobserved domains are not tallied.

### D. Recommendation Engine & Pedagogical Lifecycle (Member 3)

Operates via hybrid AI-powered recommendations (`POST /api/recommendations/personalized`) and status checks (`GET /api/recommendations/status`):

1. **Two-Active-Recommendation Invariant:**  
   The recommendation engine maintains exactly **2 active, observation-driven learning recommendations** per child whenever at least 2 eligible activities exist.
2. **Completed Activity Exclusion:**  
   Activities already completed in classroom trials (recorded as `tried_helped`, `tried_needs_support`, or `not_tried`) are excluded from pending recommendations so that Anganwadi teachers are never presented with redundant tasks.
3. **Pedagogical Scaffolding for `tried_needs_support`:**  
   When a child's recent classroom trial resulted in `tried_needs_support`, the engine detects this outcome and generates an explicit **support adaptation note** (linking back to the prior activity and prescribing simplified micro-steps, visual aids, or peer modeling).
4. **Hybrid AI & Deterministic Fallback:**  
   - Leverages Groq LLM (e.g. `openai/gpt-oss-120b`) with positive, non-diagnostic pedagogical prompts adhering strictly to preschool learning goals (Ages 3–4).
   - If Groq credentials are unconfigured, rate-limited, or offline, the engine automatically falls back to local deterministic rule-based pedagogy with `fallback: true` without errors or user interruption.
5. **Privacy & Security Guarantee:**  
   No child PII or tokens are exposed; `/api/recommendations/status` reports engine readiness without revealing API credentials.

---

## 6. Endpoints Specification

Base URL: `/api`  
Error Format: `{ "detail": "..." }` or `{ "detail": [{ "loc": [...], "msg": "..." }] }` (FastAPI 422 standard)

| Method   | Endpoint                            | Request Body                               | Status Code           | Response                    | Description                                                                             |
| -------- | ----------------------------------- | ------------------------------------------ | --------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| `GET`    | `/api/health`                       | None                                       | `200`                 | `{"status": "healthy"}`     | Health check                                                                            |
| `GET`    | `/api/children`                     | None                                       | `200`                 | `List[ChildResponse]`       | List all children (with `observedDomains`)                                              |
| `POST`   | `/api/children`                     | `ChildCreate`                              | `201`                 | `ChildResponse`             | Create child with slug ID & pending status                                              |
| `GET`    | `/api/children/{id}`                | None                                       | `200` / `404`         | `ChildResponse`             | Retrieve child profile                                                                  |
| `PUT`    | `/api/children/{id}`                | `ChildUpdate`                              | `200` / `404`         | `ChildResponse`             | Update child name/age                                                                   |
| `DELETE` | `/api/children/{id}`                | None                                       | `204` / `404`         | Empty (No Content)          | Cascade deletes child & related records                                                 |
| `GET`    | `/api/observations`                 | Query: `?child_id=&include_baseline=false` | `200`                 | `List[ObservationResponse]` | Get observations list (**excludes baseline by default**, ordered by date desc, id desc) |
| `POST`   | `/api/observations`                 | `ObservationCreate`                        | `201` / `404` / `422` | `ObservationResponse`       | Add observation & update scores                                                         |
| `PUT`    | `/api/observations/{id}`            | `ObservationUpdate`                        | `200` / `404` / `422` | `ObservationResponse`       | Merged validation update & recalculate scores                                           |
| `DELETE` | `/api/observations/{id}`            | None                                       | `204` / `404`         | Empty (No Content)          | Delete observation & recalculate scores                                                 |
| `GET`    | `/api/attendance`                   | Query: `?month=`                           | `200`                 | `AttendanceMapResponse`     | Full monthly attendance matrix                                                          |
| `POST`   | `/api/attendance`                   | `AttendanceRecord`                         | `200` / `201`         | `AttendanceRecord`          | Upsert single child attendance                                                          |
| `POST`   | `/api/attendance/bulk`              | `BulkAttendanceCreate`                     | `200`                 | `Dict[str, int]`            | Bulk upsert class attendance for date                                                   |
| `GET`    | `/api/activities`                   | Query: `?domain=`                          | `200`                 | `List[ActivityResponse]`    | List activity library                                                                   |
| `GET`    | `/api/activities/{id}`              | None                                       | `200` / `404`         | `ActivityResponse`          | Get single activity                                                                     |
| `GET`    | `/api/activity-logs`                | Query: `?child_id=`                        | `200`                 | `List[ActivityLogResponse]` | Filter activity logs by child (ordered newest-first by `created_at desc, id desc`)      |
| `POST`   | `/api/activity-logs`                | `ActivityLogCreate`                        | `201` / `404`         | `ActivityLogResponse`       | Log guided activity completion                                                          |
| `GET`    | `/api/recommendations/status`       | None                                       | `200`                 | `AIStatusResponse`          | Get Groq AI integration readiness, configured model, and engine mode                     |
| `POST`   | `/api/recommendations/personalized` | `PersonalizedRecommendationRequest`        | `200` / `404`         | `ChildRecommendationResult` | Observation-driven personalized pedagogy with Groq AI + deterministic fallback           |
| `GET`    | `/api/dashboard/summary`            | None                                       | `200`                 | `DashboardSummaryResponse`  | Dashboard KPIs & observed score distributions                                           |

---

## 7. Python Seed Plan (`backend/seed_data.py` & `backend/seed.py`)

1. **Baseline Observations:** `seed.py` creates 45 baseline observations (9 children × 5 domains) matching each child's initial score with:
   - `is_baseline = True`
   - `note = "Baseline"`
   - `date = 14 days ago in UTC ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)`
2. **Specific Observations:** Inserts the 6 specific seed observations (`o1` through `o6`) with:
   - `is_baseline = False`
   - `date = 1–4 days ago in UTC ISO 8601 (YYYY-MM-DDTHH:MM:SSZ)`
3. **Total Seeded Observations:** 51 observations (45 baseline + 6 seed).
4. **Derived Score Verification:** After seeding, `seed.py` runs post-seed verification comparing **only derived SCORES** against `SEED_CHILDREN`. It does **not** compare strengths/needs (the derivation engine generates its own text), and will never fail or crash because of them. Any score discrepancy is printed as a warning.
5. **Attendance:** Populates attendance records for past working days of the current month via `seed_attendance()`.

---

## 8. Frontend Integration Plan

### A. API Client (`src/lib/api.ts`)

Handles `204 No Content`, FastAPI list-based 422 error parsing, and `VITE_API_URL` environment injection:

```ts
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function apiRequest<T = void>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    let message = `HTTP Error ${res.status}`;
    if (errorData.detail) {
      if (Array.isArray(errorData.detail)) {
        message = errorData.detail
          .map((e: { msg?: string }) => e.msg || JSON.stringify(e))
          .join(", ");
      } else if (typeof errorData.detail === "string") {
        message = errorData.detail;
      }
    }
    throw new Error(message);
  }

  return res.json();
}
```

### B. Store Update (`src/lib/store.tsx`)

- Replace `localStorage` loading with `Promise.all([api.getChildren(), api.getObservations(), api.getAttendance()])`.
- `addObservation(o)` calls `await api.createObservation(o)` and immediately re-fetches the updated child (`await api.getChild(o.childId)`) to sync scores and observed domains.
- `addChild(name, age)` calls `await api.createChild(name, age)` and appends to context.
- `setPresent(childId, present)` calls `await api.setAttendance(childId, todayDate, present)`.
- **Recommendations:** `recommendFor(child)` remains 100% computed on the client side in [`src/lib/data.ts`](file:///c:/Users/bhakti/Downloads/Bloom_cep/smooth-mobile-experience-main/src/lib/data.ts#L469). Zero UI changes needed.

### C. CORS Configuration (`backend/app/main.py`)

Includes standard Vite dev ports and local ports (3000, 5173, 8080):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 9. Team Member Endpoint Assignment

| Team Member  | Module                               | Endpoints Assigned                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Member 2** | **Observations Engine**              | • `POST /api/observations` (record observation & trigger score update)<br>• `PUT /api/observations/{id}` (merged validation edit & recalculate)<br>• `DELETE /api/observations/{id}` (delete & recalculate)<br>• `GET /api/observations` (history & filter by `?child_id=`, default excludes baseline) |
| **Member 3** | **Recommendations & Guided Play**    | • `GET /api/activities` & `GET /api/activities/{id}` (activities metadata)<br>• `POST /api/activity-logs` (record activity steps, outcome, note)<br>• `GET /api/activity-logs?child_id=` (audit logs per child)<br>• `POST /api/recommendations/personalized` (hybrid Groq AI + deterministic pedagogical recommendations)<br>• `GET /api/recommendations/status` (AI model & readiness check)<br>• Enforces 2-active recommendation lifecycle, completion exclusion, and scaffolding adaptations |
| **Member 4** | **Dashboard, Attendance & Profiles** | • `GET /api/dashboard/summary` (aggregated stats in `Asia/Kolkata`)<br>• `GET /api/attendance` & `POST /api/attendance` (daily roll)<br>• `POST /api/attendance/bulk` (quick-marking)<br>• `GET /api/children`, `POST /api/children`, `PUT /api/children/{id}`, `DELETE /api/children/{id}`            |

---

## 10. Automated Test Checklist (`backend/tests/`)

- [ ] **PRAGMA Enforcement:** Direct SQL insertion of child observation with non-existent `child_id` raises SQLite foreign key error.
- [ ] **Absolute Path Verification:** Database is created directly in `backend/vikassetu.db` regardless of execution cwd.
- [ ] **Slug ID Generation:** `POST /api/children` generates unique slug with hex suffix (e.g. `arjun-3a1f`).
- [ ] **Observation Tie-Breaker Ordering:** Observations returned ordered by `date desc, id desc`.
- [ ] **Baseline Filtering:** `GET /api/observations` does not return rows with `is_baseline == True` by default.
- [ ] **Merged PUT Validation:** Updating `activity_id` without specifying `domain` validates against existing observation domain.
- [ ] **Zero-Observation Domain Score Reset:** Deleting all observations for a domain resets that domain's score to 1 and removes strengths/needs entries for that domain.
- [ ] **Cascade Delete:** Deleting a child deletes related observations, attendance records, and activity logs.
- [ ] **Dashboard Counts:** `activities_done` matches `SELECT COUNT(*) FROM observations WHERE is_baseline = 0`, and `domainDistribution` tallies only observed domains.
- [ ] **AI Recommendation Status:** `GET /api/recommendations/status` returns configuration status and model without leaking API key.
- [ ] **Deterministic Recommendation Fallback:** `POST /api/recommendations/personalized` returns valid recommendations with `fallback == True` when Groq is not configured or offline.
- [ ] **Activity Completion Exclusion:** Activities present in recent trials are never returned as pending recommendations.
- [ ] **Scaffolding Adaptation:** A prior trial outcome of `tried_needs_support` triggers scaffolding adaptations in teaching strategy.
- [ ] **Step Count Validation:** `POST /api/activity-logs` enforces `completed_steps <= total_steps` when `total_steps > 0` (pending Bhakti's approval).

---

## 11. Known Limitations

1. **No Teacher Authentication:** Single-classroom shared mode with full write/read access for classroom users.
2. **Formative, Non-Labeling Recommendations:** Recommendations are strictly formative and pedagogical, framing learning goals positively without diagnostic or deficit labeling.

---

## 12. Manual Setup Guide

1. **Navigate to the Backend Directory:**
   ```bash
   cd backend
   ```
2. **Create and Activate Virtual Environment:**
   - **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. **Install Dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```
4. **Seed Database:**
   ```bash
   python seed.py --reset
   ```
5. **Start Development Server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
6. **Open API Documentation:**
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
