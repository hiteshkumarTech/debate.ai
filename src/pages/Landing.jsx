import CursorGlow from '../components/CursorGlow';
import { Link } from 'react-router-dom';
import ArenaPreview from '../components/ArenaPreview';
import AIModelSelector from '../components/AIModelSelector';
import './Landing.css';

export default function Landing() {
  return (
    <main>
      {/* ===== Hero ===== */}
      <section className="hero">
        <CursorGlow />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">Your personal AI debate &amp; communication coach</span>
            <h1 className="hero-title">
              Master debate.
              <br />
              Sharpen thinking.
              <br />
              <em>Speak with confidence.</em>
            </h1>
            <p className="hero-sub">
              Pick a topic, choose your side, and argue against an AI that never agrees too quickly.
              Walk away with a real score on your logic, evidence, clarity, and persuasiveness.
            </p>
            <div className="hero-actions">
              <Link to="/debate" className="btn btn-primary">Start debate</Link>
              <Link to="/how-it-works" className="btn btn-ghost">How it works</Link>
            </div>
          </div>

          <div className="hero-visual">
            <ArenaPreview />
          </div>
        </div>
      </section>

      {/* ===== Multi-AI ===== */}
      <section className="section">
        <div className="container">
          <span className="section-eyebrow">Choose your opponent's mind</span>
          <h2 className="section-title">Practice against more than one kind of thinker</h2>
          <p className="section-sub">
            Every model argues a little differently. Switch any time â€” your score is tracked
            the same way no matter who's on the other side.
          </p>
          <div className="section-body">
            <AIModelSelector />
          </div>
        </div>
      </section>

      {/* ===== What you'll improve ===== */}
      <section className="section section-tint">
        <div className="container">
          <span className="section-eyebrow">Built for</span>
          <h2 className="section-title">Four skills, one habit</h2>
          <div className="goal-grid">
            {[
              { t: 'Debating skills', d: 'Structure an argument, anticipate rebuttals, hold your ground.' },
              { t: 'Communication', d: 'Say what you mean clearly, without losing the thread.' },
              { t: 'Interview prep', d: 'Practice the questions that actually get asked â€” under pressure.' },
              { t: 'English speaking', d: 'Build fluency by speaking out loud, not just reading silently.' },
            ].map((g) => (
              <div className="goal-card" key={g.t}>
                <h3 className="goal-card-title">{g.t}</h3>
                <p className="goal-card-desc">{g.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
