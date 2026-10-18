from fastapi.testclient import TestClient

def test_create_activity_log_success(client: TestClient):
    payload = {
        "childId": "test-aarav",
        "activityId": "test-alphabet-match",
        "completedSteps": 2,
        "totalSteps": 2,
        "outcome": "tried_helped",
        "note": "Aarav enjoyed matching letter cards",
    }
    response = client.post("/api/activity-logs", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["childId"] == "test-aarav"
    assert data["activityId"] == "test-alphabet-match"
    assert data["completedSteps"] == 2
    assert data["totalSteps"] == 2
    assert data["outcome"] == "tried_helped"
    assert data["note"] == "Aarav enjoyed matching letter cards"
    assert "createdAt" in data
    assert "id" in data

def test_create_activity_log_unknown_child_404(client: TestClient):
    payload = {
        "childId": "unknown-child-999",
        "activityId": "test-alphabet-match",
        "completedSteps": 1,
        "totalSteps": 2,
        "outcome": "tried_needs_support",
    }
    response = client.post("/api/activity-logs", json=payload)
    assert response.status_code == 404
    assert "Child 'unknown-child-999' not found" in response.json()["detail"]

def test_create_activity_log_unknown_activity_404(client: TestClient):
    payload = {
        "childId": "test-aarav",
        "activityId": "unknown-act-999",
        "completedSteps": 1,
        "totalSteps": 2,
        "outcome": "tried_needs_support",
    }
    response = client.post("/api/activity-logs", json=payload)
    assert response.status_code == 404
    assert "Activity 'unknown-act-999' not found" in response.json()["detail"]

def test_create_activity_log_invalid_steps_422(client: TestClient):
    payload = {
        "childId": "test-aarav",
        "activityId": "test-alphabet-match",
        "completedSteps": 5,
        "totalSteps": 2,
        "outcome": "tried_helped",
    }
    response = client.post("/api/activity-logs", json=payload)
    assert response.status_code == 422
    assert "completed_steps cannot exceed total_steps" in str(response.json())

def test_create_activity_log_invalid_outcome_422(client: TestClient):
    payload = {
        "childId": "test-aarav",
        "activityId": "test-alphabet-match",
        "completedSteps": 1,
        "totalSteps": 2,
        "outcome": "not_a_valid_outcome",
    }
    response = client.post("/api/activity-logs", json=payload)
    assert response.status_code == 422

def test_get_activity_logs_ordering(client: TestClient):
    # Log 1
    client.post(
        "/api/activity-logs",
        json={
            "childId": "test-aarav",
            "activityId": "test-alphabet-match",
            "completedSteps": 1,
            "totalSteps": 2,
            "outcome": "not_tried",
            "note": "First trial",
        },
    )
    # Log 2
    client.post(
        "/api/activity-logs",
        json={
            "childId": "test-aarav",
            "activityId": "test-alphabet-match",
            "completedSteps": 2,
            "totalSteps": 2,
            "outcome": "tried_helped",
            "note": "Second trial",
        },
    )

    response = client.get("/api/activity-logs")
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) >= 2
    # Verify newest first: the latest log should have higher or equal id and latest createdAt
    assert logs[0]["id"] > logs[1]["id"]
    assert logs[0]["createdAt"] >= logs[1]["createdAt"]

def test_get_activity_logs_filter_child(client: TestClient):
    response = client.get("/api/activity-logs?child_id=test-aarav")
    assert response.status_code == 200
    logs = response.json()
    for log in logs:
        assert log["childId"] == "test-aarav"

def test_get_activities_and_filter(client: TestClient):
    response = client.get("/api/activities?domain=alphabet")
    assert response.status_code == 200
    activities = response.json()
    assert len(activities) >= 1
    assert activities[0]["domain"] == "alphabet"

    # Single activity lookup
    res_single = client.get("/api/activities/test-alphabet-match")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == "test-alphabet-match"

    # Unknown activity returns 404
    res_unknown = client.get("/api/activities/non-existent-activity")
    assert res_unknown.status_code == 404
