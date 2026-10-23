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

def test_two_distinct_recommendations_initially(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post(
            "/api/recommendations/personalized",
            json={"child_id": "rec-aarav", "limit_domains": 2}
        )
        assert res.status_code == 200
        data = res.json()
        assert len(data["recommendations"]) == 2
        # Distinct activities
        act_ids = [r["activity_id"] for r in data["recommendations"]]
        assert len(set(act_ids)) == 2

def test_tried_needs_support_excludes_activity_and_refills_slot(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    # Complete rec-act-letter-sound with outcome tried_needs_support in client payload
    payload = {
        "child_id": "rec-aarav",
        "limit_domains": 2,
        "recent_trials": [
            {
                "activity_id": "rec-act-letter-sound",
                "outcome": "tried_needs_support",
                "note": "Child struggled with letter C",
            }
        ],
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert len(data["recommendations"]) == 2
        act_ids = [r["activity_id"] for r in data["recommendations"]]
        # rec-act-letter-sound MUST be excluded!
        assert "rec-act-letter-sound" not in act_ids
        # And exactly 2 distinct recommendations remain
        assert len(set(act_ids)) == 2

def test_offline_client_trial_excludes_before_backend_sync(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    # Offline saved trial not yet in DB
    payload = {
        "child_id": "rec-aarav",
        "limit_domains": 2,
        "recent_trials": [
            {
                "activity_id": "rec-act-count-match",
                "outcome": "tried_helped",
                "note": "Saved locally in indexeddb offline",
            }
        ],
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        act_ids = [r["activity_id"] for r in data["recommendations"]]
        # Immediately excluded even without DB record
        assert "rec-act-count-match" not in act_ids

def test_independent_recommendation_lists_between_children(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    # Aarav completed rec-act-count-match
    payload_aarav = {
        "child_id": "rec-aarav",
        "limit_domains": 2,
        "recent_trials": [
            {"activity_id": "rec-act-count-match", "outcome": "tried_helped"}
        ],
    }
    # Anaya has NOT completed rec-act-count-match
    payload_anaya = {
        "child_id": "rec-anaya",
        "limit_domains": 2,
        "recent_trials": [],
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res_aarav = client.post("/api/recommendations/personalized", json=payload_aarav)
        res_anaya = client.post("/api/recommendations/personalized", json=payload_anaya)

        assert res_aarav.status_code == 200
        assert res_anaya.status_code == 200

        aarav_acts = [r["activity_id"] for r in res_aarav.json()["recommendations"]]
        anaya_acts = [r["activity_id"] for r in res_anaya.json()["recommendations"]]

        # Aarav has it excluded
        assert "rec-act-count-match" not in aarav_acts
        # Anaya has numbers as weak domain and can still receive rec-act-count-match
        assert "rec-act-count-match" in anaya_acts

def test_not_tried_outcome_does_not_exclude_activity(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    # Anaya has numbers as weak domain and has no prior tried logs in DB
    payload = {
        "child_id": "rec-anaya",
        "limit_domains": 2,
        "recent_trials": [
            {"activity_id": "rec-act-count-match", "outcome": "not_tried"}
        ],
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        act_ids = [r["activity_id"] for r in data["recommendations"]]
        # not_tried must NOT exclude the activity
        assert "rec-act-count-match" in act_ids

def test_honest_count_when_fewer_than_two_eligible_activities_remain(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    # Total activities in test DB: test-alphabet-match, rec-act-letter-sound, rec-act-alphabet-match, rec-act-count-match
    # Complete 3 of them, so exactly 1 untried activity remains (rec-act-alphabet-match)
    payload = {
        "child_id": "rec-aarav",
        "limit_domains": 2,
        "recent_trials": [
            {"activity_id": "rec-act-letter-sound", "outcome": "tried_helped"},
            {"activity_id": "rec-act-count-match", "outcome": "tried_needs_support"},
            {"activity_id": "test-alphabet-match", "outcome": "tried_helped"},
        ],
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        recs = data["recommendations"]
        # Exactly 1 untried remains (rec-act-alphabet-match), no duplicate should be created!
        assert len(recs) == 1
        assert recs[0]["activity_id"] == "rec-act-alphabet-match"

def test_support_adaptation_strategy_when_tried_needs_support(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)
    db.close()

    payload = {
        "child_id": "rec-aarav",
        "limit_domains": 1,
        "recent_trials": [
            {
                "activity_id": "rec-act-letter-sound",
                "outcome": "tried_needs_support",
                "note": "Found letter C sounds hard",
            }
        ],
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        # Must contain Support Adaptation strategy
        assert "Support Adaptation" in rec["teaching_strategy"]
        assert "micro-steps" in rec["teaching_strategy"]

def test_new_activity_number_hopscotch_recommended_for_counting_beyond_5(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)

    # Seed number-hopscotch if not present
    hopscotch = db.query(Activity).filter(Activity.id == "number-hopscotch").first()
    if not hopscotch:
        hopscotch = Activity(
            id="number-hopscotch",
            name="Jump and Learn Numbers",
            domain="numbers",
            difficulty="Medium",
            minutes=15,
            emoji="🔢",
            skills=["Number recognition 1-10", "Counting forward", "Gross motor balance"],
            steps=["Draw hopscotch squares", "Call out number", "Child jumps to number"],
            for_level=[1, 2],
        )
        db.add(hopscotch)

    # Child aged 5.5 working on numbers domain with explicit need 'Counting beyond 5'
    anaya_5 = db.query(Child).filter(Child.id == "child-anaya-5").first()
    if not anaya_5:
        anaya_5 = Child(
            id="child-anaya-5",
            name="Anaya",
            age=5.5,
            avatar="👧🏽",
            tone="coral",
            scores={"numbers": 2},
            strengths=["Observation", "Pattern recognition"],
            needs=["Counting beyond 5", "Turn-taking"],
        )
        db.add(anaya_5)

    obs = db.query(Observation).filter(Observation.id == "obs-anaya-5-num").first()
    if not obs:
        obs = Observation(
            id="obs-anaya-5-num",
            child_id="child-anaya-5",
            domain="numbers",
            activity_id="rec-act-count-match",
            score=2,
            note="Counts comfortably to 5, ready for numbers up to 10",
            date="2026-10-19T10:00:00Z",
            is_baseline=False,
        )
        db.add(obs)
    db.commit()
    db.close()

    payload = {
        "child_id": "child-anaya-5",
        "limit_domains": 1,
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        # Should recommend Jump and Learn Numbers (number-hopscotch) over count-match
        assert rec["activity_id"] == "number-hopscotch"

def test_new_activity_freeze_dance_recommended_for_movement_needs(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)

    # Seed freeze-and-feel-dance and an alternative stories activity
    freeze_dance = db.query(Activity).filter(Activity.id == "freeze-and-feel-dance").first()
    if not freeze_dance:
        freeze_dance = Activity(
            id="freeze-and-feel-dance",
            name="Dance and Freeze",
            domain="stories",
            difficulty="Easy",
            minutes=10,
            emoji="💃",
            skills=["Emotional expression", "Gross motor control", "Impulse regulation"],
            steps=["Play music and dance", "Pause music and freeze", "Name the feeling"],
            for_level=[1, 2],
        )
        db.add(freeze_dance)

    puppet_story = db.query(Activity).filter(Activity.id == "rec-act-puppet-story").first()
    if not puppet_story:
        puppet_story = Activity(
            id="rec-act-puppet-story",
            name="Puppet Story Time",
            domain="stories",
            difficulty="Medium",
            minutes=15,
            emoji="🎭",
            skills=["Listening", "Vocabulary"],
            steps=["Hold puppets", "Tell simple story", "Ask questions"],
            for_level=[1, 2],
        )
        db.add(puppet_story)

    rohan = db.query(Child).filter(Child.id == "child-rohan-dance").first()
    if not rohan:
        rohan = Child(
            id="child-rohan-dance",
            name="Rohan",
            age=4.0,
            avatar="👦🏽",
            tone="sun",
            scores={"stories": 1},
            strengths=["High energy", "Loves outdoor play"],
            needs=["Sitting still for stories", "Impulse control"],
        )
        db.add(rohan)

    obs = db.query(Observation).filter(Observation.id == "obs-rohan-dance").first()
    if not obs:
        obs = Observation(
            id="obs-rohan-dance",
            child_id="child-rohan-dance",
            domain="stories",
            activity_id="rec-act-puppet-story",
            score=1,
            note="Very active; expresses feelings best when moving",
            date="2026-10-19T10:00:00Z",
            is_baseline=False,
        )
        db.add(obs)
    db.commit()
    db.close()

    payload = {
        "child_id": "child-rohan-dance",
        "limit_domains": 1,
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        # Should recommend Dance and Freeze (freeze-and-feel-dance)
        assert rec["activity_id"] == "freeze-and-feel-dance"

def test_unsuitable_activity_bridge_builders_excluded_for_level_1(client):
    from conftest import TestingSessionLocal
    db = TestingSessionLocal()
    seed_recommendation_data(db)

    # Seed bridge-builders (for level 2, 3) and an easy level 1 art activity
    bridge = db.query(Activity).filter(Activity.id == "bridge-builders").first()
    if not bridge:
        bridge = Activity(
            id="bridge-builders",
            name="Build a Bridge",
            domain="art",
            difficulty="Medium",
            minutes=20,
            emoji="🌉",
            skills=["Spatial reasoning", "Problem-solving", "Fine motor control"],
            steps=["Gather recycled materials", "Design bridge", "Test bridge stability"],
            for_level=[2, 3],
        )
        db.add(bridge)

    easy_art = db.query(Activity).filter(Activity.id == "rec-act-finger-paint").first()
    if not easy_art:
        easy_art = Activity(
            id="rec-act-finger-paint",
            name="Finger Paint Fun",
            domain="art",
            difficulty="Easy",
            minutes=10,
            emoji="🎨",
            skills=["Sensory exploration", "Colour recognition"],
            steps=["Dip fingers in paint", "Make handprints", "Talk about colours"],
            for_level=[1],
        )
        db.add(easy_art)

    # Child has Level 1 in art; bridge-builders requires Level 2 or 3
    tanya = db.query(Child).filter(Child.id == "child-tanya-art1").first()
    if not tanya:
        tanya = Child(
            id="child-tanya-art1",
            name="Tanya",
            age=3.5,
            avatar="👧🏽",
            tone="sun",
            scores={"art": 1},
            strengths=["Enjoys finger painting"],
            needs=["Beginning fine motor exploration"],
        )
        db.add(tanya)

    obs = db.query(Observation).filter(Observation.id == "obs-tanya-art1").first()
    if not obs:
        obs = Observation(
            id="obs-tanya-art1",
            child_id="child-tanya-art1",
            domain="art",
            activity_id="rec-act-finger-paint",
            score=1,
            note="Needs simple, direct sensory exploration",
            date="2026-10-19T10:00:00Z",
            is_baseline=False,
        )
        db.add(obs)

    db.commit()
    db.close()

    payload = {
        "child_id": "child-tanya-art1",
        "limit_domains": 1,
    }

    with patch("app.ai_recommendations.get_groq_api_key", return_value=None):
        res = client.post("/api/recommendations/personalized", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert len(data["recommendations"]) == 1
        rec = data["recommendations"][0]
        # Must NOT recommend bridge-builders (level 2/3) for level 1 child!
        assert rec["activity_id"] != "bridge-builders"
        assert rec["activity_id"] == "rec-act-finger-paint"



