"""Tests for AI evaluation, using a fake live provider (no real key needed)."""
from app.services.ai_evaluation import evaluate_session, _extract_json
from app.services import ai_evaluation
from app.services.ai_providers.base import AIProvider


class FakeProvider(AIProvider):
    name = "fake"
    is_live = True
    def __init__(self, reply): self._reply = reply
    def generate_reply(self, system_prompt, history): return self._reply


SAMPLE = [
    {"sender": "ai", "content": "I argue against. Your case?"},
    {"sender": "user", "content": "According to a 2023 MIT study, 67% of developers saw gains, with data on 40% adoption growth."},
]


def test_ai_eval_parses_clean_json(monkeypatch):
    reply = '{"logic": 82, "evidence": 90, "clarity": 75, "persuasiveness": 70, "summary": "Solid, evidence-led case.", "strengths": ["Cited specific studies"], "improvements": ["Address counterarguments"]}'
    monkeypatch.setattr(ai_evaluation, "get_provider", lambda m=None: FakeProvider(reply))
    r = evaluate_session(SAMPLE, personality=None, ai_model="claude")
    assert r.source == "ai"
    assert r.logic == 82 and r.evidence == 90 and r.clarity == 75 and r.persuasiveness == 70
    assert r.overall == round((82+90+75+70)/4)
    assert "evidence-led" in r.summary
    assert r.strengths == ["Cited specific studies"]
    assert r.improvements == ["Address counterarguments"]


def test_ai_eval_handles_json_in_fences(monkeypatch):
    reply = 'Here is my evaluation:\n```json\n{"logic": 50, "evidence": 60, "clarity": 55, "persuasiveness": 45}\n```'
    monkeypatch.setattr(ai_evaluation, "get_provider", lambda m=None: FakeProvider(reply))
    r = evaluate_session(SAMPLE, ai_model="claude")
    assert r.source == "ai"
    assert r.logic == 50 and r.persuasiveness == 45


def test_ai_eval_clamps_out_of_range(monkeypatch):
    reply = '{"logic": 150, "evidence": -10, "clarity": 55, "persuasiveness": 60}'
    monkeypatch.setattr(ai_evaluation, "get_provider", lambda m=None: FakeProvider(reply))
    r = evaluate_session(SAMPLE, ai_model="claude")
    assert r.logic == 100 and r.evidence == 0  # clamped


def test_ai_eval_falls_back_on_garbage(monkeypatch):
    monkeypatch.setattr(ai_evaluation, "get_provider", lambda m=None: FakeProvider("I cannot evaluate this, sorry!"))
    r = evaluate_session(SAMPLE, personality="strict-professor", ai_model="claude")
    assert r.source == "heuristic"  # unparseable -> fallback
    assert 0 <= r.overall <= 100


def test_ai_eval_falls_back_when_provider_not_live(monkeypatch):
    class DeadProvider(AIProvider):
        name = "echo"; is_live = False
        def generate_reply(self, s, h): return "x"
    monkeypatch.setattr(ai_evaluation, "get_provider", lambda m=None: DeadProvider())
    r = evaluate_session(SAMPLE, ai_model="claude")
    assert r.source == "heuristic"


def test_ai_eval_incomplete_short_circuits(monkeypatch):
    # No user turns -> incomplete, never calls provider
    called = {"n": 0}
    class Spy(AIProvider):
        name = "spy"; is_live = True
        def generate_reply(self, s, h): called["n"] += 1; return "{}"
    monkeypatch.setattr(ai_evaluation, "get_provider", lambda m=None: Spy())
    r = evaluate_session([{"sender": "ai", "content": "Opening only"}], ai_model="claude")
    assert r.incomplete is True
    assert called["n"] == 0  # provider never called for an empty transcript


def test_extract_json_helper():
    assert _extract_json('{"a": 1}') == {"a": 1}
    assert _extract_json('prefix {"a": 2} suffix') == {"a": 2}
    assert _extract_json('```json\n{"a": 3}\n```') == {"a": 3}
    assert _extract_json('no json here') is None
    assert _extract_json('') is None
