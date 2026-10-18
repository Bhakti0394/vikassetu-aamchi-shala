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

    id = Column(String(50), primary_key=True, index=True)
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
