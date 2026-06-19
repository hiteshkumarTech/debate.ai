import { useState } from 'react';
import './AIModelSelector.css';

export const AI_MODELS = [
  {
    id: 'gpt-5.5',
    name: 'GPT-5.5',
    vendor: 'OpenAI',
    blurb: 'Strongest reasoning. Best default for tough arguments.',
    badge: 'Default',
    badgeTone: 'default',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    blurb: 'Fast and great with factual, science-heavy topics.',
    badge: 'Optional',
    badgeTone: 'optional',
  },
  {
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    blurb: 'Nuanced counter-arguments, careful reasoning.',
    badge: 'Optional',
    badgeTone: 'optional',
  },
];

export default function AIModelSelector({ value, onChange, compact = false }) {
  const [internal, setInternal] = useState(value || AI_MODELS[0].id);
  const selected = value !== undefined ? value : internal;

  const handleSelect = (id) => {
    if (onChange) onChange(id);
    else setInternal(id);
  };

  return (
    <div className={`ai-selector ${compact ? 'is-compact' : ''}`} role="radiogroup" aria-label="Choose AI model">
      {AI_MODELS.map((m) => {
        const isSelected = selected === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`ai-option ${isSelected ? 'is-selected' : ''}`}
            onClick={() => handleSelect(m.id)}
          >
            <div className="ai-option-top">
              <span className="ai-option-vendor">{m.vendor}</span>
              <span className={`ai-option-badge tone-${m.badgeTone}`}>{m.badge}</span>
            </div>
            <span className="ai-option-name">{m.name}</span>
            {!compact && <span className="ai-option-blurb">{m.blurb}</span>}
          </button>
        );
      })}
    </div>
  );
}
