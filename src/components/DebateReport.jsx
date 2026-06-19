import { useMemo, useRef, useEffect, useState } from 'react';
import ScoreRing from './ScoreRing';
import { scoreDebate, toTenScale } from '../utils/scoreDebate';
import { saveCompletedDebate } from '../services/sessionService';
import { PERSONALITIES } from '../data/personalities';
import './DebateReport.css';

const METRIC_COPY = {
  logic: {
    label: 'Logic',
    low: 'Try structuring claims as: premise, evidence, conclusion.',
    high: 'Your reasoning held together well across exchanges.',
  },
  evidence: {
    label: 'Evidence',
    low: 'Cite a specific source, study, or number next time.',
    high: 'Good use of concrete evidence to back up claims.',
  },
  clarity: {
    label: 'Clarity',
    low: 'Aim for fuller sentences — short replies read as unclear.',
    high: 'Your points came across clearly and were easy to follow.',
  },
  persuasiveness: {
    label: 'Persuasiveness',
    low: 'Anticipate the counter-argument before the AI raises it.',
    high: 'Convincing delivery — this would land well with a real audience.',
  },
};

function metricTone(score) {
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'low';
}

export default function DebateReport({ config, messages, sessionId, onRetry, onNewDebate }) {
  const { topic, side, personality, aiModel } = config;
  const personaInfo = PERSONALITIES.find((p) => p.id === personality);

  const result = useMemo(
    () => scoreDebate({ messages, personality }),
    [messages, personality]
  );

  // Save exactly once per completed debate. The ref guard matters because
  // React (especially StrictMode in dev) can re-run effects more than
  // once for the same mount — without the guard, "Try this topic again"
  // followed by ending that retry would risk a phantom double-save if
  // this component ever re-rendered before the effect's dependency
  // array changed.
  const [aiFeedback, setAiFeedback] = useState(null);

  const hasSavedRef = useRef(false);
  useEffect(() => {
    if (hasSavedRef.current) return;
    if (result.incomplete) return; // nothing to save — no arguments made
    hasSavedRef.current = true;
    // Backend-first; falls back to localStorage automatically if the
    // backend isn't configured/reachable. If the backend returns AI
    // evaluation feedback, surface it below the heuristic score breakdown.
    (async () => {
      const res = await saveCompletedDebate({
        topic, side, personality, aiModel, score: result, messages, sessionId,
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
  }, [result, topic, side, personality, aiModel, messages, sessionId]);

  if (result.incomplete) {
    return (
      <div className="report report-empty">
        <h2 className="report-empty-title">No arguments to score yet</h2>
        <p className="report-empty-sub">
          You ended the debate before making your opening case. Jump back in and make at least one argument to get a real score.
        </p>
        <div className="report-actions">
          <button type="button" className="report-btn-primary" onClick={onRetry}>
            Resume this debate
          </button>
          <button type="button" className="report-btn-ghost" onClick={onNewDebate}>
            Start a new debate
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
        <span className="report-eyebrow">Debate complete</span>
        <h2 className="report-topic">{topic}</h2>
        <div className="report-meta">
          <span className="report-meta-chip">You argued: {side === 'for' ? 'For' : 'Against'}</span>
          <span className="report-meta-chip">{personaInfo?.icon} {personaInfo?.name}</span>
          <span className="report-meta-chip">{aiModel}</span>
          <span className="report-meta-chip">{result.messageCount} {result.messageCount === 1 ? 'argument' : 'arguments'} made</span>
        </div>
      </div>

      <div className="report-score-row">
        <ScoreRing targetScore={result.overall} label="Overall score" size={148} />
        <div className="report-score-summary">
          <p className="report-score-summary-text">
            {result.overall >= 75
              ? 'Strong performance — your arguments held up well under pressure.'
              : result.overall >= 50
              ? 'A solid start, with clear room to sharpen specific areas below.'
              : 'This one was rough, but every metric below is fixable with practice.'}
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
                <div
                  className={`report-metric-fill tone-${tone}`}
                  style={{ width: `${m.value}%` }}
                />
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
        <button type="button" className="report-btn-primary" onClick={onNewDebate}>
          Start a new debate
        </button>
        <button type="button" className="report-btn-ghost" onClick={onRetry}>
          Try this topic again
        </button>
      </div>

      <p className="report-disclaimer">
        {aiFeedback
          ? 'Scored by AI evaluation of your full transcript.'
          : 'Scores shown are an early estimate based on message count, length, and evidence language — not a full AI evaluation yet.'}
      </p>
    </div>
  );
}
