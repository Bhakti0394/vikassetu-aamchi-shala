import os
import sqlite3
import pytest
from fastapi.testclient import TestClient
from app.models import Activity
from conftest import TestingSessionLocal
from seed_data import ACTIVITIES

NEW_ACTIVITY_IDS = [
    "number-hopscotch",
    "bridge-builders",
    "colour-mixing-lab",
    "shadow-detective",
    "shape-hunt-walk",
    "rhythm-name-clap",
    "story-stones",
    "nature-treasure-mandala",
    "seed-diary",
    "freeze-and-feel-dance",
]

@pytest.fixture(autouse=True)
def seed_and_cleanup_activities():
    """Ensure all 21 catalog activities are available for activity tests and tear down cleanly."""
    db = TestingSessionLocal()
    inserted_ids = []
    try:
        for act in ACTIVITIES:
            existing = db.query(Activity).filter(Activity.id == act["id"]).first()
            if not existing:
                db.add(Activity(
                    id=act["id"],
                    name=act["name"],
                    domain=act["domain"],
                    difficulty=act["difficulty"],
                    minutes=act["minutes"],
                    emoji=act["emoji"],
                    skills=act["skills"],
                    steps=act["steps"],
                    for_level=act["for_level"],
                ))
                inserted_ids.append(act["id"])
        db.commit()
    finally:
        db.close()

    yield

    # Clean up inserted activities so other test modules maintain their isolated test databases
    db = TestingSessionLocal()
    try:
        if inserted_ids:
            db.query(Activity).filter(Activity.id.in_(inserted_ids)).delete(synchronize_session=False)
            db.commit()
    finally:
        db.close()


def test_activities_table_has_21_seeded_rows():
    """Verify after seeding that the activities table contains all 21 catalog activities."""
    db = TestingSessionLocal()
    try:
        catalog_count = db.query(Activity).filter(Activity.id.in_([a["id"] for a in ACTIVITIES])).count()
        assert catalog_count == 21, f"Expected 21 catalog activities, found {catalog_count}"
        assert len(ACTIVITIES) == 21, f"Expected ACTIVITIES list to have 21 items, got {len(ACTIVITIES)}"
    finally:
        db.close()


def test_seeded_sqlite_database_has_21_activities():
    """Verify the physical seeded backend/vikassetu.db contains exactly 21 activities."""
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "vikassetu.db")
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM activities;")
        row_count = cursor.fetchone()[0]
        conn.close()
        assert row_count == 21, f"Expected 21 rows in physical vikassetu.db, found {row_count}"


def test_each_new_activity_can_be_fetched_by_id(client: TestClient):
    """Verify GET /api/activities/{id} successfully returns each of the 10 new activities."""
    for act_id in NEW_ACTIVITY_IDS:
        response = client.get(f"/api/activities/{act_id}")
        assert response.status_code == 200, f"Failed fetching activity '{act_id}': {response.text}"
        data = response.json()
        assert data["id"] == act_id
        assert data["name"]
        assert data["domain"] in ["alphabet", "numbers", "colours", "art", "stories"]
        assert data["minutes"] in [10, 15, 20]
        assert data["difficulty"] in ["Easy", "Medium"]
        assert len(data["skills"]) in [2, 3]
        assert len(data["steps"]) in [3, 4, 5]


def test_activities_filtering_by_domain(client: TestClient):
    """Verify GET /api/activities?domain=numbers includes new number activities."""
    response = client.get("/api/activities?domain=numbers")
    assert response.status_code == 200
    activities = response.json()
    act_ids = [a["id"] for a in activities]
    assert "number-hopscotch" in act_ids
    assert "bridge-builders" in act_ids
