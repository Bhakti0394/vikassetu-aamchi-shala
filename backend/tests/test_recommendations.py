import json
import pytest
from unittest.mock import patch, AsyncMock
import httpx
from fastapi.testclient import TestClient
from app.models import Child, Activity, Observation, ActivityLog
from app.main import app

def seed_recommendation_data(db):
    """Seed test data for Aarav and Anaya in test DB."""
    # Child Aarav
    aarav = db.query(Child).filter(Child.id == "rec-aarav").first()
    if not aarav:
        aarav = Child(
            id="rec-aarav",
            name="Aarav",
            age=4,
            avatar="👦🏽",
            tone="teal",
            scores={"alphabet": 1, "numbers": 2, "colours": 3, "art": 2, "stories": 2},
            strengths=["Recognises colours and sounds"],
            needs=["Alphabet recognition"],
        )
        db.add(aarav)

    # Child Anaya
    anaya = db.query(Child).filter(Child.id == "rec-anaya").first()
    if not anaya:
        anaya = Child(
            id="rec-anaya",
            name="Anaya",
            age=4,
            avatar="👧🏽",
            tone="coral",
            scores={"alphabet": 2, "numbers": 1, "colours": 2, "art": 3, "stories": 2},
            strengths=["Drawing and sorting"],
            needs=["Number counting beyond 4"],
        )
        db.add(anaya)

    # Child with no observations
    pending_child = db.query(Child).filter(Child.id == "rec-pending").first()
    if not pending_child:
        pending_child = Child(
            id="rec-pending",
            name="Pending Child",
            age=3,
            avatar="🧒🏽",
            tone="sun",
            scores={"alphabet": 1, "numbers": 1, "colours": 1, "art": 1, "stories": 1},
            strengths=[],
            needs=["First observations pending"],
        )
        db.add(pending_child)

    # Activities
    activities = [
        Activity(
            id="rec-act-letter-sound",
            name="Letter Sound Song",
            domain="alphabet",
            difficulty="Easy",
            minutes=10,
            emoji="🎵",
            skills=["Phonics", "Listening"],
            steps=["Sing letter sounds", "Point to letter card", "Repeat sound together"],
            for_level=[1, 2],
        ),
        Activity(
            id="rec-act-alphabet-match",
            name="Alphabet Card Match",
            domain="alphabet",
            difficulty="Medium",
            minutes=12,
            emoji="🔤",
            skills=["Letter recognition", "Visual discrimination"],
            steps=["Lay out cards", "Find matching letter pair", "Say letter name"],
            for_level=[1, 2],
        ),
        Activity(
            id="rec-act-count-match",
            name="Count & Match",
            domain="numbers",
            difficulty="Easy",
            minutes=10,
            emoji="🔢",
            skills=["Number recognition", "Counting"],
            steps=["Count physical counters", "Match numeral card", "Check 1-to-1 count"],
            for_level=[1, 2],
        ),
    ]
    for act in activities:
        if not db.query(Activity).filter(Activity.id == act.id).first():
            db.add(act)

    # Observations
    observations = [
        Observation(
            id="rec-obs-aarav-1",
            child_id="rec-aarav",
            domain="alphabet",
            activity_id="rec-act-letter-sound",
            score=1,
            note="Recognised A and B but needed help with C, D and E.",
            date="2026-10-18T10:00:00Z",
            is_baseline=False,
        ),
        Observation(
            id="rec-obs-anaya-1",
            child_id="rec-anaya",
            domain="numbers",
            activity_id="rec-act-count-match",
            score=1,
            note="Counted up to 4 correctly, then lost track.",
            date="2026-10-18T10:00:00Z",
            is_baseline=False,
        ),
    ]
    for obs in observations:
        if not db.query(Observation).filter(Observation.id == obs.id).first():
            db.add(obs)

    db.commit()

def test_recommendations_status(client):
    res = client.get("/api/recommendations/status")
    assert res.status_code == 200
    data = res.json()
    assert "configured" in data
    assert "model" in data
    assert data["engine"] == "Groq Hybrid Recommendation Engine"

def test_personalized_recommendation_nonexistent_child(client):
    res = client.post("/api/recommendations/personalized", json={"child_id": "nonexistent-xyz"})
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

def test_personalized_recommendation_child_without_observations(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    res = client.post("/api/recommendations/personalized", json={"child_id": "rec-pending"})
    assert res.status_code == 200
    data = res.json()
    assert data["child_id"] == "rec-pending"
    assert len(data["recommendations"]) == 0
    assert "First observations pending" in data["fallback_reason"]

def test_personalized_recommendation_mocked_groq_success(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    mock_llm_payload = {
        "activity_id": "rec-act-letter-sound",
        "domain": "alphabet",
        "title": "Letter Sound Practice for C, D, and E",
        "reason": "Aarav recognizes A and B independently. Introducing C, D, and E using familiar sounds builds foundational phonics.",
        "observed_strengths": ["Recognizes letters A and B independently"],
        "focus_skills": ["Phonics", "Targeted recognition of C, D, and E"],
        "teaching_strategy": "Start with known letters A and B as confidence builders, then introduce C with multisensory sound modeling.",
        "teacher_steps": [
            "Show letter card A and B, celebrate independent recognition.",
            "Introduce letter card C, pairing the letter shape with its phonetic sound.",
            "Ask Aarav to trace C and repeat the sound."
        ],
        "success_criteria": "Aarav independently names letter C and produces its sound in 2 out of 3 trials.",
        "next_step_if_successful": "Introduce letter D following the same pairing approach.",
        "next_step_if_support_needed": "Use tactile 3D letter tiles and mirror mouth movements.",
        "evidence": ["Recognised A and B but needed help with C, D and E."]
    }

    mock_response = httpx.Response(
        status_code=200,
        json={
            "choices": [
                {
                    "message": {
                        "content": json.dumps(mock_llm_payload)
                    }
                }
            ]
        },
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = client.post(
            "/api/recommendations/personalized",
            json={"child_id": "rec-aarav", "limit_domains": 1}
        )

        assert res.status_code == 200
        data = res.json()
        assert data["child_id"] == "rec-aarav"
        assert len(data["recommendations"]) == 1

        rec = data["recommendations"][0]
        assert rec["activity_id"] == "rec-act-letter-sound"
        assert rec["is_ai_generated"] is True
        assert "C, D, and E" in rec["title"]
        assert "Start with known letters A and B" in rec["teaching_strategy"]
        assert len(rec["teacher_steps"]) == 3
        assert "Aarav independently names letter C" in rec["success_criteria"]

def test_personalized_recommendation_hallucinated_activity_correction(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    # AI returned an activity ID not in candidate list
    mock_llm_payload = {
        "activity_id": "hallucinated-invented-activity-999",
        "domain": "alphabet",
        "title": "Invented Activity",
        "reason": "Test reason",
        "observed_strengths": ["Strengths"],
        "focus_skills": ["Phonics"],
        "teaching_strategy": "Test strategy",
        "teacher_steps": ["Step 1"],
        "success_criteria": "Observable measure",
        "next_step_if_successful": "Next challenge",
        "next_step_if_support_needed": "Scaffold",
        "evidence": ["Observation note"]
    }

    mock_response = httpx.Response(
        status_code=200,
        json={"choices": [{"message": {"content": json.dumps(mock_llm_payload)}}]},
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = client.post(
            "/api/recommendations/personalized",
            json={"child_id": "rec-aarav", "limit_domains": 1}
        )

        assert res.status_code == 200
        data = res.json()
        # Ensure corrected to valid candidate
        rec = data["recommendations"][0]
        assert rec["activity_id"] in ["test-alphabet-match", "rec-act-letter-sound", "rec-act-alphabet-match"]

def test_personalized_recommendation_fallback_on_groq_timeout(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Connection timed out")):
        res = client.post(
            "/api/recommendations/personalized",
            json={"child_id": "rec-aarav", "limit_domains": 1}
        )

        assert res.status_code == 200
        data = res.json()
        assert data["child_id"] == "rec-aarav"
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        # Fallback generated
        assert rec["is_ai_generated"] is False
        assert data["fallback"] is True
        assert "Alphabet & Language" in rec["reason"]

def test_personalized_recommendation_fallback_on_rate_limit(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    mock_rate_limit_resp = httpx.Response(
        status_code=429,
        json={"error": {"message": "Rate limit exceeded"}},
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_rate_limit_resp

        res = client.post(
            "/api/recommendations/personalized",
            json={"child_id": "rec-anaya", "limit_domains": 1}
        )

        assert res.status_code == 200
        data = res.json()
        assert data["child_id"] == "rec-anaya"
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        assert rec["is_ai_generated"] is False
        assert data["fallback"] is True

def test_personalized_recommendation_previous_helped_rotation(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)

    # Add activity log: Aarav previously completed rec-act-letter-sound and it helped
    log = ActivityLog(
        child_id="rec-aarav",
        activity_id="rec-act-letter-sound",
        completed_steps=3,
        total_steps=3,
        outcome="tried_helped",
        note="Mastered letter sounds nicely",
        created_at="2026-10-18T11:00:00Z"
    )
    db.add(log)
    db.commit()
    db.close()

    # When fallback or candidates are evaluated, rec-act-letter-sound should be rotated out in favor of rec-act-alphabet-match
    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post(
            "/api/recommendations/personalized",
            json={"child_id": "rec-aarav", "limit_domains": 1}
        )
        assert res.status_code == 200
        data = res.json()
        rec = data["recommendations"][0]
        # Rotated away from helped activity
        assert rec["activity_id"] != "rec-act-letter-sound"
        assert rec["activity_id"] in ["test-alphabet-match", "rec-act-alphabet-match"]

def test_client_payload_observations_and_ephemeral_child(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    payload = {
        "child_id": "ephemeral-child-99",
        "child_data": {
            "id": "ephemeral-child-99",
            "name": "Kavita",
            "age": 4.5,
            "strengths": ["Eager to learn"],
            "needs": ["Counting"],
            "scores": {"numbers": 1, "alphabet": 2}
        },
        "observations": [
            {
                "id": "client-obs-1",
                "child_id": "ephemeral-child-99",
                "domain": "numbers",
                "score": None,  # Missing score!
                "note": "Counted fingers up to 3 then hesitated",
                "date": "2026-10-18T12:00:00Z"
            }
        ],
        "limit_domains": 1
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["child_id"] == "ephemeral-child-99"
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        assert rec["domain"] == "numbers"
        # Verify evidence was not lost
        assert any("Counted fingers up to 3" in e for e in rec["evidence"])

def test_single_assessed_domain_level_3_provides_recommendation(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    # Child Yash with only Alphabet Level 3 assessed
    payload = {
        "child_id": "yash-test-3",
        "child_data": {
            "id": "yash-test-3",
            "name": "Yash",
            "age": 5.0,
            "strengths": ["Letters"],
            "needs": [],
            "scores": {"alphabet": 3, "numbers": 2}
        },
        "observations": [
            {
                "id": "obs-yash-3",
                "domain": "alphabet",
                "score": 3,
                "note": "Mastered letter sounds song completely",
                "date": "2026-10-18T12:00:00Z"
            }
        ],
        "limit_domains": 1
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        assert rec["domain"] == "alphabet"
        assert "creative extension" in rec["reason"].lower() or "mastery" in rec["reason"].lower()
