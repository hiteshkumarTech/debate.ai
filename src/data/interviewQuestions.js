// FAANG-style interview question bank, organized by category.
// Each question carries a short `focus` (what the interviewer is really
// probing) and `tips` (what a strong answer includes) so the report and
// in-session hints can be genuinely useful rather than generic.

export const INTERVIEW_CATEGORIES = [
  {
    id: 'behavioral',
    label: 'Behavioral',
    icon: '🗣️',
    blurb: 'STAR method, leadership, conflict, ownership. The most common round.',
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: '⚙️',
    blurb: 'Explain your approach, complexity, trade-offs. Talk through your reasoning.',
  },
  {
    id: 'system-design',
    label: 'System Design',
    icon: '🏗️',
    blurb: 'Architect at scale. Requirements, components, bottlenecks, trade-offs.',
  },
];

// A small set of recognizable companies to frame the session. This only
// changes the framing copy — questions are shared across companies.
export const INTERVIEW_COMPANIES = [
  { id: 'google', label: 'Google', role: 'Software Engineer (L4)' },
  { id: 'amazon', label: 'Amazon', role: 'SDE II' },
  { id: 'meta', label: 'Meta', role: 'E4 Software Engineer' },
  { id: 'generic', label: 'General FAANG', role: 'Software Engineer' },
];

export const INTERVIEW_QUESTIONS = {
  behavioral: [
    {
      text: 'Tell me about a time you had a technical disagreement with a teammate. How did you resolve it?',
      focus: 'Conflict resolution and collaboration',
      tips: [
        'Use STAR: Situation, Task, Action, Result.',
        'Show how you reasoned through the disagreement, not just who "won".',
        'End with a measurable outcome and what you learned.',
      ],
    },
    {
      text: 'Describe a project that failed or did not go as planned. What would you do differently?',
      focus: 'Ownership and self-awareness',
      tips: [
        'Own your part honestly — don\u2019t blame others.',
        'Be specific about the root cause.',
        'Focus most of the answer on the lesson and the change you made.',
      ],
    },
    {
      text: 'Tell me about a time you had to influence a decision without formal authority.',
      focus: 'Leadership and persuasion',
      tips: [
        'Show how you built a case with data or a prototype.',
        'Mention the stakeholders and how you brought them along.',
        'Quantify the impact of the decision.',
      ],
    },
    {
      text: 'Give an example of when you had to deliver under a tight deadline. How did you prioritize?',
      focus: 'Prioritization under pressure',
      tips: [
        'Explain your framework for cutting scope.',
        'Show what you chose NOT to do, and why.',
        'Tie it back to the result that mattered.',
      ],
    },
    {
      text: 'Tell me about a time you received critical feedback. How did you respond?',
      focus: 'Growth mindset',
      tips: [
        'Pick real, substantive feedback — not a humble-brag.',
        'Describe the concrete change you made.',
        'Show the improved outcome afterward.',
      ],
    },
  ],
  technical: [
    {
      text: 'How would you find the first non-repeating character in a string? Walk me through your approach and its complexity.',
      focus: 'Data structures and complexity analysis',
      tips: [
        'State the brute-force approach first, then optimize.',
        'Mention time AND space complexity explicitly.',
        'Talk through edge cases (empty string, all repeating).',
      ],
    },
    {
      text: 'Explain the difference between a process and a thread, and when you would use each.',
      focus: 'Systems fundamentals',
      tips: [
        'Cover memory isolation vs shared memory.',
        'Give a concrete example use-case for each.',
        'Mention the trade-offs (overhead, safety, communication).',
      ],
    },
    {
      text: 'You have a slow database query in production. Walk me through how you would diagnose and fix it.',
      focus: 'Debugging methodology',
      tips: [
        'Start with measurement: EXPLAIN, query plans, metrics.',
        'Reason from data, not guesses.',
        'Discuss indexing, query rewriting, and caching trade-offs.',
      ],
    },
    {
      text: 'Design a function to detect if a linked list has a cycle. What is the optimal approach?',
      focus: 'Algorithmic reasoning',
      tips: [
        'Mention the naive hash-set approach and its space cost.',
        'Explain Floyd\u2019s two-pointer (tortoise and hare) and why it is O(1) space.',
        'State the time complexity clearly.',
      ],
    },
  ],
  'system-design': [
    {
      text: 'Design a URL shortener like bit.ly. Walk me through the key components.',
      focus: 'Scalable system architecture',
      tips: [
        'Clarify requirements first: scale, read/write ratio, custom URLs.',
        'Cover the encoding scheme, database choice, and caching.',
        'Discuss the bottleneck (read-heavy) and how you scale it.',
      ],
    },
    {
      text: 'How would you design a news feed like the one on a major social network?',
      focus: 'Large-scale distributed design',
      tips: [
        'Discuss fan-out on write vs fan-out on read.',
        'Address the "celebrity problem" (users with millions of followers).',
        'Cover caching, ranking, and pagination.',
      ],
    },
    {
      text: 'Design a rate limiter for an API. What algorithm would you use and why?',
      focus: 'Trade-off analysis',
      tips: [
        'Compare token bucket, leaky bucket, and sliding window.',
        'Address where state lives in a distributed setup (e.g. Redis).',
        'Discuss what happens at the limit (reject, queue, throttle).',
      ],
    },
  ],
};

export const INTERVIEW_TOTAL_COUNT = Object.values(INTERVIEW_QUESTIONS).reduce(
  (sum, arr) => sum + arr.length,
  0
);
