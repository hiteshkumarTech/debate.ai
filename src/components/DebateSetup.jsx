import { useState, useMemo, useEffect } from 'react';
import { TOPIC_CATEGORIES, TOPICS, TOTAL_TOPIC_COUNT } from '../data/topics';
import { PERSONALITIES, AI_MODELS } from '../data/personalities';
import { listPersonas } from '../services/personaService';
import './DebateSetup.css';

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export default function DebateSetup({ onStart }) {
  const [activeCategory, setActiveCategory] = useState('technology');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [customTopic, setCustomTopic] = useState('');
  const [side, setSide] = useState('for');
  // Selecting a built-in personality clears any custom persona, and vice
  // versa — exactly one opponent is active at a time.
  const [personality, setPersonality] = useState(PERSONALITIES[0].id);
  const [customPersona, setCustomPersona] = useState(null); // {id,name,icon,instruction}
  const [savedPersonas, setSavedPersonas] = useState([]);
  const [aiModel, setAiModel] = useState(AI_MODELS[0].id);

  // Load the user's saved custom personas (backend or local). Non-blocking;
  // if there are none, the custom section just doesn't render.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listPersonas();
        if (!cancelled) setSavedPersonas(list);
      } catch {
        /* no personas available — fine */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const topicsForCategory = TOPICS[activeCategory] || [];

  const finalTopic = useMemo(() => {
    if (customTopic.trim()) return customTopic.trim();
    return selectedTopic;
  }, [customTopic, selectedTopic]);

  const canStart = Boolean(finalTopic);

  const handleCustomChange = (value) => {
    setCustomTopic(value);
    if (value.trim()) setSelectedTopic(null);
  };

  const handleTopicPick = (topicText) => {
    setSelectedTopic(topicText);
    setCustomTopic('');
  };

  const pickBuiltIn = (id) => {
    setPersonality(id);
    setCustomPersona(null);
  };

  const pickCustom = (persona) => {
    setCustomPersona(persona);
    setPersonality(null);
  };

  const handleStart = () => {
    if (!canStart) return;
    onStart({
      topic: finalTopic,
      side,
      // When a custom persona is chosen, send its instruction; otherwise
      // send the built-in personality id. Exactly one will be set.
      personality: customPersona ? null : personality,
      customPersonaInstruction: customPersona ? customPersona.instruction : null,
      personaLabel: customPersona ? customPersona.name : null,
      aiModel,
    });
  };

  return (
    <div className="setup">
      {/* Step 1: Topic */}
      <section className="setup-step">
        <div className="setup-step-head">
          <span className="setup-step-num">1</span>
          <div>
            <h2 className="setup-step-title">Choose your topic</h2>
            <p className="setup-step-sub">{TOTAL_TOPIC_COUNT}+ topics across 6 categories, or write your own.</p>
          </div>
        </div>

        <div className="setup-categories">
          {TOPIC_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`setup-category ${activeCategory === cat.id ? 'is-active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              type="button"
            >
              <span className="setup-category-icon" aria-hidden="true">{cat.icon}</span>
              <span className="setup-category-label">{cat.label}</span>
              <span className="setup-category-count">{(TOPICS[cat.id] || []).length}</span>
            </button>
          ))}
        </div>

        <div className="setup-topic-list">
          {topicsForCategory.map((t) => (
            <button
              key={t.text}
              type="button"
              className={`setup-topic-item ${selectedTopic === t.text ? 'is-selected' : ''}`}
              onClick={() => handleTopicPick(t.text)}
            >
              <span>{t.text}</span>
              <span className={`setup-topic-diff diff-${t.difficulty}`}>{DIFFICULTY_LABEL[t.difficulty]}</span>
            </button>
          ))}
        </div>

        <div className="setup-custom">
          <label htmlFor="custom-topic" className="setup-custom-label">Or write your own topic</label>
          <input
            id="custom-topic"
            type="text"
            className="setup-custom-input"
            placeholder="e.g. Pineapple belongs on pizza"
            value={customTopic}
            onChange={(e) => handleCustomChange(e.target.value)}
          />
        </div>
      </section>

      {/* Step 2: Side */}
      <section className="setup-step">
        <div className="setup-step-head">
          <span className="setup-step-num">2</span>
          <div>
            <h2 className="setup-step-title">Choose your side</h2>
            <p className="setup-step-sub">The AI will always argue the opposite.</p>
          </div>
        </div>
        <div className="setup-side-pair">
          <button
            type="button"
            className={`setup-side-btn for ${side === 'for' ? 'is-selected' : ''}`}
            onClick={() => setSide('for')}
          >
            For
          </button>
          <button
            type="button"
            className={`setup-side-btn against ${side === 'against' ? 'is-selected' : ''}`}
            onClick={() => setSide('against')}
          >
            Against
          </button>
        </div>
      </section>

      {/* Step 3: Personality */}
      <section className="setup-step">
        <div className="setup-step-head">
          <span className="setup-step-num">3</span>
          <div>
            <h2 className="setup-step-title">Choose your opponent</h2>
            <p className="setup-step-sub">Each personality argues with a different intensity.</p>
          </div>
        </div>
        <div className="setup-persona-grid">
          {PERSONALITIES.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`setup-persona-card ${!customPersona && personality === p.id ? 'is-selected' : ''}`}
              onClick={() => pickBuiltIn(p.id)}
            >
              <span className="setup-persona-icon" aria-hidden="true">{p.icon}</span>
              <span className="setup-persona-name">{p.name}</span>
              <span className="setup-persona-desc">{p.description}</span>
              <span className="setup-persona-level">{p.level}</span>
            </button>
          ))}
        </div>

        {/* Saved custom personas — only shown if the user has any. */}
        {savedPersonas.length > 0 && (
          <div className="setup-custom-personas">
            <div className="setup-custom-personas-head">
              <span className="setup-custom-personas-label">Your custom opponents</span>
              <a href="/personas" className="setup-custom-personas-manage">Manage →</a>
            </div>
            <div className="setup-persona-grid">
              {savedPersonas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`setup-persona-card ${customPersona?.id === p.id ? 'is-selected' : ''}`}
                  onClick={() => pickCustom(p)}
                >
                  <span className="setup-persona-icon" aria-hidden="true">{p.icon || '🎭'}</span>
                  <span className="setup-persona-name">{p.name}</span>
                  <span className="setup-persona-desc">
                    {p.instruction.length > 90 ? p.instruction.slice(0, 90) + '…' : p.instruction}
                  </span>
                  {p.intensity && <span className="setup-persona-level">{p.intensity}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Step 4: AI model */}
      <section className="setup-step">
        <div className="setup-step-head">
          <span className="setup-step-num">4</span>
          <div>
            <h2 className="setup-step-title">Choose your AI model</h2>
            <p className="setup-step-sub">Swap any time — your score is tracked the same way.</p>
          </div>
        </div>
        <div className="setup-model-grid">
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`setup-model-card ${aiModel === m.id ? 'is-selected' : ''}`}
              onClick={() => setAiModel(m.id)}
            >
              <div className="setup-model-top">
                <span className="setup-model-vendor">{m.vendor}</span>
                <span className={`setup-model-badge tone-${m.badgeTone}`}>{m.badge}</span>
              </div>
              <span className="setup-model-name">{m.name}</span>
              <span className="setup-model-blurb">{m.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="setup-footer">
        {!canStart && <p className="setup-footer-hint">Pick a topic above to begin.</p>}
        <button
          type="button"
          className="setup-start-btn"
          disabled={!canStart}
          onClick={handleStart}
        >
          Start debate
        </button>
      </div>
    </div>
  );
}
