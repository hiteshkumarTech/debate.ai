// Placeholder scoring engine. Computes a believable score from signals
// actually present in the transcript (message count, length, on-topic
// language, personality difficulty) rather than returning a fixed number.
//
// Swap point: replace the body of `scoreDebate()` with a call to
// POST /api/debate/score (sending the full message history) once the
// FastAPI backend exists. The return shape below is the contract the
// rest of the app expects, so nothing else needs to change.

const PERSONALITY_DIFFICULTY = {
  'friendly-teacher': 0.85, // most forgiving — scores trend higher
  'strict-professor': 1.0,
  'aggressive-opponent': 1.18, // least forgiving — scores trend lower
  'job-interviewer': 1.05,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Crude "evidence" signal: does the message contain anything that reads
// like a citation, number, or source reference? Not real fact-checking —
// just rewards the *habit* of citing something.
function hasEvidenceMarkers(text) {
  return /\d|study|research|report|according to|source|data|statistics|%/i.test(text);
}

export function scoreDebate({ messages, personality }) {
  const userMessages = messages.filter((m) => m.sender === 'user');
  const messageCount = userMessages.length;

  // No real arguments made — score honestly as incomplete rather than
  // faking a number for an empty debate.
  if (messageCount === 0) {
    return {
      overall: 0,
      logic: 0,
      evidence: 0,
      clarity: 0,
      persuasiveness: 0,
      messageCount: 0,
      incomplete: true,
    };
  }

  const avgLength =
    userMessages.reduce((sum, m) => sum + m.text.length, 0) / messageCount;

  const evidenceRate =
    userMessages.filter((m) => hasEvidenceMarkers(m.text)).length / messageCount;

  // Engagement: more turns (up to a point) signals a more developed
  // argument. Diminishing returns past ~6 exchanges.
  const engagementScore = clamp((messageCount / 6) * 100, 30, 100);

  // Clarity: rewards messages that are substantial but not rambling.
  // Sweet spot around 80-220 characters per message.
  const clarityScore = clamp(
    100 - Math.abs(avgLength - 150) * 0.35,
    25,
    100
  );

  // Evidence: directly driven by how often citation-like language appears.
  const evidenceScore = clamp(35 + evidenceRate * 65, 20, 100);

  // Logic: blends engagement and clarity as a proxy for structured
  // argumentation, since there's no real reasoning check available yet.
  const logicScore = clamp((engagementScore * 0.5 + clarityScore * 0.5), 25, 100);

  // Persuasiveness: blends all three other signals.
  const persuasivenessScore = clamp(
    (logicScore * 0.4 + evidenceScore * 0.3 + clarityScore * 0.3),
    25,
    100
  );

  const difficultyMultiplier = PERSONALITY_DIFFICULTY[personality] || 1.0;

  const adjust = (score) => Math.round(clamp(score / difficultyMultiplier, 10, 100));

  const logic = adjust(logicScore);
  const evidence = adjust(evidenceScore);
  const clarity = adjust(clarityScore);
  const persuasiveness = adjust(persuasivenessScore);

  const overall = Math.round((logic + evidence + clarity + persuasiveness) / 4);

  return {
    overall,
    logic,
    evidence,
    clarity,
    persuasiveness,
    messageCount,
    incomplete: false,
  };
}

// Converts a 0-100 score into a /10 display value, matching the blueprint's
// "Logic 8/10" style report.
export function toTenScale(score) {
  return Math.round(score / 10);
}
