import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listPersonas, createPersona, deletePersona } from '../services/personaService';
import { api } from '../services/api';
import { auth } from '../firebase';
import './Personas.css';

// Starter examples users can load into the form with one click — straight
// from the brief's suggested personas.
const PRESETS = [
  {
    name: 'Hostile Investor',
    icon: '💼',
    intensity: 'intense',
    instruction:
      'You are a hostile venture capitalist. Interrupt, demand hard ROI numbers and unit economics, and dismiss vague or hand-wavy claims. Be skeptical of every assumption.',
  },
  {
    name: 'Skeptical Stakeholder',
    icon: '🤨',
    intensity: 'balanced',
    instruction:
      'You are a skeptical stakeholder. Question the impact, the risks, and whether this is worth the cost. Ask "why now" and "what could go wrong" repeatedly.',
  },
  {
    name: 'Startup Founder',
    icon: '🚀',
    intensity: 'balanced',
    instruction:
      'You are a fast-moving startup founder. Push for speed and bold bets, challenge anything that sounds slow or bureaucratic, and demand a clear competitive edge.',
  },
  {
    name: 'Executive Reviewer',
    icon: '🏛️',
    intensity: 'intense',
    instruction:
      'You are a senior executive in a review. Expect crisp structure, demand the bottom line up front, and probe trade-offs. Cut off rambling and ask for specifics.',
  },
];

const INTENSITIES = [
  { id: 'gentle', label: 'Gentle' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'intense', label: 'Intense' },
];

export default function Personas() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [instruction, setInstruction] = useState('');
  const [intensity, setIntensity] = useState('balanced');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const synced = api.isConfigured() && Boolean(auth?.currentUser);

  const refresh = async () => {
    const list = await listPersonas();
    setPersonas(list);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreset = (p) => {
    setName(p.name);
    setIcon(p.icon);
    setInstruction(p.instruction);
    setIntensity(p.intensity);
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Give your persona a name.');
      return;
    }
    if (instruction.trim().length < 10) {
      setError('Describe how this opponent should behave (at least a sentence).');
      return;
    }
    setSaving(true);
    try {
      await createPersona({
        name: name.trim(),
        icon: icon.trim() || null,
        instruction: instruction.trim(),
        intensity,
      });
      setName('');
      setIcon('');
      setInstruction('');
      setIntensity('balanced');
      await refresh();
    } catch {
      setError('Could not save the persona. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await deletePersona(id);
    await refresh();
  };

  return (
    <main className="personas-page">
      <div className="container personas-container">
        <header className="personas-head">
          <h1 className="personas-title">Custom opponents</h1>
          <p className="personas-sub">
            Create AI personas with their own attitude and style, then pick them
            when you start a debate.
          </p>
        </header>

        {!synced && (
          <div className="personas-note">
            Saved on this device. Connect the backend and sign in to sync your
            personas across devices.
          </div>
        )}

        <div className="personas-layout">
          {/* Create form */}
          <section className="personas-form-card">
            <h2 className="personas-form-title">Create a persona</h2>

            <div className="personas-presets">
              <span className="personas-presets-label">Start from an example:</span>
              <div className="personas-presets-row">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="personas-preset-chip"
                    onClick={() => loadPreset(p)}
                  >
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSave}>
              <div className="personas-field-row">
                <div className="personas-field personas-field-icon">
                  <label className="personas-label" htmlFor="p-icon">Emoji</label>
                  <input
                    id="p-icon"
                    className="personas-input"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="💼"
                    maxLength={4}
                  />
                </div>
                <div className="personas-field personas-field-name">
                  <label className="personas-label" htmlFor="p-name">Name</label>
                  <input
                    id="p-name"
                    className="personas-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Hostile Investor"
                    maxLength={80}
                  />
                </div>
              </div>

              <label className="personas-label" htmlFor="p-instruction">How should they behave?</label>
              <textarea
                id="p-instruction"
                className="personas-textarea"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Describe the opponent's attitude, what they push on, and their style…"
                rows={5}
                maxLength={2000}
              />

              <label className="personas-label">Intensity</label>
              <div className="personas-intensity-row">
                {INTENSITIES.map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className={`personas-intensity-btn ${intensity === i.id ? 'is-active' : ''}`}
                    onClick={() => setIntensity(i.id)}
                  >
                    {i.label}
                  </button>
                ))}
              </div>

              {error && <p className="personas-error">{error}</p>}

              <button type="submit" className="personas-save-btn" disabled={saving}>
                {saving ? 'Saving…' : 'Save persona'}
              </button>
            </form>
          </section>

          {/* Saved list */}
          <section className="personas-list-card">
            <h2 className="personas-form-title">Your personas</h2>
            {loading ? (
              <p className="personas-empty">Loading…</p>
            ) : personas.length === 0 ? (
              <p className="personas-empty">
                No custom personas yet. Create one on the left, or load an example.
              </p>
            ) : (
              <div className="personas-list">
                {personas.map((p) => (
                  <div className="personas-item" key={p.id}>
                    <div className="personas-item-icon" aria-hidden="true">{p.icon || '🤖'}</div>
                    <div className="personas-item-body">
                      <div className="personas-item-top">
                        <span className="personas-item-name">{p.name}</span>
                        {p.intensity && (
                          <span className={`personas-item-intensity intensity-${p.intensity}`}>
                            {p.intensity}
                          </span>
                        )}
                      </div>
                      <p className="personas-item-instruction">{p.instruction}</p>
                    </div>
                    <button
                      type="button"
                      className="personas-item-delete"
                      onClick={() => handleDelete(p.id)}
                      aria-label={`Delete ${p.name}`}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Link to="/debate" className="personas-use-link">
              Use a persona in a debate →
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
