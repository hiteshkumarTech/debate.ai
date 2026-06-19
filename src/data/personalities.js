export const PERSONALITIES = [
  {
    id: 'friendly-teacher',
    name: 'Friendly Teacher',
    icon: '🎓',
    description: 'Helps beginners. Explains kindly, points out gaps without harshness.',
    level: 'Beginner friendly',
  },
  {
    id: 'strict-professor',
    name: 'Strict Professor',
    icon: '👨‍🏫',
    description: 'Challenges weak arguments firmly. Expects structure and reasoning.',
    level: 'Intermediate',
  },
  {
    id: 'aggressive-opponent',
    name: 'Aggressive Opponent',
    icon: '⚔️',
    description: 'Attacks every weak point relentlessly. No mercy for sloppy logic.',
    level: 'Advanced',
  },
  {
    id: 'job-interviewer',
    name: 'Job Interviewer',
    icon: '💼',
    description: 'Treats your argument like an interview answer. Perfect for placements.',
    level: 'Career mode',
  },
];

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

export const LANGUAGES = [
  { code: 'en-US', label: 'English (default)' },
  { code: 'hi-IN', label: 'Hindi — हिन्दी' },
  { code: 'es-ES', label: 'Spanish — Español' },
  { code: 'fr-FR', label: 'French — Français' },
  { code: 'de-DE', label: 'German — Deutsch' },
  { code: 'ar-SA', label: 'Arabic — العربية' },
  { code: 'zh-CN', label: 'Chinese — 中文' },
  { code: 'ja-JP', label: 'Japanese — 日本語' },
  { code: 'pt-BR', label: 'Portuguese — Português' },
  { code: 'ru-RU', label: 'Russian — Русский' },
  { code: 'ko-KR', label: 'Korean — 한국어' },
];
