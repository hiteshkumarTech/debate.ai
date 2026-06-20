import { Link } from 'react-router-dom';

const STEPS = [
  {
    n: '1',
    t: 'Pick a topic and your side',
    d: 'Choose from 90+ topics across six categories, or write your own. Decide whether you are arguing For or Against - the AI always takes the opposite side.',
  },
  {
    n: '2',
    t: 'Choose your opponent and argue',
    d: 'Pick a personality - from a friendly teacher to an aggressive opponent or a job interviewer - and the AI model you want to face. Then argue, by typing or speaking out loud.',
  },
  {
    n: '3',
    t: 'Get scored and improve',
    d: 'Every debate is scored on logic, evidence, clarity, and persuasiveness, with specific feedback. Track your scores, streak, and history over time.',
  },
];

export default function HowItWorks() {
  return (
    <main style={{ padding: '0 0 60px' }}>
      <div className="container" style={{ maxWidth: 820, paddingTop: 48 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--indigo-500, #4F46E5)' }}>How it works</span>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 38, lineHeight: 1.1, margin: '8px 0 14px' }}>
          From topic to real feedback in three steps
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-soft, #4A4A5C)', lineHeight: 1.6, marginBottom: 40, maxWidth: 640 }}>
          DebateAI is a practice arena: you argue against an AI that pushes back, then get an honest
          breakdown of how you did. You will want a free account to save your scores and track progress.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {STEPS.map((s) => (
            <div
              key={s.n}
              style={{
                display: 'flex', gap: 18, alignItems: 'flex-start', padding: '22px 24px',
                borderRadius: 14, background: 'var(--paper-raised, #FFFFFF)',
                border: '1px solid var(--line, rgba(26,26,46,0.10))',
              }}
            >
              <div
                style={{
                  flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--indigo-50, #EEF0FF)', color: 'var(--indigo-500, #4F46E5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: 700, fontSize: 20,
                }}
              >
                {s.n}
              </div>
              <div>
                <h3 style={{ margin: '4px 0 6px', fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20 }}>{s.t}</h3>
                <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink-soft, #4A4A5C)', lineHeight: 1.55 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            to="/debate"
            style={{
              display: 'inline-flex', alignItems: 'center', padding: '14px 28px', borderRadius: 999,
              background: 'var(--ink, #1A1A2E)', color: 'var(--paper, #FAF9F6)', fontWeight: 600, fontSize: 15, textDecoration: 'none',
            }}
          >
            Start a debate
          </Link>
          <Link
            to="/interview"
            style={{
              display: 'inline-flex', alignItems: 'center', padding: '14px 28px', borderRadius: 999,
              border: '1.5px solid var(--line-strong, rgba(26,26,46,0.18))', color: 'var(--ink, #1A1A2E)',
              fontWeight: 600, fontSize: 15, textDecoration: 'none',
            }}
          >
            Try interview prep
          </Link>
        </div>
      </div>
    </main>
  );
}