// Topic library: categorized debate topics with difficulty ratings.
// "easy" = beginner-friendly, everyday reasoning
// "medium" = needs some structure and a bit of evidence
// "hard" = needs real evidence, nuance, and anticipation of counters

export const TOPIC_CATEGORIES = [
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'politics', label: 'Politics', icon: '🌍' },
  { id: 'ethics', label: 'Ethics', icon: '⚖️' },
  { id: 'career', label: 'Career', icon: '💼' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'education', label: 'Education', icon: '🎓' },
];

export const TOPICS = {
  technology: [
    { text: 'AI will replace programmers within 10 years', difficulty: 'hard' },
    { text: 'Social media does more harm than good', difficulty: 'medium' },
    { text: 'Cryptocurrency will replace traditional banking', difficulty: 'medium' },
    { text: 'Remote work is better than office work', difficulty: 'easy' },
    { text: 'Open source software beats proprietary software', difficulty: 'easy' },
    { text: 'Smartphones have made society less social', difficulty: 'easy' },
    { text: 'Self-driving cars should be fully autonomous by law', difficulty: 'hard' },
    { text: 'Big tech companies should be broken up', difficulty: 'medium' },
    { text: 'The metaverse will fail to gain mainstream adoption', difficulty: 'medium' },
    { text: 'Right to repair laws should apply to all electronics', difficulty: 'easy' },
    { text: 'AI-generated art is real art', difficulty: 'medium' },
    { text: 'Net neutrality should be a fundamental right', difficulty: 'medium' },
    { text: 'Video games cause real-world violence', difficulty: 'easy' },
    { text: 'Facial recognition in public spaces should be banned', difficulty: 'hard' },
    { text: 'Online privacy is already dead', difficulty: 'medium' },
  ],
  politics: [
    { text: 'Democracy is the best form of government', difficulty: 'hard' },
    { text: 'Universal basic income should be implemented', difficulty: 'medium' },
    { text: 'Voting should be mandatory', difficulty: 'easy' },
    { text: 'Term limits should apply to all elected officials', difficulty: 'easy' },
    { text: 'Social media platforms should be regulated like utilities', difficulty: 'medium' },
    { text: 'Lobbying should be banned in politics', difficulty: 'medium' },
    { text: 'The voting age should be lowered to 16', difficulty: 'easy' },
    { text: 'Nations should open their borders to more immigration', difficulty: 'hard' },
    { text: 'Climate policy should override short-term economic growth', difficulty: 'hard' },
    { text: 'Government surveillance is justified for national security', difficulty: 'hard' },
    { text: 'Political ads should be banned on social media', difficulty: 'medium' },
    { text: 'A two-party system serves citizens worse than multi-party', difficulty: 'medium' },
  ],
  ethics: [
    { text: 'Genetic editing of humans should be allowed', difficulty: 'hard' },
    { text: 'Animals should have legal rights', difficulty: 'medium' },
    { text: 'Capital punishment is never justified', difficulty: 'medium' },
    { text: 'Lying is sometimes the more ethical choice', difficulty: 'easy' },
    { text: 'Euthanasia should be legal everywhere', difficulty: 'hard' },
    { text: 'Wealth inequality is fundamentally unethical', difficulty: 'medium' },
    { text: 'Zoos do more harm than good for animal welfare', difficulty: 'easy' },
    { text: 'It is wrong to eat meat in the modern world', difficulty: 'medium' },
    { text: 'Whistleblowers should always be protected, no exceptions', difficulty: 'hard' },
    { text: 'Parents should be allowed to choose their child\'s traits', difficulty: 'hard' },
  ],
  career: [
    { text: 'A college degree is necessary for success', difficulty: 'easy' },
    { text: 'Salary transparency helps employees', difficulty: 'easy' },
    { text: 'Hustle culture is harmful', difficulty: 'medium' },
    { text: 'Job hopping is better than company loyalty', difficulty: 'easy' },
    { text: 'A 4-day work week should be the global standard', difficulty: 'medium' },
    { text: 'Soft skills matter more than technical skills', difficulty: 'medium' },
    { text: 'Internships should always be paid', difficulty: 'easy' },
    { text: 'AI will create more jobs than it destroys', difficulty: 'hard' },
    { text: 'Networking matters more than merit for career growth', difficulty: 'medium' },
  ],
  science: [
    { text: 'Nuclear energy is the future of clean power', difficulty: 'medium' },
    { text: 'Space exploration deserves more funding than climate research', difficulty: 'hard' },
    { text: 'Vaccines should be mandatory for school attendance', difficulty: 'medium' },
    { text: 'Cloning animals for research is ethically acceptable', difficulty: 'hard' },
    { text: 'Humans should colonize Mars within this century', difficulty: 'medium' },
    { text: 'Alternative medicine deserves more scientific funding', difficulty: 'medium' },
    { text: 'Gene therapy should be available to everyone', difficulty: 'hard' },
  ],
  education: [
    { text: 'Homework should be banned in schools', difficulty: 'easy' },
    { text: 'Standardized tests are unfair', difficulty: 'medium' },
    { text: 'Coding should be a required subject in schools', difficulty: 'easy' },
    { text: 'Grades do more harm than good to learning', difficulty: 'medium' },
    { text: 'University education should be free for everyone', difficulty: 'medium' },
    { text: 'Online learning is as effective as in-person learning', difficulty: 'easy' },
  ],
};

export const TOTAL_TOPIC_COUNT = Object.values(TOPICS).reduce((sum, arr) => sum + arr.length, 0);
