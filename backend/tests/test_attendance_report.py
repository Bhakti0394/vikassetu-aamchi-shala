from app.attendance_report import today_ist


def test_report_pdf_today_default(client):
    r = client.get("/api/attendance/report/pdf")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert f"attendance-{today_ist()}.pdf" in r.headers["content-disposition"]
    assert r.content.startswith(b"%PDF")


def test_report_pdf_with_marked_and_unmarked(client):
    # test-aarav exists; mark present then absent, and an unmarked date
    client.post("/api/attendance", json={"childId": "test-aarav", "date": "2026-10-20", "present": True})
    r = client.get("/api/attendance/report/pdf?date=2026-10-20")
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    client.post("/api/attendance", json={"childId": "test-aarav", "date": "2026-10-20", "present": False})
    assert client.get("/api/attendance/report/pdf?date=2026-10-20").status_code == 200
    assert client.get("/api/attendance/report/pdf?date=2026-10-21").status_code == 200  # not marked


def test_report_pdf_bad_date(client):
    assert client.get("/api/attendance/report/pdf?date=nope").status_code == 422
    assert client.get("/api/attendance/report/pdf?date=2026-13-45").status_code == 422
