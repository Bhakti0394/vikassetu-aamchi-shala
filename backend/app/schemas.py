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

class ActivityLogResponse(CamelModel):
    id: int
    child_id: str
    activity_id: str
    completed_steps: int
    total_steps: int
    outcome: LogOutcome
    note: Optional[str]
    created_at: str

# --- Dashboard ---
class DashboardSummaryResponse(CamelModel):
    total_children: int
    present_today: int
    needs_attention_count: int
    activities_done: int
    attention_list: List[ChildResponse]
    domain_distribution: Dict[DomainId, Dict[int, int]]

# --- Health Check ---
class HealthResponse(CamelModel):
    status: str
    service: str
