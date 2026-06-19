import { useState } from 'react';
import {
  INTERVIEW_CATEGORIES,
  INTERVIEW_COMPANIES,
  INTERVIEW_QUESTIONS,
  INTERVIEW_TOTAL_COUNT,
} from '../data/interviewQuestions';
import { AI_MODELS } from '../data/personalities';
import './InterviewSetup.css';

export default function InterviewSetup({ onStart }) {
  const [category, setCategory] = useState('behavioral');
  const [company, setCompany] = useState('google');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [aiModel, setAiModel] = useState(AI_MODELS[0].id);

  const questions = INTERVIEW_QUESTIONS[category] || [];
  const canStart = Boolean(selectedQuestion);

  // When switching category, clear the selected question so you can't start
  // a Behavioral session with a Technical question still selected.
  const handleCategory = (id) => {
    setCategory(id);
    setSelectedQuestion(null);
  };

  const handleStart = () => {
    if (!canStart) return;
    const categoryInfo = INTERVIEW_CATEGORIES.find((c) => c.id === category);
    const companyInfo = INTERVIEW_COMPANIES.find((c) => c.id === company);
    onStart({
      question: selectedQuestion,
      category: categoryInfo.label,
      categoryId: category,
      company: companyInfo.label,
      role: companyInfo.role,
      aiModel,
    });
  };

  return (
    <div className="isetup">
      <div className="isetup-intro">
        <h1 className="isetup-title">Practice interview</h1>
        <p className="isetup-sub">
          {INTERVIEW_TOTAL_COUNT} FAANG-style questions across behavioral, technical, and system design.
          The AI plays the interviewer and pushes back like a real one.
        </p>
      </div>

      {/* Step 1: Category */}
      <section className="isetup-step">
        <div className="isetup-step-head">
          <span className="isetup-step-num">1</span>
          <div>
            <h2 className="isetup-step-title">Pick a round</h2>
            <p className="isetup-step-desc">Each round tests a different skill.</p>
          </div>
        </div>
        <div className="isetup-category-grid">
          {INTERVIEW_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`isetup-category-card ${category === c.id ? 'is-active' : ''}`}
              onClick={() => handleCategory(c.id)}
            >
              <span className="isetup-category-icon" aria-hidden="true">{c.icon}</span>
              <span className="isetup-category-label">{c.label}</span>
              <span className="isetup-category-blurb">{c.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: Company framing */}
      <section className="isetup-step">
        <div className="isetup-step-head">
          <span className="isetup-step-num">2</span>
          <div>
            <h2 className="isetup-step-title">Choose the company</h2>
            <p className="isetup-step-desc">Sets the framing — questions are shared across all.</p>
          </div>
        </div>
        <div className="isetup-company-row">
          {INTERVIEW_COMPANIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`isetup-company-btn ${company === c.id ? 'is-active' : ''}`}
              onClick={() => setCompany(c.id)}
            >
              <span className="isetup-company-name">{c.label}</span>
              <span className="isetup-company-role">{c.role}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Step 3: Question */}
      <section className="isetup-step">
        <div className="isetup-step-head">
          <span className="isetup-step-num">3</span>
          <div>
            <h2 className="isetup-step-title">Pick a question</h2>
            <p className="isetup-step-desc">Choose one to be asked. You can run more sessions after.</p>
          </div>
        </div>
        <div className="isetup-question-list">
          {questions.map((q) => (
            <button
              key={q.text}
              type="button"
              className={`isetup-question-item ${selectedQuestion === q.text ? 'is-selected' : ''}`}
              onClick={() => setSelectedQuestion(q.text)}
            >
              <span className="isetup-question-text">{q.text}</span>
              <span className="isetup-question-focus">{q.focus}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Step 4: AI model */}
      <section className="isetup-step">
        <div className="isetup-step-head">
          <span className="isetup-step-num">4</span>
          <div>
            <h2 className="isetup-step-title">Choose your AI model</h2>
            <p className="isetup-step-desc">Swap any time — your score is tracked the same way.</p>
          </div>
        </div>
        <div className="isetup-model-grid">
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`isetup-model-card ${aiModel === m.id ? 'is-selected' : ''}`}
              onClick={() => setAiModel(m.id)}
            >
              <div className="isetup-model-top">
                <span className="isetup-model-vendor">{m.vendor}</span>
                <span className={`isetup-model-badge tone-${m.badgeTone}`}>{m.badge}</span>
              </div>
              <span className="isetup-model-name">{m.name}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="isetup-footer">
        {!canStart && <p className="isetup-footer-hint">Pick a question above to begin.</p>}
        <button type="button" className="isetup-start-btn" disabled={!canStart} onClick={handleStart}>
          Start interview
        </button>
      </div>
    </div>
  );
}
