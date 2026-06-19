import ScoreRing from './ScoreRing';
import './ArenaPreview.css';

export default function ArenaPreview() {
  return (
    <div className="arena-preview">
      <div className="arena-preview-topic">
        <span className="arena-preview-topic-label">Topic</span>
        <span className="arena-preview-topic-text">AI will replace programmers</span>
      </div>

      <div className="arena-preview-vs">
        <div className="arena-preview-side you">
          <span className="arena-preview-side-tag">You</span>
          <p className="arena-preview-bubble">
            Copilot already writes 40% of code automatically. The trend is undeniable.
          </p>
        </div>
        <div className="arena-preview-side ai">
          <span className="arena-preview-side-tag">AI opponent</span>
          <p className="arena-preview-bubble">
            Assisting isn't architecting. Show me a production system built without human debugging.
          </p>
        </div>
      </div>

      <div className="arena-preview-score">
        <ScoreRing targetScore={78} label="Overall score" size={104} />
        <div className="arena-preview-score-bars">
          {[
            { label: 'Logic', value: 80 },
            { label: 'Evidence', value: 60 },
            { label: 'Clarity', value: 90 },
          ].map((s) => (
            <div className="arena-preview-bar-row" key={s.label}>
              <span className="arena-preview-bar-label">{s.label}</span>
              <div className="arena-preview-bar-track">
                <div className="arena-preview-bar-fill" style={{ width: `${s.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
