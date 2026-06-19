"""
End-to-end API test. Uses FastAPI's TestClient against a fresh SQLite DB
and dev-mode auth (X-Dev-User header), exercising the real request →
route → DB → response pipeline. This is as close to "it works" as I can
verify without live Postgres/Firebase/AI keys.
"""
import os
import tempfile

import pytest


@pytest.fixture
def client():
    # Point at a throwaway SQLite file and reset cached settings BEFORE
    # importing the app, so the engine binds to the temp DB.
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    os.environ["DATABASE_URL"] = f"sqlite:///{tmp.name}"
    os.environ.pop("FIREBASE_CREDENTIALS_PATH", None)  # ensure dev-mode auth

    # Fresh imports with cache cleared.
    from app.core import config
    config.get_settings.cache_clear()

    import importlib
    import app.db.session as dbsession
    importlib.reload(dbsession)
    import app.models.entities as entities
    importlib.reload(entities)
    import app.main as main
    importlib.reload(main)

    from fastapi.testclient import TestClient
    with TestClient(main.app) as c:
        yield c

    os.unlink(tmp.name)


AUTH = {"X-Dev-User": "tester"}


def test_health_is_open():
    # health needs no auth and no DB binding subtleties
    from fastapi.testclient import TestClient
    from app.main import app
    r = TestClient(app).get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_auth_required(client):
    # No X-Dev-User header -> 401
    assert client.get("/api/sessions").status_code == 401


def test_full_session_lifecycle(client):
    # 1. Create a debate session
    r = client.post(
        "/api/sessions",
        headers=AUTH,
        json={
            "kind": "debate",
            "topic": "AI will replace programmers",
            "ai_model": "claude",
            "side": "for",
            "personality": "strict-professor",
        },
    )
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    assert r.json()["status"] == "active"

    # 2. It shows up as resumable (active)
    active = client.get("/api/sessions/active", headers=AUTH).json()
    assert any(s["id"] == sid for s in active)

    # 3. Complete it with a transcript -> gets scored, marked completed
    r = client.post(
        f"/api/sessions/{sid}/complete",
        headers=AUTH,
        json={
            "messages": [
                {"sender": "ai", "content": "I argue against. Your case?"},
                {"sender": "user", "content": "According to a 2023 MIT study, 67% of developers saw productivity gains, with data showing 40% adoption growth."},
                {"sender": "ai", "content": "Sources?"},
                {"sender": "user", "content": "The Stanford AI Index report and a peer-reviewed Nature paper both confirm these statistics across independent research groups."},
            ]
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "completed"
    assert body["score_overall"] is not None
    assert 0 <= body["score_overall"] <= 100
    assert len(body["messages"]) == 4
    # transcript order preserved
    assert body["messages"][0]["turn_index"] == 0
    assert body["messages"][-1]["turn_index"] == 3

    # 4. Completing again is blocked (idempotency)
    r2 = client.post(f"/api/sessions/{sid}/complete", headers=AUTH, json={"messages": []})
    assert r2.status_code == 409

    # 5. No longer resumable
    active2 = client.get("/api/sessions/active", headers=AUTH).json()
    assert not any(s["id"] == sid for s in active2)

    # 6. Appears in History list
    hist = client.get("/api/sessions", headers=AUTH).json()
    assert any(s["id"] == sid for s in hist)

    # 7. Analytics reflects the completed session
    analytics = client.get("/api/analytics", headers=AUTH).json()
    assert analytics["total_sessions"] == 1
    assert analytics["total_debates"] == 1
    assert analytics["average_score"] == body["score_overall"]
    assert analytics["streak_days"] >= 1

    # 8. Leaderboard includes the current user
    lb = client.get("/api/leaderboard", headers=AUTH).json()
    assert lb["current_user_rank"] is not None
    assert any(row["is_current_user"] for row in lb["rows"])


def test_ai_reply_echo_fallback(client):
    # With no AI keys, /api/ai/reply returns the labeled echo placeholder.
    r = client.post(
        "/api/ai/reply",
        headers=AUTH,
        json={
            "kind": "debate",
            "topic": "Remote work is better",
            "side": "for",
            "personality": "friendly-teacher",
            "history": [{"sender": "user", "content": "Remote work boosts focus."}],
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_live"] is False
    assert body["provider"] == "echo"
    assert "placeholder" in body["reply"].lower()


def test_interview_session_scores_without_personality(client):
    r = client.post(
        "/api/sessions",
        headers=AUTH,
        json={"kind": "interview", "topic": "Tell me about a failure", "category": "Behavioral", "company": "Google"},
    )
    sid = r.json()["id"]
    r = client.post(
        f"/api/sessions/{sid}/complete",
        headers=AUTH,
        json={"messages": [
            {"sender": "ai", "content": "Tell me about a failure."},
            {"sender": "user", "content": "I led a migration that initially failed; I measured the regression, found the root cause in our caching layer, and cut errors 90% on the retry."},
        ]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["score_overall"] is not None


def test_persona_crud_and_use(client):
    # Create a custom persona
    r = client.post(
        "/api/personas",
        headers=AUTH,
        json={
            "name": "Hostile Investor",
            "icon": "💼",
            "instruction": "You are a hostile venture capitalist. Interrupt, demand ROI numbers, and dismiss vague claims.",
            "intensity": "intense",
        },
    )
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    assert r.json()["name"] == "Hostile Investor"

    # It appears in the list
    personas = client.get("/api/personas", headers=AUTH).json()
    assert any(p["id"] == pid for p in personas)

    # Using its instruction in an AI reply request is accepted (echo path)
    r = client.post(
        "/api/ai/reply",
        headers=AUTH,
        json={
            "kind": "debate",
            "topic": "Our startup will dominate the market",
            "side": "for",
            "custom_persona_instruction": "You are a hostile venture capitalist who demands hard numbers.",
            "history": [{"sender": "user", "content": "We'll capture 50% market share."}],
        },
    )
    assert r.status_code == 200, r.text

    # Delete it
    assert client.delete(f"/api/personas/{pid}", headers=AUTH).status_code == 204
    personas2 = client.get("/api/personas", headers=AUTH).json()
    assert not any(p["id"] == pid for p in personas2)


def test_persona_isolation_between_users(client):
    # User A creates a persona
    client.post(
        "/api/personas",
        headers={"X-Dev-User": "alice"},
        json={"name": "Alice's Persona", "instruction": "Be skeptical."},
    )
    # User B should not see it
    b_personas = client.get("/api/personas", headers={"X-Dev-User": "bob"}).json()
    assert not any(p["name"] == "Alice's Persona" for p in b_personas)


def test_resume_lifecycle_no_duplicate(client):
    """Full Resume flow: start active -> persist turns -> rehydrate ->
    complete the SAME session (no duplicate)."""
    # 1. start an active session
    r = client.post("/api/sessions", headers=AUTH, json={
        "kind": "debate", "topic": "AI will replace programmers",
        "ai_model": "claude", "side": "for", "personality": "strict-professor"})
    assert r.status_code == 201
    sid = r.json()["id"]
    assert r.json()["status"] == "active"

    # 2. persist mid-conversation turns (DebateChat.persistTurns)
    r = client.post(f"/api/sessions/{sid}/messages", headers=AUTH, json={"messages": [
        {"sender": "ai", "content": "I argue against. Make your case."},
        {"sender": "user", "content": "AI tools already write production code."},
        {"sender": "ai", "content": "Snippets are not replacement. Evidence?"}]})
    assert r.status_code == 200
    assert len(r.json()["messages"]) == 3

    # 3. it's resumable
    active = client.get("/api/sessions/active", headers=AUTH).json()
    assert any(x["id"] == sid for x in active)

    # 4. rehydrate: transcript intact and correctly ordered
    detail = client.get(f"/api/sessions/{sid}", headers=AUTH).json()
    assert detail["status"] == "active"
    assert [m["turn_index"] for m in detail["messages"]] == [0, 1, 2]
    assert detail["messages"][1]["content"] == "AI tools already write production code."

    # 5. complete THE SAME session (resume completion path)
    r = client.post(f"/api/sessions/{sid}/complete", headers=AUTH, json={"messages": [
        {"sender": "ai", "content": "I argue against."},
        {"sender": "user", "content": "According to a 2023 GitHub study, 40% of code suggestions were accepted, showing measurable real-world impact and data."},
        {"sender": "ai", "content": "That is assistance, not replacement."},
        {"sender": "user", "content": "The trend data shows accelerating capability across the whole industry."}]})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    assert r.json()["score_overall"] > 0

    # 6. NO duplicate — exactly one session, now completed
    alls = client.get("/api/sessions", headers=AUTH).json()
    assert len(alls) == 1
    assert alls[0]["status"] == "completed"

    # 7. no longer resumable
    active2 = client.get("/api/sessions/active", headers=AUTH).json()
    assert not any(x["id"] == sid for x in active2)


def test_resume_interview_lifecycle(client):
    """Same resume flow for an interview session."""
    r = client.post("/api/sessions", headers=AUTH, json={
        "kind": "interview", "topic": "Tell me about a failure",
        "category": "Behavioral", "company": "Google"})
    sid = r.json()["id"]
    client.post(f"/api/sessions/{sid}/messages", headers=AUTH, json={"messages": [
        {"sender": "ai", "content": "Tell me about a failure."},
        {"sender": "user", "content": "I led a migration that failed initially."}]})
    detail = client.get(f"/api/sessions/{sid}", headers=AUTH).json()
    assert detail["kind"] == "interview"
    assert len(detail["messages"]) == 2
    r = client.post(f"/api/sessions/{sid}/complete", headers=AUTH, json={"messages": [
        {"sender": "ai", "content": "Tell me about a failure."},
        {"sender": "user", "content": "I led a migration that failed; I measured the regression, found the caching root cause, and cut errors 90% on retry."}]})
    assert r.status_code == 200
    assert r.json()["score_overall"] is not None
    alls = client.get("/api/sessions", headers=AUTH).json()
    assert len(alls) == 1


def test_complete_session_surfaces_ai_feedback(client, monkeypatch):
    """When AI evaluation is active, completing a session stores and returns
    the written feedback + ai source."""
    from app.services import ai_evaluation
    from app.services.ai_providers.base import AIProvider

    class FakeProvider(AIProvider):
        name = "fake"; is_live = True
        def generate_reply(self, s, h):
            return '{"logic": 80, "evidence": 85, "clarity": 78, "persuasiveness": 72, "summary": "Strong evidence-based case.", "strengths": ["Cited concrete data"], "improvements": ["Tighten the conclusion"]}'

    monkeypatch.setattr(ai_evaluation, "get_provider", lambda m=None: FakeProvider())

    r = client.post("/api/sessions", headers=AUTH, json={
        "kind": "debate", "topic": "Nuclear energy is the future", "side": "for", "personality": "strict-professor"})
    sid = r.json()["id"]
    r = client.post(f"/api/sessions/{sid}/complete", headers=AUTH, json={"messages": [
        {"sender": "ai", "content": "I argue against."},
        {"sender": "user", "content": "Nuclear provides reliable baseload with near-zero carbon, per IEA 2023 data showing strong capacity factors."}]})
    assert r.status_code == 200
    body = r.json()
    assert body["score_source"] == "ai"
    assert body["score_overall"] == round((80+85+78+72)/4)
    assert body["feedback_summary"] == "Strong evidence-based case."
    assert body["feedback_strengths"] == ["Cited concrete data"]
    assert body["feedback_improvements"] == ["Tighten the conclusion"]
