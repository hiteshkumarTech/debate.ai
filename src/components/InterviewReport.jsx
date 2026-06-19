import { useMemo, useRef, useEffect, useState } from 'react';
import ScoreRing from './ScoreRing';
import { scoreDebate, toTenScale } from '../utils/scoreDebate';
import { saveCompletedInterview } from '../services/sessionService';
import './DebateReport.css';

// Interview-appropriate relabeling of the same four underlying signals the
// scoring engine produces. The engine measures structure/specifics/clarity/
// conviction regardless of whether it's a debate or interview answer.
const METRIC_COPY = {
  logic: {
    label: 'Structure',
    low: 'Use a clear framework — STAR for behavioral, approach-then-detail for technical.',
    high: 'Well-structured answer that was easy to follow.',
  },
  evidence: {
    label: 'Specifics',
    low: 'Add concrete details: numbers, names, measurable outcomes.',
    high: 'Strong use of specifics and measurable results.',
  },
  clarity: {
    label: 'Clarity',
    low: 'Fuller answers read as clearer — a single line is hard to evaluate.',
    high: 'Clear and articulate throughout.',
  },
  persuasiveness: {
    label: 'Conviction',
    low: 'Commit to your reasoning — hedge less, back your decisions.',
    high: 'Confident, convincing delivery.',
  },
};

function metricTone(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'low';
}

export default function InterviewReport({ config, messages, sessionId, onRetry, onNewInterview }) {
  const { question, category, company, role, aiModel } = config;

  // No personality in interviews — pass undefined so the engine uses its
  // neutral 1.0 difficulty multiplier (verified default behavior).
  const result = useMemo(
    () => scoreDebate({ messages, personality: undefined }),
    [messages]
  );

  const [aiFeedback, setAiFeedback] = useState(null);

  const hasSavedRef = useRef(false);
  useEffect(() => {
    if (hasSavedRef.current) return;
    if (result.incomplete) return;
    hasSavedRef.current = true;
    // Backend-first; falls back to localStorage automatically.
    (async () => {
      const res = await saveCompletedInterview({
        topic: question, category, company, aiModel, score: result, messages, sessionId,
      });
      const s = res?.session;
      if (s && s.score_source === 'ai') {
        setAiFeedback({
          summary: s.feedback_summary || '',
          strengths: s.feedback_strengths || [],
          improvements: s.feedback_improvements || [],
        });
      }
    })();
  }, [result, question, category, company, aiModel, messages, sessionId]);

  if (result.incomplete) {
    return (
      <div className="report report-empty">
        <h2 className="report-empty-title">No answer to score yet</h2>
        <p className="report-empty-sub">
          You ended the interview before answering. Jump back in and give the question a real attempt to get scored.
        </p>
        <div className="report-actions">
          <button type="button" className="report-btn-primary" onClick={onRetry}>
            Resume this interview
          </button>
          <button type="button" className="report-btn-ghost" onClick={onNewInterview}>
            Pick a new question
          </button>
        </div>
      </div>
    );
  }

  const metrics = [
    { key: 'logic', value: result.logic },
    { key: 'evidence', value: result.evidence },
    { key: 'clarity', value: result.clarity },
    { key: 'persuasiveness', value: result.persuasiveness },
  ];

  return (
    <div className="report">
      <div className="report-head">
        <span className="report-eyebrow">{category} interview complete</span>
        <h2 className="report-topic">{question}</h2>
        <div className="report-meta">
          <span className="report-meta-chip">{company}</span>
          <span className="report-meta-chip">{role}</span>
          <span className="report-meta-chip">{aiModel}</span>
          <span className="report-meta-chip">
            {result.messageCount} {result.messageCount === 1 ? 'response' : 'responses'}
          </span>
        </div>
      </div>

      <div className="report-score-row">
        <ScoreRing targetScore={result.overall} label="Overall" size={148} />
        <div className="report-score-summary">
          <p className="report-score-summary-text">
            {result.overall >= 75
              ? 'Strong interview — your answers were structured and specific.'
              : result.overall >= 50
              ? 'A reasonable attempt, with clear areas to tighten up below.'
              : 'Rough round, but every area below is coachable with practice.'}
          </p>
        </div>
      </div>

      <div className="report-metrics">
        {metrics.map((m) => {
          const copy = METRIC_COPY[m.key];
          const tone = metricTone(m.value);
          return (
            <div className="report-metric" key={m.key}>
              <div className="report-metric-top">
                <span className="report-metric-label">{copy.label}</span>
                <span className={`report-metric-score tone-${tone}`}>{toTenScale(m.value)}/10</span>
              </div>
              <div className="report-metric-track">
                <div className={`report-metric-fill tone-${tone}`} style={{ width: `${m.value}%` }} />
              </div>
              <p className="report-metric-tip">{tone === 'good' ? copy.high : copy.low}</p>
            </div>
          );
        })}
      </div>

      {aiFeedback && (
        <div className="report-ai-feedback">
          <div className="report-ai-feedback-head">
            <span className="report-ai-badge">AI evaluation</span>
          </div>
          {aiFeedback.summary && (
            <p className="report-ai-summary">{aiFeedback.summary}</p>
          )}
          {aiFeedback.strengths.length > 0 && (
            <div className="report-ai-block">
              <span className="report-ai-block-title report-ai-strong">What worked</span>
              <ul className="report-ai-list">
                {aiFeedback.strengths.map((s, i) => (
                  <li key={`s-${i}`}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {aiFeedback.improvements.length > 0 && (
            <div className="report-ai-block">
              <span className="report-ai-block-title report-ai-improve">To improve</span>
              <ul className="report-ai-list">
                {aiFeedback.improvements.map((s, i) => (
                  <li key={`i-${i}`}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="report-actions">
        <button type="button" className="report-btn-primary" onClick={onNewInterview}>
          Pick a new question
        </button>
        <button type="button" className="report-btn-ghost" onClick={onRetry}>
          Try this question again
        </button>
      </div>

      <p className="report-disclaimer">
        {aiFeedback
          ? 'Scored by AI evaluation of your full transcript.'
          : 'Scores are an early estimate based on response count, length, and specificity language — not a full AI evaluation yet.'}
      </p>
    </div>
  );
}
