"""Mirrors the frontend's scoreDebate tests to confirm the port matches."""
from app.services.scoring import score_session


def _u(text):
    return {"sender": "user", "content": text}


def _ai(text="reply"):
    return {"sender": "ai", "content": text}


def test_empty_is_incomplete():
    r = score_session([_ai("Opening")], personality="strict-professor")
    assert r.overall == 0
    assert r.incomplete is True
    assert r.message_count == 0


def test_weak_debate_scores_low_but_nonzero():
    r = score_session(
        [_ai(), _u("no"), _ai(), _u("idk")],
        personality="aggressive-opponent",
    )
    assert 0 < r.overall < 60
    assert r.incomplete is False


def test_strong_evidence_rich_outscores_weak():
    strong_msgs = [
        _ai(),
        _u("According to a 2023 study published by MIT, 67% of developers reported that AI tools increased productivity by reducing time on boilerplate, though the research notes limits in complex architecture."),
        _ai(),
        _u("Data from Stanford's annual AI index report shows over 40% growth in enterprise adoption year over year, supporting the claim that this is becoming foundational."),
        _ai(),
        _u("Furthermore, a peer-reviewed paper in Nature Communications found similar statistics across three independent research groups, lending strong cross-validation."),
    ]
    strong = score_session(strong_msgs, personality="friendly-teacher")
    weak = score_session([_ai(), _u("no")], personality="aggressive-opponent")
    assert strong.overall > weak.overall
    assert strong.evidence > weak.evidence


def test_harder_personality_scores_same_content_lower():
    msgs = [
        _ai(),
        _u("According to a 2023 study, 67% of developers reported higher productivity, though there are limits in complex cases."),
    ]
    hard = score_session(msgs, personality="aggressive-opponent")
    easy = score_session(msgs, personality="friendly-teacher")
    assert easy.overall >= hard.overall


def test_undefined_personality_uses_neutral_multiplier():
    """Interview usage passes no personality — must not error or NaN."""
    r = score_session(
        [_ai(), _u("In my last role I cut latency 30% over 3 months, per our monitoring data.")],
        personality=None,
    )
    assert not r.incomplete
    for v in (r.overall, r.logic, r.evidence, r.clarity, r.persuasiveness):
        assert 0 <= v <= 100


def test_no_out_of_range_across_many_inputs():
    import random
    for _ in range(200):
        msgs = [_ai("Opening")]
        for _ in range(random.randint(0, 10)):
            msgs.append(_u("x" * random.randint(0, 300)))
        personality = random.choice(
            ["friendly-teacher", "strict-professor", "aggressive-opponent", "job-interviewer", None]
        )
        r = score_session(msgs, personality=personality)
        for v in (r.overall, r.logic, r.evidence, r.clarity, r.persuasiveness):
            assert 0 <= v <= 100
