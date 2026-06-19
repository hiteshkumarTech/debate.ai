import './About.css';

const SKILLS = [
  { icon: '🧠', title: 'Critical thinking', text: 'Build arguments, spot weak reasoning, and defend a position under pressure.' },
  { icon: '🗣️', title: 'Communication', text: 'Practice articulating ideas clearly — by typing or by speaking out loud.' },
  { icon: '💼', title: 'Interview prep', text: 'FAANG-style behavioral, technical, and system design rounds with a probing interviewer.' },
  { icon: '🌍', title: 'English speaking', text: 'Voice input and output in multiple languages to build spoken fluency and confidence.' },
];

const STEPS = [
  { num: '1', title: 'Pick a mode', text: 'Debate a topic from any side, or run a practice interview.' },
  { num: '2', title: 'Go a few rounds', text: 'The AI argues back or interviews you — type or use your voice.' },
  { num: '3', title: 'Get scored', text: 'See a breakdown of structure, evidence, clarity, and conviction, and track it over time.' },
];

const STACK = [
  { label: 'Frontend', value: 'React + Vite' },
  { label: 'Routing', value: 'React Router' },
  { label: 'Auth', value: 'Firebase (Google + email/password)' },
  { label: 'Voice', value: 'Web Speech API (recognition + synthesis)' },
  { label: 'AI models', value: 'GPT-5.5, Gemini, Claude (selectable)' },
  { label: 'Backend', value: 'FastAPI + Postgres (planned)' },
];

export default function About() {
  return (
    <main className="about-page">
      <div className="container about-container">
        <section className="about-hero">
          <h1 className="about-title">About DebateAI</h1>
          <p className="about-lede">
            DebateAI is a practice arena for thinking and speaking under pressure. Argue a topic against an
            AI that takes the opposite side, or run a mock interview — then get a scored breakdown of how you did.
          </p>
        </section>

        <section className="about-section">
          <h2 className="about-h2">What it helps you build</h2>
          <div className="about-skill-grid">
            {SKILLS.map((s) => (
              <div className="about-skill-card" key={s.title}>
                <span className="about-skill-icon" aria-hidden="true">{s.icon}</span>
                <h3 className="about-skill-title">{s.title}</h3>
                <p className="about-skill-text">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2 className="about-h2">How it works</h2>
          <div className="about-steps">
            {STEPS.map((s) => (
              <div className="about-step" key={s.num}>
                <span className="about-step-num">{s.num}</span>
                <div>
                  <h3 className="about-step-title">{s.title}</h3>
                  <p className="about-step-text">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2 className="about-h2">Built with</h2>
          <div className="about-stack">
            {STACK.map((row) => (
              <div className="about-stack-row" key={row.label}>
                <span className="about-stack-label">{row.label}</span>
                <span className="about-stack-value">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="about-status">
            <h2 className="about-status-title">Where the project is right now</h2>
            <p className="about-status-text">
              The full frontend is built and working: debate flow, interview mode, voice, scoring, progress
              tracking, and login-gated history. Scoring is currently a transparent heuristic and the AI
              opponents run on local logic — the FastAPI backend that connects real AI models and global
              leaderboards is the next milestone. Nothing here pretends to be further along than it is.
            </p>
          </div>
        </section>

        <section className="about-maker">
          <h2 className="about-h2">Who made it</h2>
          <p className="about-maker-text">
            Built by <strong>Hitesh Kumar</strong> — a computer science student building production-grade AI applications.
          </p>
          <div className="about-maker-links">
            <a href="https://github.com/hiteshkumarTech" target="_blank" rel="noreferrer" className="about-maker-link">GitHub</a>
            <a href="https://www.linkedin.com/in/hitesh-kumar-0b7702416" target="_blank" rel="noreferrer" className="about-maker-link">LinkedIn</a>
            <a href="https://instagram.com/hitesh_1w" target="_blank" rel="noreferrer" className="about-maker-link">Instagram</a>
          </div>
        </section>
      </div>
    </main>
  );
}
