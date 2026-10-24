import sys
from pathlib import Path

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Child, Activity

# Isolated SQLite in-memory database with StaticPool so all connections share the same memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed isolated test child
    test_child = Child(
        id="test-aarav",
        name="Aarav Test",
        age=4,
        avatar="👦🏽",
        tone="teal",
        scores={"alphabet": 1, "numbers": 2, "colours": 3, "art": 2, "stories": 2},
        strengths=["Recognises colours"],
        needs=["Alphabet"],
    )
    db.add(test_child)

    # Seed isolated test activity
    test_activity = Activity(
        id="test-alphabet-match",
        name="Alphabet Match Test",
        domain="alphabet",
        difficulty="Easy",
        minutes=10,
        emoji="🔤",
        skills=["Letter sounds", "Visual matching"],
        steps=["Step 1", "Step 2"],
        for_level=[1, 2],
    )
    db.add(test_activity)

    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture(autouse=True)
def reset_recommendation_cache():
    from app.routers.recommendations import clear_recommendation_cache
    clear_recommendation_cache()
    yield
    clear_recommendation_cache()
