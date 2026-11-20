/* =====================================================================
   Wise Choice · Master Competitive English — manifest.js
   Groups, topics, exam rules, quotes. Questions live in data/qb*.js,
   rule cards in data/rules.js, vocabulary in data/words.js.
   ===================================================================== */
window.RULES = {
  examName: 'Wise Choice English',
  mockMinutes: 30,        // sectional mock: 10 grammar + 10 vocab + 1 passage
  negative: 0.25,
  groups: [
    { n: 'Grammar', i: '📘', k: 'GRM', topics: [
      { n: 'Noun', i: '🏷️', k: 'Noun' }, { n: 'Pronoun', i: '👤', k: 'Pron' },
      { n: 'Adjective', i: '🎨', k: 'Adj' }, { n: 'Verb', i: '🏃', k: 'Verb' },
      { n: 'Adverb', i: '⚡', k: 'Adv' }, { n: 'Article', i: '🔤', k: 'Art' },
      { n: 'Preposition', i: '📍', k: 'Prep' }, { n: 'Conjunction', i: '🔗', k: 'Conj' },
      { n: 'Tenses', i: '⏳', k: 'Tense' }, { n: 'Voice Change', i: '🔄', k: 'Voice' },
      { n: 'Narration', i: '💬', k: 'Narr' }, { n: 'Question Tag', i: '❓', k: 'Tag' },
      { n: 'Subject-Verb Agreement', i: '🤝', k: 'SVA' }, { n: 'Conditionals', i: '🔀', k: 'Cond' },
      { n: 'Modifiers', i: '🎯', k: 'Mod' }, { n: 'Error Spotting', i: '🔍', k: 'Error' },
      { n: 'Sentence Improvement', i: '✍️', k: 'Improve' } ] },
    { n: 'Vocabulary', i: '📗', k: 'VOC', topics: [
      { n: 'Synonyms', i: '🟰', k: 'Syn' }, { n: 'Antonyms', i: '↔️', k: 'Ant' },
      { n: 'Idioms & Phrases', i: '🗣️', k: 'Idiom' }, { n: 'One-word Substitution', i: '1️⃣', k: 'OWS' },
      { n: 'Phrasal Verbs', i: '🧩', k: 'Phrasal' }, { n: 'Confusing Pairs', i: '👯', k: 'Pairs' },
      { n: 'Spelling', i: '🔡', k: 'Spell' } ] },
    { n: 'Reading', i: '📙', k: 'RC', topics: [
      { n: 'Comprehension Passage', i: '📖', k: 'Passage' }, { n: 'Cloze Test', i: '🕳️', k: 'Cloze' },
      { n: 'Para Jumbles', i: '🧱', k: 'Jumble' } ] }
  ]
};

window.QUOTES = [
  'A word a day keeps the weak vocabulary away.',
  'Grammar is the grip that holds your sentences together.',
  'Read a little every day — fluency is built in small bites.',
  'Every mistake you review today is a mark you keep tomorrow.',
  'Consistency beats intensity — one passage, five rules, ten words.',
  'Good readers do not read faster, they read smarter.',
  'Mock tests are rehearsals. Make your mistakes here.',
  'Learn the rule once, spot the error forever.',
  'Small daily progress adds up to big results.',
  'Revision is where marks are made.',
  'Your shortcut through the syllabus starts with today\'s practice.',
  'Slow progress is still progress.'
];
