/* =====================================================================
   parse.js — bulk-import parsers + helpers for the question library.
   No DOM access: works in the browser (window.Parse) and in Node (tests).
   Parse.ctx = { topics:[{n,k,g}], rules:[{id,n,t}] }  is set by the app.
   ===================================================================== */
(function (root) {
'use strict';
var P = { ctx: { topics: [], rules: [] } };
var LET = 'ABCDE';
var norm = function (s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ''); };
P.norm = norm;
var strip = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };

/* ---------- display formatting: escape, **bold**, __underline__, line breaks ---------- */
P.esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
P.fmt = function (s) {
  return P.esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/__(.+?)__/g, '<u>$1</u>').replace(/\r?\n/g, '<br>');
};
P.fmtPassage = function (s) {
  return String(s || '').replace(/\r/g, '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) { return '<p>' + P.fmt(p) + '</p>'; }).join('');
};
P.wordCount = function (s) { return String(s || '').split(/\s+/).filter(Boolean).length; };

/* ---------- fingerprint for duplicate detection (FNV-1a) ---------- */
P.fingerprint = function (q, o) {
  var s = norm(q) + '|' + (o || []).map(norm).join('|'), h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
};

/* ---------- topic / rule / level resolution ---------- */
var ALIAS = { sva: 'Subject-Verb Agreement', subjectverb: 'Subject-Verb Agreement', rc: 'Comprehension Passage', comprehension: 'Comprehension Passage', reading: 'Comprehension Passage',
  passage: 'Comprehension Passage', cloze: 'Cloze Test', clozetest: 'Cloze Test', jumble: 'Para Jumbles', jumbles: 'Para Jumbles', parajumble: 'Para Jumbles', parajumbles: 'Para Jumbles',
  idioms: 'Idioms & Phrases', idiom: 'Idioms & Phrases', idiomsandphrases: 'Idioms & Phrases', ows: 'One-word Substitution', onewordsubstitution: 'One-word Substitution', onewordsubstitutions: 'One-word Substitution',
  phrasalverb: 'Phrasal Verbs', confusingwords: 'Confusing Pairs', confusing: 'Confusing Pairs', homophones: 'Confusing Pairs', voice: 'Voice Change', activepassive: 'Voice Change',
  narration: 'Narration', directindirect: 'Narration', tag: 'Question Tag', questiontags: 'Question Tag', errors: 'Error Spotting', errorspotting: 'Error Spotting', errordetection: 'Error Spotting',
  sentenceimprovement: 'Sentence Improvement', improvement: 'Sentence Improvement', tense: 'Tenses', modifier: 'Modifiers', conditional: 'Conditionals', articles: 'Article', nouns: 'Noun',
  pronouns: 'Pronoun', adjectives: 'Adjective', verbs: 'Verb', adverbs: 'Adverb', prepositions: 'Preposition', conjunctions: 'Conjunction', synonym: 'Synonyms', antonym: 'Antonyms', spellings: 'Spelling' };
P.resolveTopic = function (s) {
  var k = norm(s); if (!k) return '';
  var T = P.ctx.topics, i;
  for (i = 0; i < T.length; i++) if (norm(T[i].n) === k || norm(T[i].k) === k) return T[i].n;
  if (ALIAS[k]) { for (i = 0; i < T.length; i++) if (T[i].n === ALIAS[k]) return T[i].n; }
  var hit = T.filter(function (t) { return norm(t.n).indexOf(k) === 0 || k.indexOf(norm(t.n)) === 0; });
  return hit.length === 1 ? hit[0].n : '';
};
P.resolveRule = function (s) {
  var k = norm(s); if (!k) return '';
  var R = P.ctx.rules, i;
  for (i = 0; i < R.length; i++) if (norm(R[i].id) === k || norm(R[i].n) === k) return R[i].id;
  var hit = R.filter(function (r) { return norm(r.n).indexOf(k) === 0; });
  return hit.length === 1 ? hit[0].id : '';
};
P.parseLevel = function (s) {
  var k = norm(s); if (!k) return 0;
  if (/^[123]$/.test(k)) return +k;
  if (k[0] === 'e') return 1; if (k[0] === 'm') return 2; if (k[0] === 'h' || k[0] === 'd') return 3; return 0;
};
P.resolveAnswer = function (val, opts) {
  var v = strip(val); if (!v) return -1;
  var m = v.match(/^\(?([A-Ea-e])\)?(?:[\s.):\-]|$)/);
  if (m && LET.indexOf(m[1].toUpperCase()) < opts.length) return LET.indexOf(m[1].toUpperCase());
  for (var i = 0; i < opts.length; i++) if (norm(opts[i]) && norm(opts[i]) === norm(v)) return i;
  m = v.match(/^\(?([1-5])\)?$/); if (m && +m[1] <= opts.length) return +m[1] - 1;
  return -1;
};

/* ---------- validation shared by every import path ---------- */
/* item: {topic, q, o[], a, e, rule, diff, passage}; vctx: {defTopic, requireExp, passagesByTitle:{norm:{id,topic}}} */
P.checkQ = function (it, vctx) {
  var errs = [], warns = [];
  vctx = vctx || {};
  var passage = null;
  if (it.passageTitle) { passage = (vctx.passagesByTitle || {})[norm(it.passageTitle)]; if (!passage) errs.push('passage "' + it.passageTitle + '" not found — add it first under Passages'); }
  if (it.passageId) { passage = (vctx.passagesById || {})[it.passageId]; if (!passage) errs.push('passage id not found'); }
  var topic = passage ? passage.topic : (P.resolveTopic(it.topic) || P.resolveTopic(vctx.defTopic));
  if (!topic) errs.push(it.topic ? 'unknown topic "' + it.topic + '"' : 'no topic (add a Topic: line or pick a default topic)');
  if (!strip(it.q)) errs.push('question text is empty');
  var o = (it.o || []).map(function (x) { return strip(x); });
  if (o.length < 2) errs.push('needs at least 2 options'); else if (o.length > 5) errs.push('at most 5 options');
  if (o.some(function (x) { return !x; })) errs.push('an option is empty');
  else if (new Set(o.map(norm)).size !== o.length) errs.push('two options are identical');
  var a = typeof it.a === 'number' ? it.a : P.resolveAnswer(it.a, o);
  if (!(a >= 0 && a < o.length)) errs.push('answer key missing or not matching an option');
  if (topic && (topic === 'Comprehension Passage' || topic === 'Cloze Test') && !passage) errs.push(topic + ' questions must be linked to a passage');
  if (!strip(it.e)) { if (vctx.requireExp) errs.push('explanation is required'); else warns.push('no explanation'); }
  var rule = '';
  if (it.rule) { rule = P.resolveRule(it.rule); if (!rule) warns.push('rule "' + it.rule + '" not recognised (ignored)'); }
  var diff = P.parseLevel(it.diff) || 2;
  return { errs: errs, warns: warns, q: errs.length ? null : { topic: topic, rule: rule, diff: diff, q: String(it.q).trim(), o: o, a: a, e: String(it.e || '').trim(), p: passage ? passage.id : '' } };
};

/* ---------- plain-text question format ---------- */
var RX = {
  topic: /^\s*(?:topic|subject|section)\s*[:=]\s*(.*)$/i, rule: /^\s*rule\s*[:=]\s*(.*)$/i, level: /^\s*(?:level|difficulty|diff)\s*[:=]\s*(.*)$/i,
  passage: /^\s*passage\s*[:=]\s*(.*)$/i, ans: /^\s*(?:answer|ans|key|correct(?:\s+answer)?|right\s+answer)\s*[:=\-]\s*(.*)$/i,
  exp: /^\s*(?:explanation|exp|expl|solution|reason|rationale)\s*[:=\-]\s*(.*)$/i, sep: /^\s*(?:-{3,}|={3,}|\*{3,})\s*$/,
  q: /^\s*(?:q(?:uestion)?\s*\d+\s*[.:)\-]|q(?:uestion)?\s*[:)]|\d+\s*[.)])\s*(.*)$/i, opt: /^\s*\(?([A-Ea-e])\s*[.):\]]\s*(.*)$/
};
P.parseText = function (text, defaults) {
  defaults = defaults || {};
  var lines = String(text || '').replace(/\r/g, '').split('\n'), items = [], errors = [];
  var sticky = { topic: defaults.topic || '', diff: defaults.diff || '', passage: '' }, pend = { rule: '', diff: '' }, cur = null, mode = '';
  function fin() {
    if (!cur) return;
    cur.q = cur.qLines.join('\n').trim(); cur.e = cur.eLines.join('\n').trim(); items.push(cur); cur = null; mode = '';
  }
  function open(line, first) {
    cur = { line: line, topic: sticky.topic, diff: pend.diff || sticky.diff, rule: pend.rule, passageTitle: sticky.passage, qLines: [first], o: [], a: '', eLines: [] }; pend = { rule: '', diff: '' }; mode = 'q';
  }
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i], m;
    if (RX.sep.test(ln)) { fin(); continue; }
    if ((m = ln.match(RX.q)) && !(/^\s*\d+\s*[.)]/.test(ln) && cur && cur.a === '')) { fin(); open(i + 1, m[1]); continue; }
    if ((m = ln.match(RX.topic))) { if (cur && cur.a === '') cur.topic = m[1].trim(); else { fin(); sticky.topic = m[1].trim(); } continue; }
    if ((m = ln.match(RX.passage))) { var pv = /^(none|-|)$/i.test(m[1].trim()) ? '' : m[1].trim(); if (cur && cur.a === '') cur.passageTitle = pv; else { fin(); sticky.passage = pv; } continue; }
    if ((m = ln.match(RX.rule))) { if (cur) cur.rule = m[1].trim(); else pend.rule = m[1].trim(); continue; }
    if ((m = ln.match(RX.level))) { if (cur) cur.diff = m[1].trim(); else pend.diff = m[1].trim(); continue; }
    if (!cur) { if (strip(ln)) errors.push({ line: i + 1, msg: 'text outside a question — start each question with "Q:"' }); continue; }
    if ((m = ln.match(RX.ans))) { cur.a = m[1].trim() || ' '; mode = 'ans'; continue; }
    if ((m = ln.match(RX.exp))) { cur.eLines.push(m[1]); mode = 'exp'; continue; }
    if ((m = ln.match(RX.opt)) && mode !== 'exp' && m[1].toUpperCase() === LET[cur.o.length]) { cur.o.push(m[2].trim()); mode = 'opt'; continue; }
    if (mode === 'exp') cur.eLines.push(ln);
    else if (mode === 'opt' && cur.o.length) cur.o[cur.o.length - 1] += ' ' + ln.trim();
    else if (mode === 'q') cur.qLines.push(ln);
  }
  fin();
  items.forEach(function (it) { it.a = String(it.a).trim(); });
  return { items: items, errors: errors };
};

/* ---------- CSV / pipe / tab tables ---------- */
P.parseTable = function (text) {
  text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  var first = text.split('\n').filter(function (l) { return l.trim(); })[0] || '';
  var d = first.indexOf('|') > -1 ? '|' : first.indexOf('\t') > -1 ? '\t' : first.split(';').length > first.split(',').length ? ';' : ',';
  var rows = [], row = [], cell = '', q = false, line = 1, start = 1;
  function endRow() { row.push(cell); cell = ''; if (row.some(function (c) { return c.trim() !== ''; })) rows.push({ line: start, cells: row.map(function (c) { return c.trim(); }) }); row = []; }
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else { cell += c; if (c === '\n') line++; } }
    else if (c === '"' && cell === '') q = true;
    else if (c === d) { row.push(cell); cell = ''; }
    else if (c === '\n') { endRow(); line++; start = line; }
    else cell += c;
  }
  endRow(); return rows;
};
var HDR = { topic: ['topic', 'subject', 'section', 'category'], q: ['question', 'q', 'questiontext'], e: ['explanation', 'exp', 'solution', 'rationale', 'reason'], a: ['answer', 'key', 'answerkey', 'correct', 'correctanswer', 'ans'],
  rule: ['rule'], diff: ['level', 'difficulty', 'diff'], passage: ['passage', 'passagetitle'] };
function colIndex(head, names) { for (var i = 0; i < head.length; i++) if (names.indexOf(norm(head[i])) > -1) return i; return -1; }
P.parseCSV = function (text, defaults) {
  var rows = P.parseTable(text), items = [], errors = []; if (!rows.length) return { items: items, errors: errors };
  var head = rows[0].cells, hasHead = colIndex(head, HDR.q) > -1 || (colIndex(head, HDR.a) > -1 && colIndex(head, HDR.topic) > -1), map;
  if (hasHead) {
    map = { topic: colIndex(head, HDR.topic), q: colIndex(head, HDR.q), e: colIndex(head, HDR.e), a: colIndex(head, HDR.a), rule: colIndex(head, HDR.rule), diff: colIndex(head, HDR.diff), passage: colIndex(head, HDR.passage), o: [] };
    LET.split('').forEach(function (L, k) { var n = [L.toLowerCase(), 'option' + L.toLowerCase(), 'opt' + L.toLowerCase(), 'choice' + L.toLowerCase()]; map.o[k] = colIndex(head, n); });
    map.opts = colIndex(head, ['options', 'choices']); rows = rows.slice(1);
  } else map = { topic: 0, q: 1, o: [2, 3, 4, 5, -1], a: 6, e: 7, rule: 8, diff: 9, passage: 10, opts: -1 };
  rows.forEach(function (r) {
    var c = r.cells, g = function (k) { return k >= 0 && k < c.length ? c[k] : ''; }, o = [];
    if (map.opts >= 0 && g(map.opts)) o = g(map.opts).split(/\s*\|\s*/); else map.o.forEach(function (k) { if (k >= 0 && g(k) !== '') o.push(g(k)); });
    items.push({ line: r.line, topic: g(map.topic) || (defaults && defaults.topic) || '', q: g(map.q), o: o, a: g(map.a), e: g(map.e), rule: g(map.rule), diff: g(map.diff) || (defaults && defaults.diff) || '', passageTitle: g(map.passage) });
  });
  return { items: items, errors: errors };
};

/* ---------- words and pairs ---------- */
P.parseWords = function (text) {
  var rows = P.parseTable(text), items = [], errors = [];
  if (rows.length && /^word/i.test(rows[0].cells[0]) && rows[0].cells.some(function (x) { return /mean/i.test(x); })) rows = rows.slice(1);
  rows.forEach(function (r) {
    var c = r.cells, w = { line: r.line, w: c[0] || '', pos: c[1] || '', m: c[2] || '', ex: c[3] || '', syn: c[4] || '', ant: c[5] || '', mn: c[6] || '' };
    if (!w.w) errors.push({ line: r.line, msg: 'word is empty' }); else if (!w.m) errors.push({ line: r.line, msg: '"' + w.w + '": meaning is empty' }); else items.push(w);
  });
  return { items: items, errors: errors };
};
P.parsePairs = function (text) {
  var rows = P.parseTable(text), items = [], errors = [];
  if (rows.length && /^(word|pair)/i.test(rows[0].cells[0]) && rows[0].cells.length >= 4 && /mean/i.test(rows[0].cells[1] || '')) rows = rows.slice(1);
  rows.forEach(function (r) {
    var c = r.cells, p = { line: r.line, a: c[0] || '', am: c[1] || '', ae: c[2] || '', b: c[3] || '', bm: c[4] || '', be: c[5] || '' };
    if (!p.a || !p.b) errors.push({ line: r.line, msg: 'both words of the pair are needed' }); else if (!p.am || !p.bm) errors.push({ line: r.line, msg: '"' + p.a + ' / ' + p.b + '": both meanings are needed' }); else items.push(p);
  });
  return { items: items, errors: errors };
};

/* ---------- JSON library files ---------- */
P.parseLibraryJSON = function (text) {
  var d; try { d = JSON.parse(text); } catch (e) { return { error: 'This file is not valid JSON.' }; }
  if (Array.isArray(d)) d = { questions: d };
  if (!d || typeof d !== 'object' || !(d.questions || d.passages || d.words || d.pairs)) return { error: 'No questions, passages, words or pairs found in this file.' };
  return { data: { questions: d.questions || [], passages: d.passages || [], words: d.words || [], pairs: d.pairs || [] } };
};

/* ---------- templates shown in the app ---------- */
P.TEXT_TEMPLATE = 'Topic: Tenses\nLevel: 2\nRule: Present perfect vs simple past\nQ: I ___ him since 2015.\nA) know\nB) knew\nC) have known\nD) am knowing\nAnswer: C\nExplanation: "Since" + a point in time needs the present perfect.\n---\nQ: She ___ to Mumbai last week.\nA) has gone\nB) went\nC) goes\nD) had gone\nAnswer: B\nExplanation: "Last week" is finished time, so use the simple past.\n---\nTopic: Synonyms\nQ: Choose the synonym of **BENEVOLENT**.\nA) Cruel\nB) Kind\nC) Careless\nD) Hostile\nAnswer: B\nExplanation: Benevolent = kind, well-meaning.';
P.CSV_TEMPLATE = 'topic,question,option_a,option_b,option_c,option_d,answer,explanation,rule,level,passage\nTenses,I ___ him since 2015.,know,knew,have known,am knowing,C,"""Since"" + a point in time needs the present perfect.",Present perfect vs simple past,2,\nSynonyms,Choose the synonym of **BENEVOLENT**.,Cruel,Kind,Careless,Hostile,B,"Benevolent = kind, well-meaning.",,1,\n';
P.WORDS_TEMPLATE = 'word | part of speech | meaning | example | synonyms | antonyms | mnemonic\nBenevolent | adj | kind and generous | The benevolent trust funds free meals. | kind, charitable | cruel, malevolent | BENE = good\nCandid | adj | honest and frank | She gave a candid opinion. | frank, open | devious | Candid camera shows the truth';
P.PAIRS_TEMPLATE = 'word A | meaning A | example A | word B | meaning B | example B\nAffect | to influence (verb) | Pollution affects health. | Effect | a result (noun) | The effect was dramatic.';

root.Parse = P;
if (typeof module !== 'undefined') module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);
