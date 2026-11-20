/* =====================================================================
   Wise Choice · Master Competitive English — app.js
   Needs: data/manifest.js, rules.js, words.js, qb1-4.js
   ===================================================================== */
(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };

/* ---------- config + bank ---------- */
var R = window.RULES, GROUPS = R.groups, TOPICS = [], ICON = {}, CODE = {}, GRP = {}, GICON = {}, GCODE = {};
GROUPS.forEach(function (g) {
  GICON[g.n] = g.i; GCODE[g.n] = g.k;
  g.topics.forEach(function (t) { TOPICS.push(t.n); ICON[t.n] = t.i; CODE[t.n] = t.k || t.n.slice(0, 4); GRP[t.n] = g.n; });
});
var RB = {}; (window.RULEBOOK || []).forEach(function (r) { RB[r.id] = r; });
Parse.ctx.topics = []; GROUPS.forEach(function (g) { g.topics.forEach(function (t) { Parse.ctx.topics.push({ n: t.n, k: t.k, g: g.n }); }); });
Parse.ctx.rules = (window.RULEBOOK || []).map(function (r) { return { id: r.id, n: r.n, t: r.t }; });
/* the library (filled from IndexedDB at start-up; the app ships with no questions) */
var LIB = { q: [], p: [], w: [], x: [] }, WORDS = [], PAIRS = [], PASS = {}, BANK = [], BYK = {};
function buildBank() {
  PASS = {}; BANK = []; BYK = {}; WORDS = []; PAIRS = []; var cnt = {};
  LIB.q.forEach(function (r) {
    if (!GRP[r.topic] || !r.o || r.o.length < 2) return;
    BANK.push({ k: r.id, s: r.topic, r: r.rule || '', d: r.diff || 2, q: Parse.fmt(r.q), o: r.o.map(Parse.fmt), a: r.a, e: Parse.fmt(r.e || ''), p: r.p || '' }); if (r.p) cnt[r.p] = (cnt[r.p] || 0) + 1;
  });
  LIB.p.forEach(function (p) { if (cnt[p.id]) PASS[p.id] = { id: p.id, topic: p.topic, title: p.title, text: Parse.fmtPassage(p.text), words: Parse.wordCount(p.text), n: cnt[p.id] }; });
  BANK = BANK.filter(function (q) { return !q.p || PASS[q.p]; }); BANK.forEach(function (q) { BYK[q.k] = q; });
  LIB.w.forEach(function (w, i) { WORDS.push({ i: i, w: w.w, pos: w.pos || '', m: w.m, ex: w.ex || '', syn: w.syn || '', ant: w.ant || '', mn: w.mn || '' }); });
  PAIRS = LIB.x.map(function (p) { return [p.a, p.am, p.ae || '', p.b, p.bm, p.be || '']; });
}
var ti = function (s) { var i = TOPICS.indexOf(s); return i < 0 ? 999 : i; };
var QUOTES = (window.QUOTES && window.QUOTES.length) ? window.QUOTES : ['Small steps every day beat big plans someday.'];
var app = $('#app'), root = document.documentElement;
var DAY = 86400000, INT = [1, 3, 7, 14, 30];

/* ---------- storage ---------- */
function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function del(k) { try { localStorage.removeItem(k); } catch (e) {} }
var SET = Object.assign({ font: 1, motion: true, showTimer: true, autoNext: false, shuffleQ: false, shuffleO: false, confirmSubmit: true,
  autoWrong: true, haptic: true, wake: false, defMins: 30, defNeg: true, tools: true, fullscreen: true, speech: true, weekGoal: 100, reqExp: true }, get('wc_set', {}));
var ATT = get('wc_att', []), SAV = get('wc_sav', {}), DAYM = get('wc_days', {}), SEEN = get('wc_seen', {}),
    VOC = get('wc_voc', {}), DR = get('wc_dr', {}), XP = get('wc_xp', 0), RCW = get('wc_rcw', []);
root.dataset.theme = get('wc_t', 'dark'); root.dataset.pal = get('wc_p', 'ocean');
var pad = function (n) { return String(n).padStart(2, '0'); };
var dkey = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
var today0 = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
var dayIdx = function () { return Math.floor(today0() / DAY); };
var S = { kind: 'test', run: 'test', el: 0, view: 'home', mode: 'mock', pool: 'all', diff: 0, secs: {}, gtab: GROUPS[0].n, neg: SET.defNeg, tneg: true, mins: SET.defMins, cnt: 20,
  qs: [], ans: [], qt: [], mk: {}, fl: [], cur: 0, left: 0, total: 0, t: null, grid: false, tab: 'last', sf: 'all', wl: null, src: '', daily: '',
  paused: false, fs: false, fsx: 0, tabx: 0, tabNote: false, ph: {}, pfold: {}, pt: {}, pdone: {}, ltab: 'daily', ruleF: 'all', wsel: 'g' };
TOPICS.forEach(function (t) { S.secs[t] = false; });
function prefs() { root.style.setProperty('--fs', ['14.5px', '16px', '18px'][SET.font]); root.dataset.motion = SET.motion ? 'on' : 'off'; }
function saveSet() { put('wc_set', SET); prefs(); }
prefs();

/* ---------- helpers ---------- */
var fmt = function (s) { s = Math.max(0, s); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
var pct = function (a, b) { return b ? Math.round(a / b * 100) : 0; };
var tone = function (p) { return p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444'; };
var lab = function (p) { return p >= 75 ? 'Strong' : p >= 50 ? 'Average' : 'Weak'; };
var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
var plain = function (s) { return String(s).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]*>/g, ''); };
function bar(p) { return '<div class="bar"><i style="width:' + p + '%;background:' + tone(p) + '"></i></div>'; }
function render(h, keep) {
  var y = window.scrollY; app.innerHTML = h;
  if (keep) { window.scrollTo(0, y); return; }
  app.classList.remove('in'); void app.offsetWidth; app.classList.add('in'); window.scrollTo(0, 0);
}
function sw(on, act, v) { return '<button class="sw ' + (on ? 'on' : '') + '" role="switch" aria-checked="' + !!on + '" data-act="' + act + '" data-v="' + esc(v || '') + '"><i></i></button>'; }
function fabs(t) {
  $('#bGrid').style.display = t ? 'block' : 'none'; $('#bExit').style.display = t ? 'block' : 'none';
  $('#bPad').style.display = $('#bCalc').style.display = (t && SET.tools) ? 'block' : 'none';
}
function buzz() { if (SET.haptic && navigator.vibrate) try { navigator.vibrate(10); } catch (e) {} }
function ask(m) { return SET.confirmSubmit ? confirm(m) : true; }
function getWake() { if (SET.wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { S.wl = l; }).catch(function () {}); }
function relWake() { try { if (S.wl) S.wl.release(); } catch (e) {} S.wl = null; }
function shuf(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function label(q) { return (ICON[q.s] || '') + ' ' + esc(q.s) + (q.r && RB[q.r] ? ' · ' + esc(RB[q.r].n) : ''); }
function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('show'); }, 2600); }
function download(name, txt, mime) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: mime || 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
function speak(w) { if (!SET.speech || !window.speechSynthesis) return toast('Pronunciation is not available on this device.'); try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(w); u.lang = 'en-IN'; u.rate = .85; speechSynthesis.speak(u); } catch (e) {} }
var FL = { s: '🟢 Sure', g: '🟡 Guess', c: '🔴 Confused', u: '⚪ Not flagged' };
var MT = { concept: ['🧠 Concept gap', '#ef4444'], careless: ['⚡ Careless slip', '#f59e0b'], time: ['⏱ Time pressure / skipped', '#3b82f6'] };

/* ---------- XP / level / weekly goal ---------- */
function addXP(n) { XP += n; put('wc_xp', XP); }
function level() { var l = Math.floor(Math.sqrt(XP / 50)) + 1, lo = 50 * (l - 1) * (l - 1), hi = 50 * l * l; return { l: l, p: Math.round((XP - lo) / (hi - lo) * 100), next: hi - XP }; }
function weekQs() {
  var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); var n = 0;
  for (var i = 0; i < 7; i++) { var r = DAYM[dkey(d)]; if (r) n += r.q; d.setDate(d.getDate() + 1); } return n;
}
function logDay(q, t) { var k = dkey(), d = DAYM[k] || (DAYM[k] = { q: 0, t: 0 }); d.q += q; d.t += t; put('wc_days', DAYM); }

/* ---------- saved questions + spaced repetition (Leitner) ---------- */
function keep(q, f) {
  var e = SAV[q._k] || (SAV[q._k] = { k: q._k, s: q.s, r: q.r || '', q: q.q, o: q.o, a: q.a, e: q.e || '', p: q.p || '' });
  e[f] = true;
}
function persist() { Object.keys(SAV).forEach(function (k) { if (!SAV[k].b && !SAV[k].w) delete SAV[k]; }); put('wc_sav', SAV); }
function dueList() { return Object.keys(SAV).map(function (k) { return SAV[k]; }).filter(function (e) { return e.w && (e.due || 0) <= today0(); }); }
function dueText(e) { var d = Math.round(((e.due || 0) - today0()) / DAY); return d <= 0 ? 'Due today' : 'Review in ' + d + 'd'; }

/* ---------- streaks ---------- */
function streak() { var n = 0, x = new Date(); if (!DAYM[dkey(x)]) x.setDate(x.getDate() - 1); while (DAYM[dkey(x)]) { n++; x.setDate(x.getDate() - 1); } return n; }
function bestStreak() {
  var b = 0, c = 0, prev = null;
  Object.keys(DAYM).sort().forEach(function (k) { var d = new Date(k + 'T00:00'); c = (prev && Math.round((d - prev) / DAY) === 1) ? c + 1 : 1; if (c > b) b = c; prev = d; });
  return b;
}

/* ---------- in-progress test: autosave / resume ---------- */
function saveRun() {
  if (S.view !== 'test') return;
  put('wc_run', { run: S.run, mode: S.mode, tneg: S.tneg, src: S.src, daily: S.daily, ans: S.ans, qt: S.qt, mk: S.mk, fl: S.fl, cur: S.cur, left: S.left, total: S.total, el: S.el, fsx: S.fsx, tabx: S.tabx, ph: S.ph, pt: S.pt, pdone: S.pdone });
}
function clearRun() { del('wc_run'); del('wc_run_q'); }
function resume() {
  var r = get('wc_run', null), q = get('wc_run_q', null); if (!r || !q) return;
  Object.assign(S, { run: r.run, mode: r.mode, tneg: r.tneg, src: r.src, daily: r.daily || '', qs: q, ans: r.ans, qt: r.qt, mk: r.mk, fl: r.fl || q.map(function () { return null; }),
    cur: r.cur, left: r.left, total: r.total, el: r.el, fsx: r.fsx || 0, tabx: r.tabx || 0, ph: r.ph || {}, pt: r.pt || {}, pdone: r.pdone || {}, pfold: {}, paused: false });
  clearInterval(S.t); S.t = setInterval(tick, 1000); getWake(); reqFS(S.run, S.mode); fabs(true); test();
}

/* ---------- full-screen exam mode (sectional mock only) ---------- */
function reqFS(kind, mode) {
  var el = document.documentElement;
  if (kind === 'test' && mode === 'mock' && SET.fullscreen && el.requestFullscreen) { S.fs = true; el.requestFullscreen().catch(function () { S.fs = false; }); } else S.fs = false;
}
function exitFS() { S.fs = false; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); }
document.addEventListener('fullscreenchange', function () {
  if (document.fullscreenElement) { $('#warn').classList.remove('show'); return; }
  if (S.fs && S.view === 'test' && !S.paused) { S.fsx++; saveRun(); $('#warn').classList.add('show'); }
});
document.addEventListener('visibilitychange', function () {
  if (document.hidden) { if (S.view === 'test' && S.run === 'test' && S.mode === 'mock' && !S.paused) { S.tabx++; S.tabNote = true; saveRun(); } }
  else if (S.tabNote) { S.tabNote = false; toast('⚠️ Tab switch recorded (' + S.tabx + ')'); }
});
function pause() {
  if (S.view !== 'test' || S.run !== 'test' || S.paused) return;
  S.paused = true; closeGrid(); closeTools(); saveRun();
  $('#pLeft').textContent = fmt(S.left); $('#pause').classList.add('show');
}
function unpause() { S.paused = false; $('#pause').classList.remove('show'); if (S.fs && !document.fullscreenElement) reqFS(S.run, S.mode); }

/* ---------- rule / weakness aggregates (used on home) ---------- */
function ruleAgg() {
  var s = {};
  ATT.forEach(function (a) { Object.keys(a.rl || {}).forEach(function (k) { var v = a.rl[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0, t: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; x.t += v.t; }); });
  return s;
}
function agg() {
  var s = {};
  ATT.forEach(function (a) { Object.keys(a.secs).forEach(function (k) { var v = a.secs[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0, t: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; x.t += v.t; }); });
  return s;
}
function aggGroup(g) {
  var s = {}; GROUPS.forEach(function (x) { s[x.n] = { c: 0, w: 0, n: 0, t: 0 }; });
  Object.keys(g).forEach(function (k) { var G = GRP[k]; if (!G) return; ['c', 'w', 'n', 't'].forEach(function (f) { s[G][f] += g[k][f]; }); });
  return s;
}
function weakFirst(g) { return Object.keys(g).sort(function (a, b) { return pct(g[a].c, g[a].t) - pct(g[b].c, g[b].t) || ti(a) - ti(b); }); }
function coachInfo() {
  var g = ruleAgg(), ks = Object.keys(g).filter(function (k) { return RB[k] && g[k].t >= 3; });
  if (!ks.length) return null; ks = weakFirst(g).filter(function (k) { return RB[k] && g[k].t >= 3; });
  return { k: ks[0], p: pct(g[ks[0]].c, g[ks[0]].t) };
}

/* ---------- question pool ---------- */
function counts(unseen, diff) {
  var c = {}; TOPICS.forEach(function (t) { c[t] = 0; });
  BANK.forEach(function (q) { if (unseen && SEEN[q.k]) return; if (diff && q.d !== diff) return; c[q.s]++; });
  return c;
}
var sumC = function (c, only) { return Object.keys(c).reduce(function (n, k) { return n + (!only || only[k] ? c[k] : 0); }, 0); };
function selMap() { var m = {}; TOPICS.forEach(function (t) { if (S.secs[t]) m[t] = 1; }); return m; }
function pick(list, cnt) {   /* keeps all questions of one passage together */
  var units = [], pm = {};
  list.forEach(function (q) { if (q.p) { if (!pm[q.p]) { pm[q.p] = []; units.push(pm[q.p]); } pm[q.p].push(q); } else units.push([q]); });
  units = shuf(units); var out = [];
  if (!cnt) return out.concat.apply(out, units);
  for (var i = 0; i < units.length; i++) { if (out.length >= cnt) break; if (out.length + units[i].length <= cnt) out = out.concat(units[i]); }
  return out.length ? out : units[0];   /* a lone passage bigger than the count is still returned whole */
}
function byTopic(l) { return l.slice().sort(function (a, b) { return ti(a.s) - ti(b.s); }); }
function buildMock() {
  var gq = BANK.filter(function (q) { return GRP[q.s] === 'Grammar'; }), vq = BANK.filter(function (q) { return GRP[q.s] === 'Vocabulary'; });
  var out = byTopic(shuf(gq).slice(0, 10)).concat(byTopic(shuf(vq).slice(0, 10)));
  ['Comprehension Passage', 'Cloze Test'].forEach(function (t) {
    var ids = Object.keys(PASS).filter(function (id) { return PASS[id].topic === t; }); if (!ids.length) return;
    var id = shuf(ids)[0]; out = out.concat(BANK.filter(function (q) { return q.p === id; }));
  });
  var pj = shuf(BANK.filter(function (q) { return q.s === 'Para Jumbles'; })).slice(0, 2); return out.concat(pj);
}

/* ---------- home ---------- */
function routineTasks() {
  var d = DR[dkey()] || {};
  return [['p', '📖', '1 reading passage', d.p], ['g', '📘', '5 grammar questions', d.g], ['w', '🗂️', '10 words to learn', d.w]];
}
function routineCard(full) {
  var t = routineTasks(), n = t.filter(function (x) { return x[3]; }).length;
  return '<div class="card"><div class="line" style="padding-top:0"><b>📅 Today\'s routine</b><span class="pill">' + n + '/3</span></div>' +
    t.map(function (x) { return '<div class="rtask ' + (x[3] ? 'done' : '') + '"><span class="ck">' + (x[3] ? '✓' : '') + '</span><span class="t">' + x[1] + ' ' + x[2] + '</span>' + (full ? '<button class="btn s' + (x[3] ? ' g' : '') + '" data-act="dstart" data-v="' + x[0] + '">' + (x[3] ? 'Again' : 'Start') + '</button>' : '') + '</div>'; }).join('') +
    (full ? '' : '<button class="btn s" data-act="learn" data-v="daily" style="margin-top:10px">Open routine →</button>') +
    (n === 3 ? '<p class="mu" style="margin-top:8px">🎉 Routine complete — streak safe!</p>' : '') + '</div>';
}
function homeCards() {
  var h = '', run = get('wc_run', null), s = streak(), lv = level(), wk = weekQs(), goal = SET.weekGoal || 100;
  h += '<div class="card" style="' + (BANK.length ? '' : 'border-color:var(--a)') + '"><div class="line" style="padding:0"><span><b>📚 My library</b><small>' + BANK.length + ' questions · ' + Object.keys(PASS).length + ' passages · ' + WORDS.length + ' words' + (BANK.length ? '' : ' — add your first questions to begin') + '</small></span><span class="row"><button class="btn s" data-act="libopen">Open</button></span></div></div>';
  if (DEFER) h += '<div class="card hint"><span><b>📲 Install this app</b><br><span class="mu">Works offline from your home screen</span></span><button class="btn s" data-act="install">Install</button></div>';
  h += '<div class="card quote"><span class="mu">💬 Today\'s motivation</span><p>' + esc(QUOTES[dayIdx() % QUOTES.length]) + '</p></div>';
  h += '<div class="row" style="margin:-4px 0 12px"><span class="pill">🔥 ' + s + '-day streak</span><span class="pill">📝 ' + ATT.length + ' tests</span><span class="pill">⭐ Level ' + lv.l + '</span></div>';
  h += '<div class="card"><div class="line" style="padding:0"><span><b>⭐ ' + XP + ' XP</b><small>' + lv.next + ' XP to level ' + (lv.l + 1) + '</small></span><span class="mu">Weekly goal ' + Math.min(wk, goal) + '/' + goal + '</span></div>' +
    '<div class="bar xpbar"><i style="width:' + lv.p + '%"></i></div><div class="bar"><i style="width:' + Math.min(100, pct(wk, goal)) + '%;background:#10b981"></i></div></div>';
  if (run && get('wc_run_q', null)) {
    var done = run.ans.filter(function (x) { return x !== null; }).length;
    h += '<div class="card" style="border-color:var(--a)"><b>⏯ Unfinished ' + (run.run === 'quiz' ? 'quiz' : 'test') + '</b><p class="mu" style="margin:4px 0 10px">' + esc(run.src) + ' · Q' + (run.cur + 1) + ' · ' + done + ' answered' + (run.run === 'test' ? ' · ' + fmt(run.left) + ' left' : '') + '</p><div class="row"><button class="btn s" data-act="resume">▶ Resume</button><button class="btn g s" data-act="discard">Discard</button></div></div>';
  }
  h += routineCard(false);
  var due = dueList().length;
  if (due) h += '<div class="card hint"><span><b>🔁 Revision due: ' + due + '</b><br><span class="mu">Wrong answers ready for review</span></span><button class="btn s" data-act="revdue">Revise</button></div>';
  var vd = vocDue().length;
  if (vd) h += '<div class="card hint"><span><b>🗂️ ' + vd + ' flashcard' + (vd > 1 ? 's' : '') + ' due</b><br><span class="mu">Spaced repetition keeps words in memory</span></span><button class="btn s" data-act="fdue">Review</button></div>';
  var c = coachInfo();
  h += c ? '<div class="card hint"><span><b>🎯 Weak-rule coach</b><br><span class="mu">You often miss <b style="color:' + tone(c.p) + '">' + esc(RB[c.k].n) + ' (' + c.p + '%)</b>. Read the rule, then drill it.</span></span><button class="btn s" data-act="coach" data-v="' + esc(c.k) + '">Fix it</button></div>'
           : '<div class="card"><b>🎯 Weak-rule coach</b><p class="mu" style="margin-top:4px">Take a few tests and I\'ll find the grammar rule that needs you most.</p></div>';
  return h;
}
function home(keepScroll) {
  S.view = 'home'; clearInterval(S.t); relWake(); fabs(false); closeGrid(); closeTools();
  var q = S.kind === 'quiz', mock = S.mode === 'mock', un = !mock && S.pool === 'unseen', cAll = counts(false, 0), cSel = counts(un, S.diff);
  var nTotal = sumC(cAll), nCovered = TOPICS.filter(function (t) { return cAll[t] > 0; }).length, card = '', g = agg();
  var stats = '<div class="stats" style="grid-template-columns:repeat(3,1fr)">' + stat('Questions', nTotal) + stat('Topics', nCovered + '/' + TOPICS.length) + stat('Words', WORDS.length) + '</div>';
  if (mock) {
    card = '<b>Sectional mock</b><p class="mu" style="margin-top:4px">Up to 10 Grammar + 10 Vocabulary + 1 reading passage + 1 cloze test + 2 para jumbles from your library · ' + R.mockMinutes + ' minutes · negative marking ' + R.negative.toFixed(2) + '.</p><div class="tgrid" style="margin-top:10px">' +
      GROUPS.map(function (G) { return '<span class="tag">' + G.i + ' ' + G.n + ' <b>' + sumC(cAll, (function () { var m = {}; G.topics.forEach(function (t) { m[t.n] = 1; }); return m; })()) + '</b></span>'; }).join('') + '</div>';
  } else {
    var sel = TOPICS.filter(function (t) { return S.secs[t]; }), G0 = GROUPS.filter(function (x) { return x.n === S.gtab; })[0], avail = sumC(cSel, selMap());
    if (q) card += '<b>Instant-feedback quiz</b><p class="mu" style="margin:4px 0 8px">See the answer, explanation and rule link right after each question. No timer.</p>';
    card += '<div class="line" style="padding-top:0"><b>Choose topics</b><span class="row"><button class="btn g s" data-act="topall">All</button><button class="btn g s" data-act="topgrp">This group</button><button class="btn g s" data-act="topweak">🎯 Weakest 3</button><button class="btn g s" data-act="topnone">None</button></span></div>' +
      '<div class="gtabs">' + GROUPS.map(function (x) { var k = x.topics.filter(function (t) { return S.secs[t.n]; }).length; return '<button class="chip ' + (S.gtab === x.n ? 'on' : '') + '" data-act="gtab" data-v="' + x.n + '">' + x.i + ' ' + x.n + (k ? ' (' + k + ')' : '') + '</button>'; }).join('') + '</div>' +
      '<p class="mu"><b style="color:var(--tx)">' + sel.length + '</b> of ' + TOPICS.length + ' topics · <b style="color:var(--tx)">' + avail + '</b> questions available</p><div class="tgrid">' +
      G0.topics.map(function (t) { var n = cSel[t.n], gp = g[t.n] && g[t.n].t ? pct(g[t.n].c, g[t.n].t) : null;
        return '<button class="chip ' + (S.secs[t.n] ? 'on' : '') + '" ' + (!n && !S.secs[t.n] ? 'disabled' : '') + ' data-act="sec" data-v="' + esc(t.n) + '">' + t.i + ' ' + esc(t.n) + ' <span class="cn">' + n + '</span>' + (gp === null ? '' : '<i class="mdot" style="background:' + tone(gp) + '"></i>') + '</button>'; }).join('') +
      '</div><p class="mu" style="margin-top:8px"><i class="mdot" style="background:#10b981"></i> strong <i class="mdot" style="background:#f59e0b"></i> average <i class="mdot" style="background:#ef4444"></i> weak — from your past tests</p>' +
      '<div class="line"><span>Difficulty</span><span class="row">' + [[0, 'All'], [1, 'Easy'], [2, 'Medium'], [3, 'Hard']].map(function (x) { return '<button class="chip ' + (S.diff === x[0] ? 'on' : '') + '" style="padding:6px 12px" data-act="diff" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</span></div>' +
      '<div class="line"><span>Question pool</span><span class="row"><button class="chip ' + (!un ? 'on' : '') + '" style="padding:6px 12px" data-act="pool" data-v="all">All</button><button class="chip ' + (un ? 'on' : '') + '" style="padding:6px 12px" data-act="pool" data-v="unseen">🆕 Unseen only</button></span></div>' +
      '<div class="line"><span>Number of questions</span><span class="row">' + [10, 20, 30, 0].map(function (c) { return '<button class="chip ' + (S.cnt === c ? 'on' : '') + '" style="padding:6px 12px" data-act="cnt" data-v="' + c + '">' + (c || 'All (' + avail + ')') + '</button>'; }).join('') + '</span></div>';
  }
  if (!mock) card += '<div class="line"><span>Negative marking</span>' + sw(S.neg, 'neg') + '</div>';
  if (!mock && !q) card += '<div class="line"><span>Time (minutes)</span><input type="number" id="mins" min="1" max="180" value="' + S.mins + '"></div>';
  card += '<div class="line"><span>Rough pad &amp; calculator<small>Show ✏️ and 🧮 during the test</small></span>' + sw(SET.tools, 'tg', 'tools') + '</div>';
  if (!q && mock) card += '<div class="line"><span>Full-screen exam mode<small>Warns if you leave full-screen or switch tabs</small></span>' + sw(SET.fullscreen, 'tg', 'fullscreen') + '</div>';
  var nStart = mock ? buildMock().length : Math.min(S.cnt || 1e9, sumC(cSel, selMap()));
  var learn = '<div class="tgrid">' + [['rules', '📘', 'Rule cards'], ['flash', '🗂️', 'Flashcards'], ['wotd', '🌟', 'Word of the Day'], ['pairs', '👯', 'Confusing pairs'], ['daily', '📅', 'Daily routine'], ['rc', '📖', 'RC reader']].map(function (x) { return '<button class="chip" data-act="learn" data-v="' + x[0] + '">' + x[1] + ' ' + x[2] + '</button>'; }).join('') + '</div>';
  render('<section class="hero"><h1>Master Competitive English</h1><p class="mu">Build your own question library for Grammar, Vocabulary and Reading — then practise with tests, flashcards, rule cards and smart analytics.</p></section>' + stats + homeCards() +
    '<h2>Learn</h2>' + learn +
    '<h2>1 · Mode</h2><div class="chips"><button class="chip ' + (!q ? 'on' : '') + '" data-act="kind" data-v="test">📝 Exam Test</button><button class="chip ' + (q ? 'on' : '') + '" data-act="kind" data-v="quiz">💡 Quiz (instant answers)</button></div>' +
    '<h2>2 · Scope</h2><div class="chips"><button class="chip ' + (mock ? 'on' : '') + '" data-act="mode" data-v="mock">Sectional mock</button><button class="chip ' + (!mock ? 'on' : '') + '" data-act="mode" data-v="topic">Topic-wise practice</button></div>' +
    '<div class="card" style="margin-top:12px">' + card + '</div>' +
    '<button class="btn" data-act="start" style="width:100%;padding:16px">' + (q ? 'Start Quiz' : 'Start Test') + (nStart ? ' · ' + nStart + ' questions' : '') + ' →</button>', keepScroll);
}
document.addEventListener('input', function (e) {
  if (e.target.id === 'mins') S.mins = +e.target.value || 1;
  if (e.target.id === 'dm') { SET.defMins = Math.max(1, Math.min(180, +e.target.value || 30)); S.mins = SET.defMins; saveSet(); }
  if (e.target.id === 'wg') { SET.weekGoal = Math.max(10, Math.min(1000, +e.target.value || 100)); saveSet(); }
});

/* ---------- start a test ---------- */
function start(opt) {
  if (S.view === 'test') return;
  var mock = S.mode === 'mock', secs = TOPICS.filter(function (t) { return S.secs[t]; }), qs;
  if (!mock && !secs.length && !(opt && opt.rule)) return alert('Select at least one topic.');
  if (get('wc_run', null) && !confirm('You have an unfinished test. Discard it and start a new one?')) return;
  if (mock) { qs = buildMock(); S.src = R.examName + ' · Sectional mock'; if (!qs.length) return alert('Your library has no questions yet. Add some under 📚 My library.'); }
  else {
    var cnt = (opt && opt.cnt != null) ? opt.cnt : S.cnt, pool = BANK.filter(function (q) { return S.secs[q.s] && (!S.diff || q.d === S.diff) && (S.pool !== 'unseen' || !SEEN[q.k]); });
    if (opt && opt.rule) pool = BANK.filter(function (q) { return q.r === opt.rule; });
    if (!pool.length) return alert(!BANK.length ? 'Your library has no questions yet. Add some under 📚 My library.' : S.pool === 'unseen' ? 'You have seen every question in this selection. Switch the pool to "All".' : 'No questions found for this selection.');
    qs = byTopic(pick(pool, cnt)); S.src = R.examName + ' · Topic practice';
  }
  reqFS(S.kind, S.mode);
  S.daily = '';
  begin(qs.map(function (q) { return Object.assign({}, q, { _k: q.k, _src: S.src }); }), S.kind === 'quiz' ? 0 : (mock ? R.mockMinutes : Math.max(1, S.mins)) * 60);
}
function begin(qs, total, kind) {
  S.run = kind || S.kind; S.tneg = S.neg; S.paused = false; S.fsx = 0; S.tabx = 0; S.tabNote = false; S.ph = {}; S.pfold = {}; S.pt = {}; S.pdone = {};
  if (SET.shuffleQ) { var g = {}, o = []; qs.forEach(function (q) { if (!g[q.s]) { g[q.s] = []; o.push(q.s); } g[q.s].push(q); }); qs = []; o.forEach(function (s) { qs = qs.concat(g[s][0].p ? g[s] : shuf(g[s])); }); }
  if (SET.shuffleO) qs = qs.map(function (q) { if (q.s === 'Error Spotting' || q.s === 'Sentence Improvement') return q; var ord = shuf(q.o.map(function (_, i) { return i; })); return Object.assign({}, q, { o: ord.map(function (i) { return q.o[i]; }), a: ord.indexOf(q.a) }); });
  S.qs = qs; S.ans = qs.map(function () { return null; }); S.qt = qs.map(function () { return 0; }); S.fl = qs.map(function () { return null; }); S.mk = {};
  S.cur = 0; S.total = total; S.left = total; S.el = 0;
  PAD.strokes = []; CALC = calcNew(); calcUI();
  put('wc_run_q', qs);
  clearInterval(S.t); S.t = setInterval(tick, 1000); getWake(); fabs(true); test();
}
function tick() {
  if (S.paused) return;
  S.el++; var q = S.qs[S.cur];
  if (S.view === 'test') { S.qt[S.cur]++; if (q && q.p) { S.pt[q.p] = (S.pt[q.p] || 0) + 1; var pe = $('#pt'); if (pe) pe.textContent = '⏱ ' + fmt(S.pt[q.p]); } }
  if (S.el % 5 === 0) saveRun();
  if (S.run === 'quiz') return;
  S.left--;
  var el = $('#tm'); if (el) { el.textContent = SET.showTimer ? fmt(S.left) : '⏱ ••'; el.classList.toggle('low', S.left < 300); }
  if (S.left <= 0) { toast('⏰ Time is up!'); submit(); }
}

/* ---------- reading tools: passage panel (highlighter, timer, WPM) ---------- */
function passagePanel(q) {
  if (!q.p || !PASS[q.p]) return '';
  var p = PASS[q.p], fold = S.pfold[q.p], w = S.pdone[q.p];
  return '<div class="passage ' + (fold ? 'fold' : '') + '"><div class="ptoolbar"><b>' + esc(p.title) + '</b><span class="mu">· ' + p.words + ' words</span><span class="ptimer" id="pt" style="margin-left:auto">⏱ ' + fmt(S.pt[q.p] || 0) + '</span></div>' +
    '<div class="ptoolbar"><button class="chip" data-act="pfold">' + (fold ? '▾ Show' : '▴ Hide') + '</button>' +
    [['y', '#f2b84b'], ['g', '#2fbf8f'], ['p', '#f0567a']].map(function (c) { return '<button class="dot" data-hl="1" data-act="hl" data-v="' + c[0] + '" style="background:' + c[1] + '" aria-label="Highlight ' + c[0] + '"></button>'; }).join('') +
    '<button class="chip" data-act="pclear">Clear</button>' + (w ? '<span class="pill">⚡ ' + w + ' wpm</span>' : '<button class="chip" data-act="pwpm">⚡ Done reading</button>') + '</div>' +
    '<div class="pbody">' + (S.ph[q.p] || p.text) + '</div></div>';
}
function ruleLink(q) { return q.r && RB[q.r] ? '<button class="rules-a" data-act="rulepop" data-v="' + q.r + '">📘 Rule: ' + esc(RB[q.r].n) + ' — read the rule card</button>' : ''; }

/* ---------- question screens ---------- */
function tchips(q) {
  var secs = []; S.qs.forEach(function (x) { if (secs.indexOf(x.s) < 0) secs.push(x.s); });
  return '<div class="chips sm tscroll">' + secs.map(function (s) { return '<button class="chip ' + (s === q.s ? 'on' : '') + '" data-act="secjump" data-v="' + esc(s) + '">' + (ICON[s] || '') + ' ' + esc(s) + '</button>'; }).join('') + '</div>';
}
function centerChip() { var c = $('.tscroll .on'); if (c) { var p = c.parentNode; p.scrollLeft = c.offsetLeft - p.clientWidth / 2 + c.clientWidth / 2; } }
function flagsRow(locked) {
  var f = S.fl[S.cur];
  return '<div class="flags"><span class="mu">Confidence:</span>' + [['s', '🟢 Sure'], ['g', '🟡 Guess'], ['c', '🔴 Confused']].map(function (x) { return '<button class="chip ' + (f === x[0] ? 'on' : '') + '" ' + (locked ? 'disabled' : '') + ' data-act="flag" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
}
function quizView(keepS) {
  var q = S.qs[S.cur], a = S.ans[S.cur], done = a !== null, c = 0, w = 0, sv = SAV[q._k] && SAV[q._k].b;
  S.ans.forEach(function (x, i) { if (x !== null) { x === S.qs[i].a ? c++ : w++; } });
  render('<div class="top"><span class="mu">Q ' + (S.cur + 1) + ' / ' + S.qs.length + '</span><span class="timer">✅ ' + c + ' · ❌ ' + w + '</span></div><div class="bar"><i style="width:' + ((S.cur + 1) / S.qs.length * 100) + '%"></i></div>' + tchips(q) + passagePanel(q) +
    '<div class="card"><span class="tag">' + label(q) + '</span><div style="height:8px"></div><b class="qt">' + q.q + '</b>' +
    q.o.map(function (o, i) { return '<button class="opt ' + (done ? (i === q.a ? 'ok' : i === a ? 'bad' : '') : '') + '" data-act="opt" data-v="' + i + '">' + 'ABCDE'.charAt(i) + '. ' + o + '</button>'; }).join('') + flagsRow(done) +
    (done ? '<div class="expl"><b>' + (a === q.a ? '✅ Correct!' : '❌ Incorrect') + '</b> · Answer: ' + 'ABCDE'.charAt(q.a) + '<br>💡 ' + (q.e || 'No explanation yet.') + ruleLink(q) + '</div>' : '') + '</div>' +
    '<div class="row"><button class="btn g" data-act="prev">←</button><button class="btn g" data-act="save">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button><button class="btn" data-act="next" style="margin-left:auto">' + (S.cur === S.qs.length - 1 ? 'Finish ✓' : 'Next →') + '</button></div>', keepS);
  centerChip(); if (S.grid) fillGrid(); saveRun();
}
function qcls(i) {
  if (S.run === 'quiz') return S.ans[i] === null ? '' : (S.ans[i] === S.qs[i].a ? 'ok' : 'bad');
  return (S.ans[i] !== null ? 'ans' : '') + ' ' + (S.mk[i] ? 'mk' : '');
}
function test(keepS) {
  S.view = 'test'; if (S.run === 'quiz') return quizView(keepS);
  var q = S.qs[S.cur], done = S.ans.filter(function (a) { return a !== null; }).length, sv = SAV[q._k] && SAV[q._k].b;
  render('<div class="top"><span class="mu">Q ' + (S.cur + 1) + ' / ' + S.qs.length + ' · ' + done + ' answered</span><span class="row"><button class="btn g s" data-act="pause">⏸ Pause</button><span class="timer ' + (S.left < 300 ? 'low' : '') + '" id="tm">' + (SET.showTimer ? fmt(S.left) : '⏱ ••') + '</span></span></div><div class="bar"><i style="width:' + ((S.cur + 1) / S.qs.length * 100) + '%"></i></div>' + tchips(q) + passagePanel(q) +
    '<div class="card"><span class="tag">' + label(q) + '</span><div style="height:8px"></div><b class="qt">' + q.q + '</b>' +
    q.o.map(function (o, i) { return '<button class="opt ' + (S.ans[S.cur] === i ? 'sel' : '') + '" data-act="opt" data-v="' + i + '">' + 'ABCDE'.charAt(i) + '. ' + o + '</button>'; }).join('') + flagsRow(false) + '</div>' +
    '<div class="row"><button class="btn g" data-act="prev">←</button><button class="btn g" data-act="mark">' + (S.mk[S.cur] ? '★ Marked' : '☆ Mark') + '</button><button class="btn g" data-act="save">' + (sv ? '🔖 Saved' : '🔖 Save') + '</button><button class="btn g" data-act="clear">Clear</button><button class="btn" data-act="next" style="margin-left:auto">' + (S.cur === S.qs.length - 1 ? 'Submit ✓' : 'Next →') + '</button></div>', keepS);
  centerChip(); if (S.grid) fillGrid(); saveRun();
}
function fillGrid() {
  var a = S.ans.filter(function (x) { return x !== null; }).length, m = Object.keys(S.mk).length;
  $('#drawer').innerHTML = '<b>Questions</b><p class="mu" style="margin-top:4px">🟩 ' + a + ' answered · 🟧 ' + m + ' marked · ' + (S.qs.length - a) + ' left</p><div class="grid">' +
    S.qs.map(function (_, i) { return '<button class="qn ' + qcls(i) + ' ' + (i === S.cur ? 'cur' : '') + '" data-act="jump" data-v="' + i + '">' + (i + 1) + '</button>'; }).join('') +
    '</div><button class="btn" data-act="submit" style="width:100%">' + (S.run === 'quiz' ? 'Finish Quiz' : 'Submit Test') + '</button>';
}
function openGrid() { S.grid = true; fillGrid(); $('#drawer').classList.add('show'); $('#shade').classList.add('show'); }
function closeGrid() { S.grid = false; $('#drawer').classList.remove('show'); $('#shade').classList.remove('show'); }

/* ---------- submit + result ---------- */
function submit() {
  clearInterval(S.t); relWake(); fabs(false); closeGrid(); closeTools(); exitFS(); clearRun();
  S.paused = false; $('#pause').classList.remove('show'); $('#warn').classList.remove('show'); S.view = 'result';
  var neg = (S.run === 'test' && S.mode === 'mock') ? R.negative : (S.tneg ? R.negative : 0);
  var st = {}, rl = {}, det = [], full = [], conf = {}, mt = { concept: 0, careless: 0, time: 0 }, sc = 0, att = 0, mastered = 0, right = 0, tomorrow = today0() + DAY;
  var answered = S.qt.filter(function (t, i) { return S.ans[i] !== null; }), avgT = answered.length ? answered.reduce(function (a, b) { return a + b; }, 0) / answered.length : 1;
  S.qs.forEach(function (q, i) {
    var r = S.ans[i] === null ? 'n' : S.ans[i] === q.a ? 'c' : 'w', f = S.fl[i] || 'u', t = S.qt[i] || 0, m = '';
    var x = st[q.s] = st[q.s] || { c: 0, w: 0, n: 0, t: 0 }, cf = conf[f] = conf[f] || { c: 0, w: 0, n: 0 };
    x.t++; x[r]++; cf[r]++; if (r === 'c') { sc++; right++; } if (r === 'w') sc -= neg; if (r !== 'n') att++;
    if (q.r) { var y = rl[q.r] = rl[q.r] || { c: 0, w: 0, n: 0, t: 0 }; y.t++; y[r]++; }
    if (r === 'n') m = 'time';
    else if (r === 'w') m = (f === 'c' || t >= 1.5 * avgT) ? 'concept' : (f === 's' || t <= .6 * avgT) ? 'careless' : 'concept';
    if (m) mt[m]++;
    if (r !== 'n' && q._k) SEEN[q._k] = 1;
    det.push({ s: q.s, r: r, t: t, f: f, m: m, ru: q.r || '' });
    full.push({ s: q.s, c: q.r && RB[q.r] ? RB[q.r].n : '', q: plain(q.q), o: q.o, a: q.a, y: S.ans[i], t: t, f: f, e: plain(q.e || '') });
    var e = SAV[q._k];
    if (r === 'w' && (SET.autoWrong || S.mode === 'saved')) { keep(q, 'w'); e = SAV[q._k]; e.box = 1; e.due = tomorrow; }
    else if (r === 'c' && S.mode === 'saved' && e && e.w) {
      e.box = (e.box || 1) + 1;
      if (e.box > 4) { e.w = false; e.box = 0; delete e.due; mastered++; } else e.due = today0() + INT[e.box - 1] * DAY;
    }
  });
  persist(); put('wc_seen', SEEN);
  logDay(att, 1); addXP(att + right * 2);
  var bonus = markDaily(S.daily);
  ATT.push({ ts: Date.now(), src: S.mode === 'saved' ? 'Revision practice' : S.src + (S.run === 'quiz' ? ' · Quiz' : ''), mode: S.mode, run: S.run, sc: sc, max: S.qs.length, neg: neg, used: S.el, total: S.total, secs: st, rl: rl, mt: mt, det: det, conf: conf, fsx: S.fsx, tabx: S.tabx, full: full });
  if (ATT.length > 60) ATT.shift();
  ATT.forEach(function (a, i) { if (i < ATT.length - 5) delete a.full; });
  put('wc_att', ATT);
  var mtHtml = (mt.concept + mt.careless + mt.time) ? '<div class="card"><b>Why marks were lost</b><div style="margin-top:8px">' + Object.keys(MT).map(function (k) { return mt[k] ? '<span class="mt" style="background:' + MT[k][1] + '">' + MT[k][0] + ' · ' + mt[k] + '</span>' : ''; }).join('') + '</div></div>' : '';
  render('<div class="card res">' + ring(sc, S.qs.length) + '<p class="mu">Time taken: ' + fmt(ATT[ATT.length - 1].used) + ' · ⭐ +' + (att + right * 2) + ' XP' + (S.fsx + S.tabx ? ' · ⚠️ ' + (S.fsx + S.tabx) + ' focus lapse(s)' : '') + '</p></div>' +
    mtHtml + (bonus ? '<div class="card quote"><b>' + bonus + '</b></div>' : '') +
    Object.keys(st).sort(function (a, b) { return ti(a) - ti(b); }).map(function (k) { var v = st[k]; return '<div class="card"><b>' + (ICON[k] || '') + ' ' + esc(k) + '</b> <span class="mu">✅ ' + v.c + ' · ❌ ' + v.w + ' · ⏭ ' + v.n + '</span><div class="bar" style="margin-bottom:0"><i style="width:' + pct(v.c, v.t) + '%"></i></div></div>'; }).join('') +
    '<div class="row" style="margin:6px 0"><button class="btn" data-act="sheet" data-v="last">📊 Full analysis</button><button class="btn g" data-act="exportq">⬇ Export attempted (CSV)</button><button class="btn g" data-act="home">← Home</button></div>' +
    (mastered ? '<p class="mu">🎉 ' + mastered + ' question(s) mastered and removed from your wrong notebook.</p>' : '') +
    (S.mode !== 'saved' && SET.autoWrong ? '<p class="mu">Wrong answers were added to your 🔖 notebook and scheduled for spaced revision.</p>' : '') +
    '<h2>Review</h2>' + S.qs.map(function (q, i) {
      return '<div class="card"><div class="line" style="padding-top:0"><span class="mu">' + label(q) + ' · Q' + (i + 1) + ' · ⏱ ' + (S.qt[i] || 0) + 's' + (S.fl[i] ? ' · ' + FL[S.fl[i]] : '') + (det[i].m ? ' · ' + MT[det[i].m][0] : '') + '</span><button class="btn g s" data-act="rsave" data-v="' + i + '">' + (SAV[q._k] && SAV[q._k].b ? '🔖 Saved' : '🔖 Save') + '</button></div>' +
        (q.p && PASS[q.p] ? '<p class="mu" style="margin-bottom:6px">📖 Passage: ' + esc(PASS[q.p].title) + '</p>' : '') + '<b class="qt">' + q.q + '</b>' +
        q.o.map(function (o, j) { return '<div class="opt ' + (j === q.a ? 'ok' : S.ans[i] === j ? 'bad' : '') + '">' + o + '</div>'; }).join('') + (q.e ? '<div class="expl">💡 ' + q.e + ruleLink(q) + '</div>' : '') + '</div>';
    }).join(''));
  celebrate(sc / S.qs.length, sc);
}
/* ---------- score ring + confetti ---------- */
function ring(sc, max) {
  var c = 0, w = 0, n = 0, p = Math.max(0, Math.min(1, sc / max));
  S.ans.forEach(function (a, i) { if (a === null) n++; else if (a === S.qs[i].a) c++; else w++; });
  var msg = p >= .75 ? 'Outstanding result!' : p >= .5 ? 'Good going — keep climbing' : p >= .25 ? 'Solid start — review and retry' : 'Every mistake here is a mark saved later';
  return '<div class="ringw"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--a)"/><stop offset="1" style="stop-color:var(--b)"/></linearGradient></defs>' +
    '<circle class="t" cx="60" cy="60" r="52"/><circle class="f" cx="60" cy="60" r="52" style="--o:' + (326.7 * (1 - p)).toFixed(1) + '"/></svg>' +
    '<div class="ringc"><b id="rnum">' + sc.toFixed(2) + '</b><small>out of ' + max + ' · ' + Math.round(p * 100) + '%</small></div></div>' +
    '<h3>' + msg + '</h3><div class="rp"><span style="color:#10b981">✅ ' + c + '</span><span style="color:#ef4444">❌ ' + w + '</span><span>⏭ ' + n + '</span></div>';
}
function celebrate(p, sc) {
  var el = $('#rnum'), t0 = performance.now();
  if (el && SET.motion) (function f(t) { var k = Math.min(1, (t - t0) / 1500); el.textContent = (sc * (1 - Math.pow(1 - k, 3))).toFixed(2); if (k < 1) requestAnimationFrame(f); })(t0);
  if (p < .25 || !SET.motion || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) return;
  var cv = $('#cf'), c = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight, ps = [], i,
      cols = ['#7b6cff', '#f2b84b', '#22b8cf', '#f0567a', '#2fbf8f', '#ff8a3d'], N = Math.round(70 + p * 150), st = performance.now();
  for (i = 0; i < N; i++) ps.push({ x: W / 2 + (Math.random() - .5) * 120, y: H * .3, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] });
  (function loop(t) {
    c.clearRect(0, 0, W, H);
    ps.forEach(function (q) { q.vy += .3; q.vx *= .992; q.x += q.vx; q.y += q.vy; q.r += q.vr; c.save(); c.translate(q.x, q.y); c.rotate(q.r); c.fillStyle = q.c; c.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); c.restore(); });
    if (t - st < 4200) requestAnimationFrame(loop); else c.clearRect(0, 0, W, H);
  })(st);
}
function exportQ() {
  var a = ATT[ATT.length - 1]; if (!a || !a.full) return alert('Nothing to export yet. Finish a test first.');
  var rows = [['#', 'Topic', 'Rule', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Your answer', 'Correct answer', 'Result', 'Time (s)', 'Confidence', 'Explanation']];
  a.full.forEach(function (x, i) {
    if (x.y === null || x.y === undefined) return;
    rows.push([i + 1, x.s, x.c, x.q, x.o[0] || '', x.o[1] || '', x.o[2] || '', x.o[3] || '', x.o[4] || '', 'ABCDE'.charAt(x.y) + '. ' + x.o[x.y], 'ABCDE'.charAt(x.a) + '. ' + x.o[x.a], x.y === x.a ? 'Correct' : 'Wrong', x.t, FL[x.f] ? FL[x.f].replace(/^\S+\s/, '') : '', x.e]);
  });
  if (rows.length === 1) return alert('You did not attempt any question in the last test.');
  var csv = '﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
  download('english-attempted-' + dkey(new Date(a.ts)) + '.csv', csv, 'text/csv;charset=utf-8');
}

/* ---------- daily routine ---------- */
function markDaily(tag) {
  if (!tag) return '';
  var k = dkey(), d = DR[k] || (DR[k] = {}), msg = '';
  if (!d[tag]) { d[tag] = 1; addXP(10); msg = '✅ Daily task done · +10 XP'; }
  if (d.p && d.g && d.w && !d.all) { d.all = 1; addXP(50); msg = '🏆 Daily routine complete! +50 XP bonus'; }
  put('wc_dr', DR); return msg;
}
function launchQuiz(qs, src, daily) {
  if (S.view === 'test') return alert('Finish or exit the current test first.');
  if (!qs.length) return toast('No questions available.');
  if (get('wc_run', null) && !confirm('You have an unfinished test. Discard it and continue?')) return;
  closeSheet(); S.mode = 'topic'; S.kind = 'quiz'; S.src = src; S.daily = daily || ''; S.neg = SET.defNeg;
  begin(qs.map(function (q) { return Object.assign({}, q, { _k: q.k || q._k, _src: src }); }), 0, 'quiz');
}
function dailyPassageId() {
  var ids = Object.keys(PASS).filter(function (id) { return PASS[id].topic === 'Comprehension Passage'; }); return ids.length ? ids[dayIdx() % ids.length] : null;
}
function dailyStart(v) {
  if (v === 'p') { var id = dailyPassageId(); if (!id) return; launchQuiz(BANK.filter(function (q) { return q.p === id; }), 'Daily · Reading passage', 'p'); }
  else if (v === 'g') {
    var gq = BANK.filter(function (q) { return GRP[q.s] === 'Grammar'; }), un = gq.filter(function (q) { return !SEEN[q.k]; });
    launchQuiz(shuf(un.length >= 5 ? un : gq).slice(0, 5), 'Daily · 5 grammar', 'g');
  } else { if (!WORDS.length) return toast('Add words first: 📚 Library → Words.'); flashStart(wotd().map(function (w) { return w.i; }), 'wotd'); learn('flash'); }
}

/* ---------- vocabulary: word of the day, flashcards (Leitner) ---------- */
function wotd() { if (!WORDS.length) return []; var n = Math.min(10, WORDS.length), s = (dayIdx() * 10) % WORDS.length, out = []; for (var i = 0; i < n; i++) out.push(WORDS[(s + i) % WORDS.length]); return out; }
function vocDue() { return WORDS.filter(function (w) { var r = VOC[w.w]; return r && r.b > 0 && (r.due || 0) <= today0(); }); }
function vocStats() {
  var m = 0, l = 0, wk = 0, now = Date.now();
  WORDS.forEach(function (w) { var r = VOC[w.w]; if (!r || !r.b) return; if (r.b >= 5) m++; else l++; if (now - (r.fs || 0) < 7 * DAY) wk++; });
  return { m: m, l: l, n: WORDS.length - m - l, wk: wk, p: pct(m, WORDS.length), seen: m + l };
}
function rateWord(w, g) {
  var r = VOC[w.w] || (VOC[w.w] = { b: 0, ok: 0, ko: 0, fs: Date.now() });
  if (g === 0) { r.b = 1; r.ko++; } else { r.b = Math.min(5, Math.max(1, (r.b || 0) + g)); r.ok++; }
  r.due = today0() + INT[r.b - 1] * DAY; r.ls = Date.now(); put('wc_voc', VOC); addXP(g ? 5 : 1);
}
var F = null;
function flashStart(list, src) { F = { list: list, i: 0, flip: false, src: src, ok: 0, again: 0, done: false }; }
function noWords() { return empty('🗂️', 'No words yet', 'Add vocabulary under 📚 Library → Words.') + '<div style="text-align:center"><button class="btn" data-act="libtab" data-v="words">Add words</button></div>'; }
function flashHtml() {
  if (!WORDS.length) return noWords();
  if (!F) {
    var due = vocDue().length, fresh = WORDS.filter(function (w) { return !VOC[w.w]; }), vs = vocStats(), weak = WORDS.filter(function (w) { return VOC[w.w] && VOC[w.w].b === 1; });
    return '<div class="stats">' + stat('Mastered', vs.m + '/' + WORDS.length) + stat('Learning', vs.l) + stat('New', vs.n) + stat('Learned this week', vs.wk) + '</div>' +
      '<div class="card"><b>Spaced-repetition flashcards</b><p class="mu" style="margin:4px 0 12px">Rate each card: Again (back tomorrow), Good, or Easy. Words return after 1 → 3 → 7 → 14 → 30 days.</p><div class="row">' +
      '<button class="btn" data-act="fdue" ' + (due ? '' : 'disabled style="opacity:.4"') + '>🔁 Due today (' + due + ')</button><button class="btn" data-act="fnew" ' + (fresh.length ? '' : 'disabled style="opacity:.4"') + '>🆕 10 new words</button>' +
      '<button class="btn g" data-act="fwotd">🌟 Today\'s 10</button><button class="btn g" data-act="fweak" ' + (weak.length ? '' : 'disabled style="opacity:.4"') + '>😕 Weak words (' + weak.length + ')</button></div></div>';
  }
  if (F.done || F.i >= F.list.length) {
    var msg = F.src === 'wotd' ? markDaily('w') : '';
    return '<div class="card res"><div class="big">🎉</div><h3>Session complete</h3><div class="rp"><span style="color:#10b981">👍 ' + F.ok + '</span><span style="color:#ef4444">😕 ' + F.again + '</span></div><p class="mu">' + F.list.length + ' card(s) reviewed.' + (msg ? ' ' + msg : '') + '</p>' +
      '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-act="fend">Done</button></div></div>';
  }
  var w = WORDS[F.list[F.i]], r = VOC[w.w];
  return '<div class="top"><span class="mu">Card ' + (F.i + 1) + ' / ' + F.list.length + '</span><button class="btn g s" data-act="fend">✕ End</button></div><div class="bar"><i style="width:' + (F.i / F.list.length * 100) + '%"></i></div>' +
    '<div class="card fcard" data-act="flip"><div class="row" style="justify-content:center"><span class="w">' + esc(w.w) + '</span><button class="spk" data-act="speak" data-v="' + esc(w.w) + '" aria-label="Pronounce">🔊</button></div><span class="pos">' + esc(w.pos) + (r ? ' · box ' + r.b : ' · new') + '</span>' +
    (F.flip ? '<div style="font-size:1.1rem;font-weight:700;margin-top:6px">' + esc(w.m) + '</div><div class="mu">“' + esc(w.ex) + '”</div><div class="mu">🟰 ' + esc(w.syn) + ' · ↔️ ' + esc(w.ant) + '</div><div class="mn">💡 ' + esc(w.mn) + '</div>' : '<p class="mu" style="margin-top:12px">Tap to reveal the meaning</p>') + '</div>' +
    (F.flip ? '<div class="rate"><button class="btn g" data-act="frate" data-v="0">😕 Again</button><button class="btn" data-act="frate" data-v="1">🙂 Good</button><button class="btn" data-act="frate" data-v="2" style="grid-column:span 2">😎 Easy</button></div>' : '');
}
function wotdHtml() {
  if (!WORDS.length) return noWords();
  var l = wotd(), pr = PAIRS.length ? PAIRS[dayIdx() % PAIRS.length] : null;
  return '<div class="card quote"><b>🌟 Word of the Day set — ' + l.length + ' words</b><p class="mu">Learn these today, then run the flashcards to lock them in.</p></div>' +
    '<div class="card">' + l.map(function (w) { return '<div class="wl"><span><b>' + esc(w.w) + '</b> <span class="mu">(' + esc(w.pos) + ')</span><small>' + esc(w.m) + ' — “' + esc(w.ex) + '”</small><small>🟰 ' + esc(w.syn) + ' · ↔️ ' + esc(w.ant) + '</small></span><button class="spk" data-act="speak" data-v="' + esc(w.w) + '" aria-label="Pronounce">🔊</button></div>'; }).join('') + '</div>' +
    '<button class="btn" data-act="fwotd" style="width:100%;margin-bottom:12px">🗂️ Practise these 10 as flashcards</button>' + (pr ? '<h2>Confusing pair of the day</h2>' + pairHtml(pr) : '');
}
function pairHtml(p) {
  return '<div class="card"><div class="pairbox"><div><b>' + esc(p[0]) + ' <button class="spk" data-act="speak" data-v="' + esc(p[0]) + '" style="width:26px;height:26px;font-size:.8rem">🔊</button></b><span class="mu">' + esc(p[1]) + '</span><br>“' + esc(p[2]) + '”</div><div><b>' + esc(p[3]) + ' <button class="spk" data-act="speak" data-v="' + esc(p[3]) + '" style="width:26px;height:26px;font-size:.8rem">🔊</button></b><span class="mu">' + esc(p[4]) + '</span><br>“' + esc(p[5]) + '”</div></div></div>';
}

/* ---------- rule cards ---------- */
function ruleCard(r, practise) {
  var g = ruleAgg()[r.id], n = BANK.filter(function (q) { return q.r === r.id; }).length;
  return '<div class="card rulecard"><div class="line" style="padding:0"><b>' + (ICON[r.t] || '') + ' ' + esc(r.n) + '</b>' + (g && g.t ? '<b style="color:' + tone(pct(g.c, g.t)) + '">' + pct(g.c, g.t) + '%</b>' : '') + '</div>' +
    '<span class="tag">' + esc(r.t) + '</span><p style="margin-top:8px;line-height:1.55">' + r.d + '</p>' + r.ex.map(function (e) { return '<div class="ex">' + e + '</div>'; }).join('') + '<div class="tip">💡 ' + r.tip + '</div>' +
    (practise && n ? '<button class="btn g s" style="margin-top:10px" data-act="prule" data-v="' + r.id + '">Practise this rule (' + n + ')</button>' : '') + '</div>';
}
function rulesHtml() {
  var f = S.ruleF, list = (window.RULEBOOK || []).filter(function (r) { return f === 'all' || GRP[r.t] === f; });
  return '<div class="chips sm">' + [['all', 'All']].concat(GROUPS.map(function (g) { return [g.n, g.i + ' ' + g.n]; })).map(function (x) { return '<button class="chip ' + (f === x[0] ? 'on' : '') + '" data-act="rulef" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<p class="mu" style="margin-bottom:10px">30-second mini-lessons. Rules you miss most are linked from every wrong answer.</p>' + list.map(function (r) { return ruleCard(r, true); }).join('');
}
function ruleModal(id) {
  var r = RB[id]; if (!r) return;
  $('#tour').innerHTML = '<div class="ovc" style="text-align:left;max-height:86vh;overflow:auto">' + ruleCard(r, false) + '<div class="row" style="justify-content:center;margin-top:10px"><button class="btn" data-act="modalclose">Got it</button></div></div>';
  $('#tour').classList.add('show');
}

/* ---------- RC reader ---------- */
function rcHtml() {
  var ids = Object.keys(PASS), wpm = RCW.slice(-10), avg = wpm.length ? Math.round(wpm.reduce(function (s, x) { return s + x.wpm; }, 0) / wpm.length) : 0;
  if (!ids.length) return empty('📖', 'No passages yet', 'Add a passage with questions under 📚 Library → Passages.') + '<div style="text-align:center"><button class="btn" data-act="libtab" data-v="pass">Add a passage</button></div>';
  return '<div class="stats">' + stat('Avg reading speed', avg ? avg + ' wpm' : '–') + stat('Passages read', RCW.length) + '</div>' +
    '<div class="card"><b>⚡ RC tools</b><p class="mu" style="margin-top:4px">Every passage has a highlighter, a per-passage timer and a reading-speed tracker (tap “Done reading” when you finish the text). Good exam speed is 200–250 wpm with understanding.</p></div>' +
    ids.map(function (id) { var p = PASS[id], n = p.n; return '<div class="card"><div class="line" style="padding:0"><span><b>' + esc(p.title) + '</b><small>' + esc(p.topic) + ' · ' + p.words + ' words · ' + n + ' questions</small></span><button class="btn s" data-act="rcgo" data-v="' + id + '">Read &amp; answer</button></div></div>'; }).join('');
}
function dailyHtml() {
  var id = dailyPassageId(), p = id ? PASS[id] : null;
  return routineCard(true) + (p ? '<div class="card"><span class="mu">Today\'s passage</span><br><b>' + esc(p.title) + '</b> <span class="mu">· ' + p.words + ' words</span></div>' : '') +
    '<p class="mu">Finish all three tasks every day to keep your streak, earn +10 XP per task and a +50 XP bonus.</p>';
}
function learn(tab) {
  if (S.view === 'test') return;
  if (tab) S.ltab = tab; S.view = 'learn'; fabs(false); closeTools(); clearInterval(S.t);
  var tabs = [['daily', '📅 Daily'], ['rules', '📘 Rules'], ['flash', '🗂️ Flashcards'], ['wotd', '🌟 Word of Day'], ['pairs', '👯 Pairs'], ['rc', '📖 RC reader']];
  var body = ({ daily: dailyHtml, rules: rulesHtml, flash: flashHtml, wotd: wotdHtml, rc: rcHtml,
    pairs: function () { return PAIRS.length ? '<p class="mu" style="margin-bottom:10px">Look-alike words that trip up even good writers.</p>' + PAIRS.map(pairHtml).join('') : empty('👯', 'No pairs yet', 'Add them under 📚 Library → Words → Confusing pairs.'); } })[S.ltab]();
  render('<div class="top"><button class="btn g s" data-act="home">← Home</button><b>Learn</b><span class="pill">⭐ ' + XP + ' XP</span></div><div class="tabs2">' +
    tabs.map(function (t) { return '<button class="chip ' + (S.ltab === t[0] ? 'on' : '') + '" data-act="ltab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' + body, S.keepL);
  S.keepL = false;
}

/* ---------- reused widgets: heatmap, stat tiles, rows, time + confidence blocks ---------- */
function heat() {
  var W = 17, cell = 14, gap = 3, today = new Date(); today.setHours(0, 0, 0, 0);
  var start = new Date(today); start.setDate(today.getDate() - ((W - 1) * 7 + today.getDay()));
  var op = [0, .3, .55, .8, 1], mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], lastM = -1, act = 0;
  var s = '<svg viewBox="0 0 ' + (W * (cell + gap)) + ' ' + (7 * (cell + gap) + 14) + '" style="width:100%;height:auto" role="img" aria-label="Daily practice heatmap">';
  for (var w = 0; w < W; w++) for (var d = 0; d < 7; d++) {
    var dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d); if (dt > today) continue;
    var rec = DAYM[dkey(dt)], q = rec ? rec.q : 0, lv = !q ? 0 : q < 10 ? 1 : q < 25 ? 2 : q < 50 ? 3 : 4;
    if (q) act++;
    if (d === 0 && dt.getMonth() !== lastM) { lastM = dt.getMonth(); s += '<text x="' + (w * (cell + gap)) + '" y="9" font-size="8.5" style="fill:var(--mu)">' + mn[lastM] + '</text>'; }
    s += '<rect x="' + (w * (cell + gap)) + '" y="' + (14 + d * (cell + gap)) + '" width="' + cell + '" height="' + cell + '" rx="3" style="fill:' + (lv ? 'var(--a)' : 'var(--bd)') + '" fill-opacity="' + (lv ? op[lv] : 1) + '"><title>' + dkey(dt) + ': ' + q + ' question(s)</title></rect>';
  }
  return s + '</svg><div class="legend"><span style="margin-right:auto">' + act + ' active day' + (act === 1 ? '' : 's') + ' in the last ' + W + ' weeks</span>Less ' + op.map(function (o, i) { return '<i style="' + (i ? 'opacity:' + o : 'background:var(--bd)') + '"></i>'; }).join('') + ' More</div>';
}

/* ---------- analytics sheet ---------- */
function stat(l, v) { return '<div class="stat"><span class="mu">' + l + '</span><b>' + v + '</b></div>'; }
function empty(i, t, d) { return '<div class="empty"><b>' + i + '</b><div style="color:var(--tx);font-weight:700">' + t + '</div><div>' + d + '</div></div>'; }
function trow(k, v, btn) {
  var p = pct(v.c, v.t);
  return '<div class="card"><div class="line" style="padding:0"><b>' + (ICON[k] || '') + ' ' + esc(k) + '</b><b style="color:' + tone(p) + '">' + p + '% · ' + lab(p) + '</b></div>' +
    '<div class="line" style="padding:4px 0 0"><span class="mu">' + v.c + '/' + v.t + ' correct · ' + v.w + ' wrong · ' + v.n + ' skipped</span>' +
    (btn ? '<button class="btn g s" data-act="ptopic" data-v="' + esc(k) + '">Practise</button>' : '') + '</div>' + bar(p) + '</div>';
}
function aggConf() {
  var s = {};
  ATT.forEach(function (a) { Object.keys(a.conf || {}).forEach(function (k) { var v = a.conf[k], x = s[k] || (s[k] = { c: 0, w: 0, n: 0 }); x.c += v.c; x.w += v.w; x.n += v.n; }); });
  return s;
}
function nums(list, col, max) {
  if (!list.length) return '<span class="mu">None 🎉</span>';
  return '<div class="cnum">' + list.slice(0, max || 15).map(function (n) { return '<span style="background:' + col + '">' + n + '</span>'; }).join('') + (list.length > (max || 15) ? '<span class="mu" style="background:none;color:var(--mu)">+' + (list.length - (max || 15)) + ' more</span>' : '') + '</div>';
}
/* time-per-question insights: slow/fast × right/wrong */
function timeBlock(a) {
  var n = a.det.length, avg = a.det.reduce(function (s, d) { return s + d.t; }, 0) / n || 1;
  var ids = function (fn) { return a.det.map(function (d, i) { return fn(d) ? i + 1 : 0; }).filter(Boolean); };
  var sw_ = ids(function (d) { return d.r === 'w' && d.t >= 1.5 * avg; }), fw = ids(function (d) { return d.r === 'w' && d.t <= .5 * avg; }), sr = ids(function (d) { return d.r === 'c' && d.t >= 1.5 * avg; });
  var tm = {}; a.det.forEach(function (d) { var x = tm[d.s] || (tm[d.s] = { t: 0, n: 0 }); x.t += d.t; x.n++; });
  var ks = Object.keys(tm).sort(function (x, y) { return ti(x) - ti(y); }), mx = Math.max.apply(null, ks.map(function (k) { return tm[k].t / tm[k].n; })) || 1;
  return '<div class="sec">Time per question</div><div class="card"><p class="mu">Average: <b style="color:var(--tx)">' + avg.toFixed(0) + 's</b> per question' + (a.total ? ' · exam pace target ' + Math.round(a.total / n) + 's' : '') + '</p>' +
    '<div class="line" style="padding-bottom:0"><b>🐢 Slow &amp; wrong</b></div><span class="mu">Took 1.5× the average and still missed — likely concept gaps.</span>' + nums(sw_, '#ef4444') +
    '<div class="line" style="padding-bottom:0"><b>⚡ Fast &amp; wrong</b></div><span class="mu">Under half the average — rushed or guessed.</span>' + nums(fw, '#f59e0b') +
    '<div class="line" style="padding-bottom:0"><b>🐌 Slow but right</b></div><span class="mu">Correct, but costly — practise for speed.</span>' + nums(sr, '#3b82f6') + '</div>' +
    '<div class="card"><b>Average time by topic</b>' + ks.map(function (k) { var v = tm[k].t / tm[k].n; return '<div class="line" style="padding:6px 0 0"><span>' + (ICON[k] || '') + ' ' + esc(CODE[k]) + '</span><b>' + v.toFixed(0) + 's</b></div><div class="bar" style="margin:4px 0 2px"><i style="width:' + Math.round(v / mx * 100) + '%"></i></div>'; }).join('') + '</div>';
}
/* confidence flags vs correctness */
function confBlock(cf) {
  var keys = ['s', 'g', 'c', 'u'].filter(function (k) { return cf[k]; });
  if (!keys.length) return '';
  var tot = function (k) { return cf[k] ? cf[k].c + cf[k].w + cf[k].n : 0; };
  if (keys.length === 1 && keys[0] === 'u') return '<div class="sec">Confidence check</div><div class="card"><p class="mu">Tap 🟢 Sure / 🟡 Guess / 🔴 Confused while answering and this section will show how well your confidence matches your results.</p></div>';
  var h = '<div class="sec">Confidence check</div><div class="card"><div class="mtx"><b></b><b>Right</b><b>Wrong</b><b>Skipped</b>' + keys.map(function (k) { var v = cf[k]; return '<span class="l">' + FL[k] + '</span><span style="color:#10b981">' + v.c + '</span><span style="color:#ef4444">' + v.w + '</span><span>' + v.n + '</span>'; }).join('') + '</div>';
  if (cf.s && cf.s.w) h += '<p style="margin-top:10px">⚠️ <b>' + cf.s.w + '</b> "Sure" answer(s) were wrong — overconfidence. Revise those concepts first.</p>';
  if (cf.g && cf.g.c) h += '<p style="margin-top:8px">🍀 <b>' + cf.g.c + '</b> right guess(es) — lucky, not learned. Re-check them.</p>';
  if (cf.s && tot('s') && !cf.s.w) h += '<p style="margin-top:8px">✅ Your "Sure" answers were all correct — great calibration.</p>';
  return h + '</div>';
}
function spark() {
  var p = ATT.slice(-12).map(function (a) { return Math.max(0, Math.min(100, a.sc / a.max * 100)); });
  if (p.length < 2) return '<p class="mu">Take 2+ tests to see your trend.</p>';
  return '<svg viewBox="0 0 200 50" preserveAspectRatio="none" style="width:100%;height:70px"><polyline points="' + p.map(function (v, i) { return (i * 200 / (p.length - 1)).toFixed(1) + ',' + (48 - v * .46).toFixed(1); }).join(' ') + '" fill="none" style="stroke:var(--a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
}

/* ---------- charts ---------- */
function radarN(items, aria) {
  var N = items.length, cx = 170, cy = 160, r = 96, f1 = function (n) { return n.toFixed(1); };
  var pt = function (i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / N; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
  var s = '<svg viewBox="0 0 340 320" style="width:100%;height:auto" role="img" aria-label="' + esc(aria) + '">';
  [.25, .5, .75, 1].forEach(function (l) { s += '<polygon points="' + items.map(function (_, i) { return pt(i, l).map(f1).join(','); }).join(' ') + '" fill="none" stroke="var(--bd)" stroke-width="1"/>'; });
  items.forEach(function (it, i) {
    var e = pt(i, 1), l = pt(i, 1.17), c = Math.cos(-Math.PI / 2 + 2 * Math.PI * i / N), has = it.v !== null;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(e[0]) + '" y2="' + f1(e[1]) + '" stroke="var(--bd)"/><text x="' + f1(l[0]) + '" y="' + f1(l[1] + 3) + '" text-anchor="' + (c > .3 ? 'start' : c < -.3 ? 'end' : 'middle') + '" font-size="' + (N > 8 ? 8 : 10) + '" font-weight="700" style="fill:var(--mu)" opacity="' + (has ? 1 : .4) + '">' + esc(it.label) + '</text>';
  });
  var vals = items.map(function (it, i) { return pt(i, it.v === null ? 0 : it.v); });
  s += '<polygon points="' + vals.map(function (p) { return p.map(f1).join(','); }).join(' ') + '" style="fill:var(--a);stroke:var(--a)" fill-opacity=".28" stroke-width="2" stroke-linejoin="round"/>';
  vals.forEach(function (p, i) { if (items[i].v !== null) s += '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="3" fill="' + tone(items[i].v * 100) + '"/>'; });
  return s + '</svg>';
}
function groupRadar(map) {
  var g = aggGroup(map);
  return radarN(GROUPS.map(function (x) { return { label: x.i + ' ' + x.n, v: g[x.n].t ? g[x.n].c / g[x.n].t : null }; }), 'Radar chart of Grammar, Vocabulary and Reading');
}
function topicRadar(map, grp) {
  var G = GROUPS.filter(function (x) { return x.n === grp; })[0];
  return radarN(G.topics.map(function (t) { var m = map[t.n]; return { label: t.k, v: m && m.t ? m.c / m.t : null }; }), 'Radar chart of ' + grp + ' topics') +
    '<div class="codes">' + G.topics.map(function (t) { return '<span><b>' + esc(t.k) + '</b> ' + esc(t.n) + '</span>'; }).join('') + '</div>';
}
function radarBlock(map) {
  var g = aggGroup(map), withData = GROUPS.filter(function (x) { return g[x.n].t; }), cur = S.rg && g[S.rg] ? S.rg : (withData[0] || GROUPS[0]).n; S.rg = cur;
  return '<div class="sec">Strength radar · 3 groups</div><div class="card">' + groupRadar(map) + '</div>' +
    '<div class="sec">Drill-down · topics</div><div class="gtabs">' + GROUPS.map(function (x) { return '<button class="chip ' + (cur === x.n ? 'on' : '') + '" data-act="rg" data-v="' + x.n + '">' + x.i + ' ' + x.n + '</button>'; }).join('') + '</div><div class="card">' + topicRadar(map, cur) + '</div>';
}
function bars(map, list, nameFn) {
  var rh = 20, s = '<svg viewBox="0 0 340 ' + (list.length * rh + 6) + '" style="width:100%;height:auto" role="img" aria-label="Accuracy bars">';
  list.forEach(function (t, i) {
    var y = i * rh + 3, has = map[t] && map[t].t, p = has ? pct(map[t].c, map[t].t) : 0;
    s += '<text x="0" y="' + (y + 11) + '" font-size="9.5" style="fill:var(--tx)" opacity="' + (has ? 1 : .45) + '">' + esc(nameFn ? nameFn(t) : t) + '</text><rect x="150" y="' + (y + 2) + '" width="150" height="10" rx="5" style="fill:var(--bd)"/>' +
      (has ? '<rect x="150" y="' + (y + 2) + '" width="' + Math.max(4, p * 1.5) + '" height="10" rx="5" fill="' + tone(p) + '"/>' : '') +
      '<text x="340" y="' + (y + 11) + '" text-anchor="end" font-size="9.5" font-weight="700" style="fill:var(--mu)">' + (has ? p + '%' : '–') + '</text>';
  });
  return s + '</svg>';
}
function mtBlock(m) {
  var tot = m ? m.concept + m.careless + m.time : 0;
  if (!tot) return '<div class="sec">Mistake types</div><div class="card"><p class="mu">No mistakes recorded yet — great, or take a test to see this analysis.</p></div>';
  var adv = { concept: 'Concept gaps: re-read the rule card, then redo those questions.', careless: 'Careless slips: you knew it but rushed. Re-read options before locking in.', time: 'Time pressure: practise sectional mocks and skip-and-return.' };
  var top = Object.keys(MT).sort(function (a, b) { return m[b] - m[a]; })[0];
  return '<div class="sec">Mistake types</div><div class="card">' + Object.keys(MT).map(function (k) { var p = pct(m[k], tot); return '<div class="line" style="padding:4px 0 0"><span>' + MT[k][0] + '</span><b>' + m[k] + ' · ' + p + '%</b></div><div class="bar" style="margin:4px 0 6px"><i style="width:' + p + '%;background:' + MT[k][1] + '"></i></div>'; }).join('') +
    '<p style="margin-top:8px">👉 ' + adv[top] + '</p></div>';
}
function aggMT() { var m = { concept: 0, careless: 0, time: 0 }; ATT.forEach(function (a) { if (a.mt) Object.keys(m).forEach(function (k) { m[k] += a.mt[k] || 0; }); }); return m; }
function ruleRows(g, grp, btns) {
  var ks = weakFirst(g).filter(function (k) { return RB[k] && GRP[RB[k].t] === grp; });
  if (!ks.length) return '<p class="mu">No data yet for this section.</p>';
  return ks.map(function (k) { var v = g[k], p = pct(v.c, v.t);
    return '<div class="card"><div class="line" style="padding:0"><b>' + esc(RB[k].n) + '</b><b style="color:' + tone(p) + '">' + p + '% · ' + lab(p) + '</b></div><span class="tag">' + esc(RB[k].t) + '</span> <span class="mu">' + v.c + '/' + v.t + ' correct · ' + v.w + ' wrong</span>' + bar(p) +
      (btns ? '<div class="row"><button class="btn g s" data-act="rulepop" data-v="' + k + '">📘 Rule</button><button class="btn g s" data-act="prule" data-v="' + k + '">Practise</button></div>' : '') + '</div>'; }).join('');
}

/* ---------- analytics sheet ---------- */
function insights(g) {
  var gg = aggGroup(g), ks = GROUPS.filter(function (x) { return gg[x.n].t >= 3; }); if (!ks.length) return '';
  ks.sort(function (a, b) { return pct(gg[b.n].c, gg[b.n].t) - pct(gg[a.n].c, gg[a.n].t); });
  var best = ks[0], worst = ks[ks.length - 1], m = aggMT(), mk = Object.keys(MT).sort(function (a, b) { return m[b] - m[a]; })[0], vs = vocStats(), c = coachInfo();
  var h = '<div class="sec">Overall analysis</div><div class="card"><p>💪 Strongest: <b>' + best.i + ' ' + best.n + ' (' + pct(gg[best.n].c, gg[best.n].t) + '%)</b></p>' +
    (ks.length > 1 ? '<p style="margin-top:6px">🎯 Needs work: <b>' + worst.i + ' ' + worst.n + ' (' + pct(gg[worst.n].c, gg[worst.n].t) + '%)</b></p>' : '') +
    (m[mk] ? '<p style="margin-top:6px">🔎 Most common loss: <b>' + MT[mk][0] + '</b></p>' : '') +
    (c ? '<p style="margin-top:6px">📘 Weakest rule: <b>' + esc(RB[c.k].n) + ' (' + c.p + '%)</b></p>' : '') +
    '<p style="margin-top:6px">🗂️ Vocabulary mastery: <b>' + vs.p + '%</b> · ' + vs.wk + ' new word(s) this week</p></div>';
  return h;
}
function tLast() {
  var a = ATT[ATT.length - 1]; if (!a) return empty('📊', 'No test yet', 'Finish a test and its full analysis shows up here.');
  var c = 0, w = 0; Object.keys(a.secs).forEach(function (k) { c += a.secs[k].c; w += a.secs[k].w; });
  return '<p class="mu" style="margin-bottom:10px">' + esc(a.src) + ' · ' + new Date(a.ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</p>' +
    '<div class="stats">' + stat('Score', a.sc.toFixed(2) + ' / ' + a.max) + stat('Accuracy', pct(c, c + w) + '%') + stat('Attempted', (c + w) + ' / ' + a.max) + stat('Negative marks', '−' + (w * (a.neg || 0)).toFixed(2)) + stat('Avg time / Q', Math.round(a.used / a.max) + 's') + stat('Time taken', fmt(a.used)) + ((a.fsx || a.tabx) ? stat('Focus lapses', '⚠️ ' + ((a.fsx || 0) + (a.tabx || 0))) : '') + '</div>' +
    (a.full ? '<button class="btn" data-act="exportq" style="width:100%;margin-bottom:12px">⬇ Export attempted questions + my answers (CSV)</button>' : '') +
    radarBlock(a.secs) + '<div class="sec">Question map</div><div class="strip">' + a.det.map(function (d, i) { return '<span style="background:' + (d.r === 'c' ? '#10b981' : d.r === 'w' ? '#ef4444' : '#6b7280') + '">' + (i + 1) + '</span>'; }).join('') + '</div>' +
    mtBlock(a.mt) + (a.rl && Object.keys(a.rl).length ? '<div class="sec">Rules in this test</div>' + Object.keys(a.rl).filter(function (k) { return RB[k]; }).sort(function (x, y) { return pct(a.rl[x].c, a.rl[x].t) - pct(a.rl[y].c, a.rl[y].t); }).map(function (k) { var v = a.rl[k]; return '<div class="line" style="padding:4px 0"><span>' + esc(RB[k].n) + '</span><b style="color:' + tone(pct(v.c, v.t)) + '">' + v.c + '/' + v.t + '</b></div>'; }).join('') : '') +
    timeBlock(a) + confBlock(a.conf || {});
}
function tAll() {
  var g = agg(), c = 0, w = 0, t = 0, best = 0, sum = 0, s = streak(), lv = level();
  Object.keys(g).forEach(function (k) { c += g[k].c; w += g[k].w; });
  ATT.forEach(function (a) { var p = a.sc / a.max * 100; sum += p; if (p > best) best = p; t += a.used; });
  var h = '<div class="stats">' + stat('Level', '⭐ ' + lv.l) + stat('XP', XP) + stat('Tests taken', ATT.length) + stat('Avg score', ATT.length ? Math.round(sum / ATT.length) + '%' : '–') + stat('Best score', ATT.length ? Math.round(best) + '%' : '–') + stat('Accuracy', ATT.length ? pct(c, c + w) + '%' : '–') +
    stat('Study streak', '🔥 ' + s + ' day' + (s === 1 ? '' : 's')) + stat('Best streak', '🏆 ' + bestStreak()) + stat('This week', weekQs() + ' / ' + SET.weekGoal) + stat('Vocab mastery', vocStats().p + '%') + '</div>' +
    '<div class="sec">Daily practice calendar</div><div class="card">' + heat() + '</div>';
  if (!ATT.length) return h + empty('📈', 'No test data yet', 'Radar, bar charts and the overall analysis appear after your first test.');
  var weak = weakFirst(g).slice(0, 3);
  return h + insights(g) + '<div class="card"><span class="mu">Score trend (last 12 tests)</span>' + spark() + '</div>' + radarBlock(g) +
    '<div class="sec">Accuracy by topic</div><div class="card">' + bars(g, TOPICS.filter(function (k) { return g[k]; }).sort(function (a, b) { return ti(a) - ti(b); })) + '</div>' + mtBlock(aggMT()) + confBlock(aggConf()) +
    '<div class="sec">Focus on these topics</div>' + weak.map(function (k) { return trow(k, g[k], true); }).join('') +
    '<div class="sec">Recent tests</div>' + ATT.slice(-5).reverse().map(function (a) { return '<div class="line"><span>' + esc(a.src) + '<small>' + new Date(a.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + '</small></span><b>' + a.sc.toFixed(1) + '/' + a.max + '</b></div>'; }).join('') +
    '<div class="mu" style="margin-top:6px">Total practice time: ' + Math.round(t / 60) + ' min</div>';
}
function tRules() {
  var g = ruleAgg(); if (!Object.keys(g).length) return empty('📘', 'No rule data yet', 'Take a grammar test and your accuracy will be broken down rule by rule — “you keep missing parallelism”.');
  var gr = Object.keys(g).filter(function (k) { return RB[k] && GRP[RB[k].t] === 'Grammar'; });
  return '<p class="mu" style="margin-bottom:10px">Weakest grammar rules first. Read the rule, then practise it.</p><div class="card">' + bars(g, weakFirst(g).filter(function (k) { return gr.indexOf(k) > -1; }).slice(0, 14), function (k) { var n = RB[k].n; return n.length > 27 ? n.slice(0, 26) + '…' : n; }) + '</div>' + ruleRows(g, 'Grammar', true);
}
function tVocab() {
  var vs = vocStats(), g = agg(), gg = GROUPS[1].topics.filter(function (t) { return g[t.n]; });
  var weak = WORDS.filter(function (w) { var r = VOC[w.w]; return r && r.ko >= r.ok && r.ko > 0; }).slice(0, 8);
  return '<div class="stats">' + stat('Mastery', vs.p + '%') + stat('Mastered words', vs.m + '/' + WORDS.length) + stat('Learning', vs.l) + stat('New this week', vs.wk) + '</div>' +
    '<div class="card"><b>Word boxes</b><div class="bar" style="height:12px"><i style="width:' + vs.p + '%;background:#10b981"></i></div><p class="mu">🟢 Mastered ' + vs.m + ' · 🟡 Learning ' + vs.l + ' · ⚪ New ' + vs.n + '</p><div class="row" style="margin-top:8px"><button class="btn s" data-act="fdue">🔁 Review due</button><button class="btn g s" data-act="fnew">🆕 New words</button></div></div>' +
    '<div class="sec">Vocabulary question accuracy</div>' + (gg.length ? '<div class="card">' + bars(g, gg.map(function (t) { return t.n; })) + '</div>' : '<p class="mu">Practise Synonyms, Antonyms, Idioms etc. to see accuracy here.</p>') +
    '<div class="sec">Words to revisit</div>' + (weak.length ? '<div class="card">' + weak.map(function (w) { return '<div class="wl"><span><b>' + esc(w.w) + '</b><small>' + esc(w.m) + '</small></span></div>'; }).join('') + '</div>' : '<p class="mu">No problem words yet — keep rating flashcards honestly.</p>');
}
function tRead() {
  var g = agg(), r = ruleAgg(), rt = GROUPS[2].topics.filter(function (t) { return g[t.n]; }), wpm = RCW.slice(-10), avg = wpm.length ? Math.round(wpm.reduce(function (s, x) { return s + x.wpm; }, 0) / wpm.length) : 0;
  return '<div class="stats">' + stat('Avg speed', avg ? avg + ' wpm' : '–') + stat('Passages timed', RCW.length) + '</div>' +
    (wpm.length > 1 ? '<div class="card"><span class="mu">Reading speed (last 10)</span><svg viewBox="0 0 200 50" preserveAspectRatio="none" style="width:100%;height:70px"><polyline points="' + wpm.map(function (x, i) { return (i * 200 / (wpm.length - 1)).toFixed(1) + ',' + (48 - Math.min(400, x.wpm) / 400 * 46).toFixed(1); }).join(' ') + '" fill="none" style="stroke:var(--a)" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></div>' : '') +
    '<div class="sec">By reading section</div>' + (rt.length ? '<div class="card">' + bars(g, rt.map(function (t) { return t.n; })) + '</div>' : '<p class="mu">Attempt passages, cloze or para jumbles to see this.</p>') +
    '<div class="sec">By question type (inference, main idea…)</div>' + ruleRows(r, 'Reading', true);
}
function savedList() {
  return Object.keys(SAV).map(function (k) { return SAV[k]; }).filter(function (e) { return S.sf === 'all' || (S.sf === 'b' && e.b) || (S.sf === 'w' && e.w) || (S.sf === 'd' && e.w && (e.due || 0) <= today0()); }).sort(function (a, b) { return (a.due || 0) - (b.due || 0); });
}
function tSav() {
  var all = Object.keys(SAV).length, l = savedList(), due = dueList().length;
  var h = '<div class="chips sm">' + [['all', 'All (' + all + ')'], ['d', '🔁 Due today (' + due + ')'], ['w', '❌ Wrong notebook'], ['b', '🔖 Bookmarked']].map(function (x) { return '<button class="chip ' + (S.sf === x[0] ? 'on' : '') + '" data-act="sfil" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><p class="mu" style="margin-bottom:10px">Wrong answers return after 1 → 3 → 7 → 14 days. Get one right at the end and it\'s mastered.</p>';
  if (!l.length) return h + empty('🔖', 'Nothing here', S.sf === 'd' ? 'No revision due today. 🎉' : 'Tap 🔖 Save during a test. Wrong answers are saved automatically.');
  return h + '<button class="btn" data-act="practice" style="width:100%;margin-bottom:12px">▶ Practise these (' + l.length + ')</button>' + l.map(function (e) {
    return '<div class="card"><div class="line" style="padding:0 0 6px"><span><span class="tag">' + esc(e.s) + (e.r && RB[e.r] ? ' · ' + esc(RB[e.r].n) : '') + '</span> ' + (e.w ? '<span class="tag" style="color:#ef4444">wrong · box ' + (e.box || 1) + ' · ' + dueText(e) + '</span>' : '') + '</span><button class="btn g s" data-act="delsav" data-v="' + esc(e.k) + '">🗑</button></div><b class="qt">' + e.q + '</b><div class="opt ok" style="margin-top:10px">✅ ' + 'ABCDE'.charAt(e.a) + '. ' + e.o[e.a] + '</div>' + (e.e ? '<div class="expl">💡 ' + e.e + '</div>' : '') + '</div>'; }).join('');
}

/* ---------- rough pad, calculator, tools panel (unchanged from the WBCS app) ---------- */
/* ---------- rough pad ---------- */
var PAD = { strokes: [], col: 'auto', erase: false, cur: null, cv: null, cx: null };
function inkColor(c) { return c === 'auto' ? getComputedStyle(root).getPropertyValue('--tx').trim() || '#fff' : c; }
function strokeSeg(s, pts) {
  var c = PAD.cx; c.save(); c.globalCompositeOperation = s.e ? 'destination-out' : 'source-over';
  c.strokeStyle = inkColor(s.c); c.lineWidth = s.e ? 18 : 2.6; c.lineCap = c.lineJoin = 'round'; c.beginPath();
  pts.forEach(function (p, i) { i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); });
  if (pts.length === 1) c.lineTo(pts[0][0] + .1, pts[0][1]); c.stroke(); c.restore();
}
function padDraw() { PAD.cx.clearRect(0, 0, PAD.cv.width, PAD.cv.height); PAD.strokes.forEach(function (s) { strokeSeg(s, s.p); }); }
function padResize() {
  var r = PAD.cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; if (!r.width) return;
  PAD.cv.width = Math.round(r.width * d); PAD.cv.height = Math.round(r.height * d); PAD.cx.setTransform(d, 0, 0, d, 0, 0); padDraw();
}
function padUI() {
  document.querySelectorAll('[data-pc]').forEach(function (b) { b.classList.toggle('on', !PAD.erase && b.dataset.pc === PAD.col); });
  $('#bErase').classList.toggle('on', PAD.erase);
}
function padInit() {
  PAD.cv = $('#pad'); PAD.cx = PAD.cv.getContext('2d');
  var pt = function (e) { var r = PAD.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  PAD.cv.addEventListener('pointerdown', function (e) {
    e.preventDefault(); try { PAD.cv.setPointerCapture(e.pointerId); } catch (x) {}
    PAD.cur = { c: PAD.col, e: PAD.erase, p: [pt(e)] }; PAD.strokes.push(PAD.cur); strokeSeg(PAD.cur, PAD.cur.p);
  });
  PAD.cv.addEventListener('pointermove', function (e) {
    if (!PAD.cur) return; var p = pt(e), l = PAD.cur.p[PAD.cur.p.length - 1]; PAD.cur.p.push(p); strokeSeg(PAD.cur, [l, p]);
  });
  var up = function () { PAD.cur = null; };
  PAD.cv.addEventListener('pointerup', up); PAD.cv.addEventListener('pointercancel', up);
  window.addEventListener('resize', function () { if (toolsOpen()) padResize(); });
}

/* ---------- calculator ---------- */
function calcNew() { return { cur: '0', acc: null, op: null, fresh: true }; }
var CALC = calcNew(), SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
function fmtn(n) { if (!isFinite(n)) return 'Error'; var s = String(parseFloat(n.toPrecision(12))); return s.length > 14 ? n.toExponential(6) : s; }
function calcEval() {
  var a = CALC.acc, b = parseFloat(CALC.cur), r = 0;
  if (CALC.op === '+') r = a + b; else if (CALC.op === '-') r = a - b; else if (CALC.op === '*') r = a * b; else r = b === 0 ? NaN : a / b;
  CALC.cur = fmtn(r); CALC.acc = isFinite(r) ? r : null;
}
function calcUI() { $('#cval').textContent = CALC.cur; $('#cexp').textContent = (CALC.op && CALC.acc !== null) ? fmtn(CALC.acc) + ' ' + SYM[CALC.op] : ''; }
function calcPress(k) {
  var C = CALC;
  if (C.cur === 'Error' && k !== 'C') return;
  if (/^[0-9]$/.test(k)) { if (C.fresh) { C.cur = k; C.fresh = false; } else if (C.cur.replace(/[-.]/g, '').length < 14) C.cur = C.cur === '0' ? k : C.cur + k; }
  else if (k === '.') { if (C.fresh) { C.cur = '0.'; C.fresh = false; } else if (C.cur.indexOf('.') < 0) C.cur += '.'; }
  else if ('+-*/'.indexOf(k) > -1) { if (C.op && !C.fresh) calcEval(); else C.acc = parseFloat(C.cur); if (CALC.cur !== 'Error') { CALC.op = k; CALC.fresh = true; } }
  else if (k === '=') { if (C.op) { calcEval(); C.op = null; C.fresh = true; } }
  else if (k === 'C') CALC = calcNew();
  else if (k === 'B') { if (!C.fresh && C.cur.length > 1) C.cur = C.cur.slice(0, -1); else { C.cur = '0'; C.fresh = true; } }
  else if (k === '%') { C.cur = fmtn(parseFloat(C.cur) / 100); C.fresh = true; }
  else if (k === 'R') { var n = parseFloat(C.cur); C.cur = n < 0 ? 'Error' : fmtn(Math.sqrt(n)); C.fresh = true; }
  calcUI();
}
function calcInit() {
  var keys = [['C', 'C', 'op'], ['B', '⌫', 'op'], ['%', '%', 'op'], ['/', '÷', 'op'], ['7'], ['8'], ['9'], ['*', '×', 'op'], ['4'], ['5'], ['6'], ['-', '−', 'op'], ['1'], ['2'], ['3'], ['+', '+', 'op'], ['0'], ['.'], ['R', '√', 'op'], ['=', '=', 'eq']];
  $('#ckeys').innerHTML = keys.map(function (k) { return '<button class="' + (k[2] || '') + '" data-act="ck" data-v="' + k[0] + '">' + (k[1] || k[0]) + '</button>'; }).join(''); calcUI();
}

/* ---------- tools panel ---------- */
var toolsOpen = function () { return $('#tools').classList.contains('show'); };
function openTools(tab) {
  if (!SET.tools) return;
  $('#tools').classList.add('show'); toolTab(tab || 'pad');
}
function closeTools() { $('#tools').classList.remove('show'); }
function toolTab(t) {
  S.ttab = t; $('#padWrap').style.display = t === 'pad' ? 'flex' : 'none'; $('#calcWrap').style.display = t === 'calc' ? 'flex' : 'none';
  $('#tabPad').classList.toggle('on', t === 'pad'); $('#tabCalc').classList.toggle('on', t === 'calc');
  if (t === 'pad') { padResize(); padUI(); }
}

/* ---------- settings + sheet ---------- */
function setRow(l, d, c) { return '<div class="line"><span>' + l + (d ? '<small>' + d + '</small>' : '') + '</span>' + c + '</div>'; }
function tSet() {
  var kb = Math.round((JSON.stringify(ATT).length + JSON.stringify(SAV).length + JSON.stringify(VOC).length) / 1024 * 10) / 10;
  var cols = { violet: '#7b6cff', ocean: '#22b8cf', sunset: '#ff8a3d', forest: '#2fbf8f', rose: '#f0567a' };
  return '<div class="sec">Appearance</div><div class="card">' + setRow('Dark mode', '', sw(root.dataset.theme === 'dark', 'theme')) +
    '<div class="line"><span>Colour palette</span><span class="row">' + Object.keys(cols).map(function (k) { return '<button class="dot ' + (root.dataset.pal === k ? 'on' : '') + '" data-act="pick" data-v="' + k + '" style="background:' + cols[k] + '" aria-label="' + k + '"></button>'; }).join('') + '</span></div>' +
    '<div class="line"><span>Text size</span><span class="row">' + ['A−', 'A', 'A+'].map(function (l, i) { return '<button class="chip ' + (SET.font === i ? 'on' : '') + '" style="padding:6px 14px" data-act="font" data-v="' + i + '">' + l + '</button>'; }).join('') + '</span></div>' +
    setRow('Motion graphics', 'Turn off to save battery', sw(SET.motion, 'tg', 'motion')) + '</div>' +
    '<div class="sec">Learning</div><div class="card">' + setRow('Word pronunciation 🔊', 'Uses your device voice', sw(SET.speech, 'tg', 'speech')) + setRow('Weekly goal', 'Questions per week', '<input type="number" id="wg" min="10" max="1000" value="' + SET.weekGoal + '">') + '</div>' +
    '<div class="sec">Test experience</div><div class="card">' +
    setRow('Rough pad &amp; calculator', 'Buttons shown during tests', sw(SET.tools, 'tg', 'tools')) + setRow('Full-screen exam mode', 'Sectional mock only', sw(SET.fullscreen, 'tg', 'fullscreen')) +
    setRow('Show timer', 'Hide it to reduce pressure', sw(SET.showTimer, 'tg', 'showTimer')) + setRow('Auto-next on answer', 'Jump ahead after choosing', sw(SET.autoNext, 'tg', 'autoNext')) +
    setRow('Shuffle questions', 'Within each topic', sw(SET.shuffleQ, 'tg', 'shuffleQ')) + setRow('Shuffle options', 'Stops memorising positions', sw(SET.shuffleO, 'tg', 'shuffleO')) +
    setRow('Confirm before submit', '', sw(SET.confirmSubmit, 'tg', 'confirmSubmit')) + setRow('Auto-save wrong answers', 'Builds your revision notebook', sw(SET.autoWrong, 'tg', 'autoWrong')) +
    setRow('Haptic feedback', 'Light vibration on taps', sw(SET.haptic, 'tg', 'haptic')) + setRow('Keep screen awake', 'During tests', sw(SET.wake, 'tg', 'wake')) +
    setRow('Default topic-test time', 'Minutes', '<input type="number" id="dm" min="1" max="180" value="' + SET.defMins + '">') + setRow('Negative marking by default', 'For topic-wise tests', sw(SET.defNeg, 'tg', 'defNeg')) + '</div>' +
    '<div class="sec">Help</div><div class="card"><button class="btn g s" data-act="tour">▶ Replay the app tour</button></div>' +
    '<div class="sec">Data</div><div class="card"><p class="mu" style="margin-bottom:10px">Stored on this device: ' + ATT.length + ' tests · ' + Object.keys(SAV).length + ' saved questions · ' + Object.keys(VOC).length + ' words · ' + kb + ' KB</p>' +
    '<div class="row"><button class="btn g s" data-act="export">⬇ Backup</button><button class="btn g s" data-act="import">⬆ Restore</button><button class="btn g s" data-act="wipe" style="color:#ef4444">🗑 Clear data</button></div></div>' +
    '<p class="mu" style="text-align:center;margin-top:14px">Wise Choice · Your Shortcut through the Syllabus!</p>';
}
function sheet() {
  var tabs = [['last', '📊 Last test'], ['all', '📈 Overall'], ['rules', '📘 Grammar rules'], ['vocab', '🗂️ Vocabulary'], ['read', '📖 Reading'], ['sav', '🔖 Revision'], ['set', '⚙️ Settings']];
  $('#stabs').innerHTML = tabs.map(function (t) { return '<button class="chip ' + (S.tab === t[0] ? 'on' : '') + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('');
  var b = $('#sbody'), y = b.scrollTop; b.innerHTML = ({ last: tLast, all: tAll, rules: tRules, vocab: tVocab, read: tRead, sav: tSav, set: tSet })[S.tab](); b.scrollTop = y;
}
function openSheet(tab) { if (tab) S.tab = tab; sheet(); $('#sheet').classList.add('show'); $('#shade2').classList.add('show'); }
function closeSheet() { $('#sheet').classList.remove('show'); $('#shade2').classList.remove('show'); }
var sheetOpen = function () { return $('#sheet').classList.contains('show'); };

/* ---------- onboarding tour ---------- */
var TOUR = [
  { i: '👋', t: 'Welcome to Wise Choice English', d: 'Your own competitive-English practice app: <b>Grammar, Vocabulary and Reading Comprehension</b> — with tests, quizzes, rule cards and flashcards.' },
  { i: '📚', t: 'Build your own library', d: 'The app starts <b>empty</b>. Open <b>📚 My library</b> to add questions <b>one by one</b> or <b>in bulk</b> (text, CSV or JSON), each with an answer key and explanation. Add passages, words and confusing pairs too.' },
  { i: '💾', t: 'Save your library', d: 'Everything is stored on your device and works offline. Use <b>Export</b> to download your library as a dataset file — import it on any device.' },
  { i: '📅', t: 'Daily routine', d: 'Every day: <b>1 passage + 5 grammar questions + 10 words</b>. Finish all three to keep your streak and earn bonus XP.' },
  { i: '📘', t: 'Rule cards & flashcards', d: 'Wrong answers link to a <b>30-second rule card</b>. Vocabulary uses <b>spaced-repetition flashcards</b> with pronunciation 🔊.' },
  { i: '📊', t: 'Smart analytics', d: 'Open ⚙️ for the <b>radar chart</b>, accuracy by grammar rule, mistake types, vocabulary mastery and an overall analysis.' }
];
function tourShow(n) {
  var s = TOUR[n], last = n === TOUR.length - 1; S.tourN = n;
  $('#tour').innerHTML = '<div class="ovc"><div class="big">' + s.i + '</div><h2>' + s.t + '</h2><p class="mu" style="color:var(--tx)">' + s.d + '</p><div class="dots">' + TOUR.map(function (_, i) { return '<i class="' + (i === n ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
    '<div class="row" style="justify-content:center">' + (n ? '<button class="btn g" data-act="tourback">←</button>' : '<button class="btn g" data-act="tourend">Skip</button>') + '<button class="btn" data-act="' + (last ? 'tourend' : 'tournext') + '">' + (last ? 'Let\'s go 🚀' : 'Next →') + '</button></div></div>';
  $('#tour').classList.add('show');
}
function tourEnd() { $('#tour').classList.remove('show'); put('wc_tour', 1); }

/* ---------- actions ---------- */
$('#imp').addEventListener('change', function (e) {
  var f = e.target.files[0]; if (!f) return; var r = new FileReader();
  r.onload = function () {
    try {
      var d = JSON.parse(r.result);
      if (d.att) ATT = d.att; if (d.sav) SAV = d.sav; if (d.days) DAYM = d.days; if (d.set) Object.assign(SET, d.set); if (d.seen) SEEN = d.seen;
      if (d.voc) VOC = d.voc; if (d.dr) DR = d.dr; if (typeof d.xp === 'number') XP = d.xp; if (d.rcw) RCW = d.rcw;
      put('wc_att', ATT); put('wc_sav', SAV); put('wc_days', DAYM); put('wc_seen', SEEN); put('wc_voc', VOC); put('wc_dr', DR); put('wc_xp', XP); put('wc_rcw', RCW); saveSet(); sheet(); alert('Backup restored.');
    } catch (x) { alert('That file is not a valid backup.'); }
  };
  r.readAsText(f); e.target.value = '';
});
function setTopicOnly(v) { TOPICS.forEach(function (t) { S.secs[t] = (t === v); }); S.mode = 'topic'; S.kind = 'quiz'; S.pool = 'all'; S.diff = 0; S.gtab = GRP[v] || S.gtab; }
function drill(rule) { if (S.view === 'test') return alert('Finish or exit the current test first.'); closeSheet(); S.kind = 'quiz'; S.mode = 'topic'; start({ rule: rule, cnt: 10 }); }
function flashGo(list, src) { if (!list.length) return toast('No cards in this deck right now.'); flashStart(list.map(function (w) { return w.i; }), src); learn('flash'); }
var A = {
  theme: function () { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; put('wc_t', root.dataset.theme); if (sheetOpen()) sheet(); if (toolsOpen() && S.ttab === 'pad') padDraw(); },
  pick: function (v) { root.dataset.pal = v; put('wc_p', v); if (sheetOpen()) sheet(); },
  mode: function (v) { S.mode = v; home(true); }, kind: function (v) { S.kind = v; home(true); },
  sec: function (v) { S.secs[v] = !S.secs[v]; home(true); }, cnt: function (v) { S.cnt = +v; home(true); }, diff: function (v) { S.diff = +v; home(true); },
  gtab: function (v) { S.gtab = v; home(true); },
  topall: function () { var c = counts(S.pool === 'unseen', S.diff); TOPICS.forEach(function (t) { S.secs[t] = c[t] > 0; }); home(true); },
  topgrp: function () { var c = counts(S.pool === 'unseen', S.diff); GROUPS.forEach(function (G) { if (G.n === S.gtab) G.topics.forEach(function (t) { S.secs[t.n] = c[t.n] > 0; }); }); home(true); },
  topweak: function () {
    var g = agg(), c = counts(S.pool === 'unseen', S.diff), ks = weakFirst(g).filter(function (k) { return c[k] > 0; }).slice(0, 3);
    if (!ks.length) return toast('Take a test first — then I can find your weakest topics.');
    TOPICS.forEach(function (t) { S.secs[t] = ks.indexOf(t) > -1; }); S.gtab = GRP[ks[0]]; home(true);
  },
  pool: function (v) { S.pool = v; home(true); }, topnone: function () { TOPICS.forEach(function (t) { S.secs[t] = false; }); home(true); },
  neg: function () { S.neg = !S.neg; home(true); }, start: function () { start(); }, home: function () { F = null; closeSheet(); home(); },
  resume: resume, discard: function () { if (confirm('Discard your unfinished test?')) { clearRun(); home(true); } },
  revdue: function () { S.sf = 'd'; A.practice(); },
  coach: function (v) { drill(v); }, prule: function (v) { drill(v); },
  opt: function (v) {
    if (S.run === 'quiz') { if (S.ans[S.cur] !== null) return; buzz(); S.ans[S.cur] = +v; test(true); return; }
    buzz(); S.ans[S.cur] = +v; var c = S.cur; test(true);
    if (SET.autoNext && c < S.qs.length - 1) setTimeout(function () { if (S.view === 'test' && S.cur === c && !S.paused) { S.cur++; test(); } }, 280);
  },
  flag: function (v) { if (S.run === 'quiz' && S.ans[S.cur] !== null) return; S.fl[S.cur] = S.fl[S.cur] === v ? null : v; test(true); },
  prev: function () { if (S.cur > 0) { S.cur--; test(); } },
  next: function () {
    if (S.cur < S.qs.length - 1) { S.cur++; test(); return; }
    if (S.run === 'quiz') { var u = S.ans.filter(function (x) { return x === null; }).length; if (u && !confirm(u + ' question(s) unanswered. Finish the quiz?')) return; submit(); }
    else if (ask('Submit the test?')) submit();
  },
  mark: function () { if (S.mk[S.cur]) delete S.mk[S.cur]; else S.mk[S.cur] = 1; test(true); },
  clear: function () { S.ans[S.cur] = null; test(true); },
  save: function () { var q = S.qs[S.cur], e = SAV[q._k]; if (e && e.b) e.b = false; else keep(q, 'b'); persist(); test(true); },
  rsave: function (v, el) { var q = S.qs[+v], e = SAV[q._k]; if (e && e.b) e.b = false; else keep(q, 'b'); persist(); el.textContent = SAV[q._k] && SAV[q._k].b ? '🔖 Saved' : '🔖 Save'; },
  jump: function (v) { S.cur = +v; closeGrid(); test(); },
  secjump: function (v) { for (var i = 0; i < S.qs.length; i++) if (S.qs[i].s === v) { S.cur = i; break; } test(); },
  grid: function () { S.grid ? closeGrid() : openGrid(); }, closegrid: closeGrid,
  submit: function () { if (ask('Submit the test?')) submit(); },
  exit: function () { if (confirm('Exit this test? Your progress will be lost.')) { clearRun(); exitFS(); S.paused = false; $('#warn').classList.remove('show'); home(); } },
  pause: pause, unpause: unpause, pauseexit: function () { $('#pause').classList.remove('show'); exitFS(); S.paused = false; home(); },
  fsback: function () { $('#warn').classList.remove('show'); reqFS(S.run, S.mode); }, fsskip: function () { $('#warn').classList.remove('show'); S.fs = false; },
  tools: function (v) { if (S.view === 'test' && !S.paused) openTools(v); }, toolsclose: closeTools, ttab: function (v) { toolTab(v); },
  padcol: function (v) { PAD.col = v; PAD.erase = false; padUI(); }, paderase: function () { PAD.erase = !PAD.erase; padUI(); },
  padundo: function () { PAD.strokes.pop(); padDraw(); }, padclear: function () { PAD.strokes = []; padDraw(); }, ck: function (v) { calcPress(v); },
  /* reading tools */
  hl: function (v) {
    var sel = window.getSelection(), b = $('.pbody'); if (!b || !sel || !sel.rangeCount || sel.isCollapsed) return toast('Select some passage text first, then tap a colour.');
    var r = sel.getRangeAt(0); if (!b.contains(r.commonAncestorContainer)) return toast('Select text inside the passage.');
    var m = document.createElement('mark'); if (v !== 'y') m.className = v;
    try { m.appendChild(r.extractContents()); r.insertNode(m); } catch (e) { return toast('Select within a single paragraph.'); }
    sel.removeAllRanges(); S.ph[S.qs[S.cur].p] = b.innerHTML; saveRun();
  },
  pfold: function () { var p = S.qs[S.cur].p; S.pfold[p] = !S.pfold[p]; test(true); },
  pclear: function () { delete S.ph[S.qs[S.cur].p]; test(true); },
  pwpm: function () {
    var id = S.qs[S.cur].p, p = PASS[id], t = S.pt[id] || 0; if (t < 10) return toast('Read the passage first, then tap Done reading.'); var w = Math.min(900, Math.round(p.words / (t / 60))); S.pdone[id] = w;
    RCW.push({ ts: Date.now(), wpm: w, pid: id }); if (RCW.length > 60) RCW.shift(); put('wc_rcw', RCW); toast('⚡ Reading speed: ' + w + ' wpm'); test(true);
  },
  rulepop: function (v) { ruleModal(v); }, modalclose: function () { $('#tour').classList.remove('show'); },
  /* learning */
  learn: function (v) { if (S.view === 'test') return; closeSheet(); if (v === 'flash') F = null; learn(v); },
  ltab: function (v) { if (v !== 'flash') F = null; S.ltab = v; learn(v); },
  rulef: function (v) { S.ruleF = v; S.keepL = true; learn(); },
  dstart: function (v) { dailyStart(v); },
  fdue: function () { closeSheet(); flashGo(vocDue(), 'due'); }, fnew: function () { closeSheet(); flashGo(WORDS.filter(function (w) { return !VOC[w.w]; }).slice(0, 10), 'new'); },
  fwotd: function () { closeSheet(); flashGo(wotd(), 'wotd'); }, fweak: function () { flashGo(WORDS.filter(function (w) { return VOC[w.w] && VOC[w.w].b === 1; }).slice(0, 10), 'weak'); },
  flip: function () { if (!F) return; F.flip = !F.flip; S.keepL = true; learn(); },
  frate: function (v) { var w = WORDS[F.list[F.i]]; rateWord(w, +v); if (+v) F.ok++; else F.again++; F.i++; F.flip = false; learn(); },
  fend: function () { F = null; learn('flash'); }, speak: function (v) { speak(v); },
  rcgo: function (v) { var p = PASS[v]; launchQuiz(BANK.filter(function (q) { return q.p === v; }), 'Reading · ' + p.title, ''); },
  rg: function (v) { S.rg = v; sheet(); },
  sheet: function (v) { openSheet(v); }, closesheet: closeSheet, tab: function (v) { S.tab = v; sheet(); $('#sbody').scrollTop = 0; },
  sfil: function (v) { S.sf = v; sheet(); }, delsav: function (v) { delete SAV[v]; persist(); sheet(); },
  practice: function () {
    if (S.view === 'test') return alert('Finish or exit the current test first.');
    var l = savedList(); if (!l.length) { openSheet('sav'); return; }
    if (get('wc_run', null) && !confirm('You have an unfinished test. Discard it and start this revision?')) return;
    closeSheet(); S.mode = 'saved'; S.daily = ''; S.src = 'Revision practice';
    begin(l.map(function (e) { return { s: e.s, r: e.r, q: e.q, o: e.o.slice(), a: e.a, e: e.e, p: e.p || undefined, _k: e.k, _src: 'Revision' }; }), 0, 'quiz');
  },
  ptopic: function (v) { if (S.view === 'test') return alert('Finish or exit the current test first.'); closeSheet(); setTopicOnly(v); home(); },
  exportq: exportQ, tour: function () { closeSheet(); tourShow(0); }, tournext: function () { tourShow(S.tourN + 1); }, tourback: function () { tourShow(S.tourN - 1); }, tourend: tourEnd,
  tg: function (v) { SET[v] = !SET[v]; if (v === 'defNeg') S.neg = SET.defNeg; saveSet(); if (sheetOpen()) sheet(); if (S.view === 'home') home(true); },
  font: function (v) { SET.font = +v; saveSet(); sheet(); },
  'export': function () { download('wise-choice-english-backup.json', JSON.stringify({ att: ATT, sav: SAV, set: SET, days: DAYM, seen: SEEN, voc: VOC, dr: DR, xp: XP, rcw: RCW })); },
  'import': function () { $('#imp').click(); },
  wipe: function () {
    if (!confirm('Delete all analytics, streaks, XP, vocabulary progress and saved questions from this device?')) return;
    ATT = []; SAV = {}; DAYM = {}; SEEN = {}; VOC = {}; DR = {}; XP = 0; RCW = [];
    put('wc_att', ATT); put('wc_sav', SAV); put('wc_days', DAYM); put('wc_seen', SEEN); put('wc_voc', VOC); put('wc_dr', DR); put('wc_xp', XP); put('wc_rcw', RCW); sheet();
  }
};
document.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('[data-hl]')) e.preventDefault(); });
document.addEventListener('click', function (e) {
  var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  var f = A[t.dataset.act]; if (f) { if (t.dataset.act !== 'opt') buzz(); f(t.dataset.v, t); }
});
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (toolsOpen()) {
    if (S.ttab === 'calc') {
      var k = e.key, m = { Enter: '=', '=': '=', Backspace: 'B', Delete: 'C', c: 'C', C: 'C', '%': '%' };
      if (/^[0-9.]$/.test(k) || '+-*/'.indexOf(k) > -1) { e.preventDefault(); calcPress(k); } else if (m[k]) { e.preventDefault(); calcPress(m[k]); }
    }
    if (e.key === 'Escape') closeTools(); return;
  }
  if (S.view !== 'test' || S.paused || sheetOpen() || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  var k2 = e.key.toLowerCase();
  if (k2 >= '1' && k2 <= '5') { if (S.qs[S.cur].o[+k2 - 1] !== undefined) A.opt(+k2 - 1); }
  else if (k2 === 'n' || k2 === 'arrowright') { if (S.cur < S.qs.length - 1) A.next(); }
  else if (k2 === 'p' || k2 === 'arrowleft') A.prev();
  else if (k2 === 'm' && S.run !== 'quiz') A.mark();
});


/* =====================================================================
   LIBRARY ENGINE — the app ships with NO questions. Everything you add is
   stored on this device (IndexedDB, localStorage fallback) and can be
   exported as a dataset file at any time.
   ===================================================================== */
var DBN = 'wise_choice_library', STORES = ['q', 'p', 'w', 'x'], idb = null;
var LMETA = Object.assign({ exported: 0, changes: 0 }, get('wc_libmeta', {}));
function metaSave() { put('wc_libmeta', LMETA); }
function loadLib(cb) {
  var fin = false, done = function () { if (!fin) { fin = true; cb(); } };
  function fallback() { idb = null; var d = get('wc_lib', null); if (d) { STORES.forEach(function (s) { LIB[s] = d[s] || []; }); } done(); }
  if (!window.indexedDB) return fallback();
  var r; try { r = indexedDB.open(DBN, 1); } catch (e) { return fallback(); }
  r.onupgradeneeded = function () { STORES.forEach(function (s) { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' }); }); };
  r.onerror = fallback; r.onblocked = fallback;
  r.onsuccess = function () {
    idb = r.result; var left = STORES.length;
    try {
      var tx = idb.transaction(STORES, 'readonly');
      STORES.forEach(function (s) { var g = tx.objectStore(s).getAll(); g.onsuccess = function () { LIB[s] = g.result || []; if (!--left) done(); }; g.onerror = function () { if (!--left) done(); }; });
    } catch (e) { fallback(); }
  };
}
function persistLib(store, upserts, delIds) {
  LMETA.changes += upserts.length + delIds.length; metaSave();
  if (idb) {
    try { var tx = idb.transaction(store, 'readwrite'), os = tx.objectStore(store); upserts.forEach(function (r) { os.put(r); }); delIds.forEach(function (id) { os.delete(id); }); tx.onerror = function () { put('wc_lib', LIB); }; }
    catch (e) { put('wc_lib', LIB); }
  } else put('wc_lib', LIB);
  buildBank();
}
function libSave(store, recs) {
  if (!recs.length) return; var m = {}; LIB[store].forEach(function (r, i) { m[r.id] = i; });
  recs.forEach(function (r) { if (m[r.id] !== undefined) LIB[store][m[r.id]] = r; else { LIB[store].push(r); m[r.id] = LIB[store].length - 1; } });
  persistLib(store, recs, []);
}
function libDelete(store, ids) { if (!ids.length) return; var s = {}; ids.forEach(function (i) { s[i] = 1; }); LIB[store] = LIB[store].filter(function (r) { return !s[r.id]; }); persistLib(store, [], ids); }
function libClear() {
  STORES.forEach(function (s) { LIB[s] = []; });
  if (idb) { try { var tx = idb.transaction(STORES, 'readwrite'); STORES.forEach(function (s) { tx.objectStore(s).clear(); }); } catch (e) {} } else del('wc_lib');
  LMETA.changes += 1; metaSave(); buildBank();
}
function newId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function passMaps() { var t = {}, i = {}; LIB.p.forEach(function (p) { t[Parse.norm(p.title)] = p; i[p.id] = p; }); return { passagesByTitle: t, passagesById: i }; }
function vctx(extra) { return Object.assign({ requireExp: SET.reqExp !== false, defTopic: '' }, passMaps(), extra || {}); }

/* ---------- add records ---------- */
function qRecord(c, id) { return { id: id || newId('q'), topic: c.topic, rule: c.rule || '', diff: c.diff || 2, q: c.q, o: c.o, a: c.a, e: c.e || '', p: c.p || '', h: Parse.fingerprint(c.q, c.o), ts: Date.now() }; }
function addQuestions(list) {
  var fps = {}; LIB.q.forEach(function (r) { fps[r.h] = 1; }); var recs = [], dups = 0;
  list.forEach(function (c) { var r = qRecord(c); if (fps[r.h]) { dups++; return; } fps[r.h] = 1; recs.push(r); });
  libSave('q', recs); return { added: recs.length, dups: dups };
}
function addWords(list) {
  var have = {}; LIB.w.forEach(function (w) { have[w.id] = 1; }); var recs = [], dups = 0;
  list.forEach(function (w) { var id = 'w:' + Parse.norm(w.w); if (have[id]) { dups++; return; } have[id] = 1; recs.push({ id: id, w: w.w, pos: w.pos || '', m: w.m, ex: w.ex || '', syn: w.syn || '', ant: w.ant || '', mn: w.mn || '', ts: Date.now() }); });
  libSave('w', recs); return { added: recs.length, dups: dups };
}
function addPairs(list) {
  var have = {}; LIB.x.forEach(function (p) { have[p.id] = 1; }); var recs = [], dups = 0;
  list.forEach(function (p) { var id = 'x:' + Parse.norm(p.a) + '|' + Parse.norm(p.b); if (have[id]) { dups++; return; } have[id] = 1; recs.push({ id: id, a: p.a, am: p.am, ae: p.ae || '', b: p.b, bm: p.bm, be: p.be || '', ts: Date.now() }); });
  libSave('x', recs); return { added: recs.length, dups: dups };
}

/* ---------- bulk check → preview → commit ---------- */
function checkAll(items, vc) {
  var out = { q: [], p: [], w: [], x: [], errors: [], warns: 0, dups: 0, total: items.length }, fps = {};
  LIB.q.forEach(function (r) { fps[r.h] = 1; });
  items.forEach(function (it) {
    var c = Parse.checkQ(it, vc);
    if (c.errs.length) { out.errors.push({ line: it.line, msg: c.errs.join('; '), q: String(it.q || '').slice(0, 50) }); return; }
    out.warns += c.warns.length; var h = Parse.fingerprint(c.q.q, c.q.o); if (fps[h]) { out.dups++; return; } fps[h] = 1; out.q.push(c.q);
  });
  return out;
}
function checkJSON(data) {
  var out = { q: [], p: [], w: [], x: [], errors: [], warns: 0, dups: 0, total: (data.questions || []).length }, vc = vctx(), idMap = {}, have = {};
  vc.passagesById = Object.assign({}, vc.passagesById); vc.passagesByTitle = Object.assign({}, vc.passagesByTitle);
  LIB.p.forEach(function (p) { have[p.id] = 1; });
  (data.passages || []).forEach(function (p, i) {
    var topic = Parse.resolveTopic(p.topic || p.type) || 'Comprehension Passage', title = String(p.title || '').trim(), text = String(p.text || '').trim();
    if (!title || !text) { out.errors.push({ line: 'passage #' + (i + 1), msg: 'title or text is empty' }); return; }
    var ex = vc.passagesByTitle[Parse.norm(title)]; if (ex) { idMap[p.id] = ex.id; return; }
    var id = p.id && !have[p.id] ? p.id : newId('p'); idMap[p.id] = id; have[id] = 1;
    var rec = { id: id, topic: topic, title: title, text: text, ts: Date.now() }; out.p.push(rec); vc.passagesById[id] = rec; vc.passagesByTitle[Parse.norm(title)] = rec;
  });
  var items = (data.questions || []).map(function (r, i) {
    return { line: '#' + (i + 1), topic: r.topic || r.s || '', q: r.q, o: r.o || r.options || [], a: typeof r.a === 'number' ? r.a : (r.key || r.answer || ''), e: r.e || r.explanation || '', rule: r.rule || r.r || '', diff: r.diff || r.d || r.level || '', passageId: r.p ? (idMap[r.p] || r.p) : '', passageTitle: r.passage || '' };
  });
  var r2 = checkAll(items, vc); out.q = r2.q; out.errors = out.errors.concat(r2.errors); out.warns = r2.warns; out.dups = r2.dups;
  var wr = Parse.parseWords(''); (data.words || []).forEach(function (w, i) { if (w && w.w && w.m) out.w.push(w); else out.errors.push({ line: 'word #' + (i + 1), msg: 'word or meaning missing' }); });
  (data.pairs || []).forEach(function (p, i) { if (p && p.a && p.b && p.am && p.bm) out.x.push(p); else out.errors.push({ line: 'pair #' + (i + 1), msg: 'incomplete pair' }); });
  return out;
}
function commit(res) {
  var r = { q: { added: 0, dups: 0 }, w: { added: 0, dups: 0 }, x: { added: 0, dups: 0 }, p: res.p.length };
  libSave('p', res.p); r.q = addQuestions(res.q); r.w = addWords(res.w); r.x = addPairs(res.x); return r;
}

/* ---------- exports (this is how the question library is saved) ---------- */
function stamp() { return dkey(); }
function libJSON() {
  return JSON.stringify({ app: 'wise-choice-english', format: 'library', version: 1, exportedAt: new Date().toISOString(),
    counts: { questions: LIB.q.length, passages: LIB.p.length, words: LIB.w.length, pairs: LIB.x.length },
    questions: LIB.q.map(function (r) { return { id: r.id, topic: r.topic, rule: r.rule, diff: r.diff, q: r.q, o: r.o, a: r.a, key: 'ABCDE'.charAt(r.a), e: r.e, p: r.p }; }),
    passages: LIB.p.map(function (p) { return { id: p.id, topic: p.topic, title: p.title, text: p.text }; }),
    words: LIB.w.map(function (w) { return { w: w.w, pos: w.pos, m: w.m, ex: w.ex, syn: w.syn, ant: w.ant, mn: w.mn }; }),
    pairs: LIB.x.map(function (p) { return { a: p.a, am: p.am, ae: p.ae, b: p.b, bm: p.bm, be: p.be }; }) }, null, 1);
}
function csvCell(c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }
function libCSV() {
  var pt = {}; LIB.p.forEach(function (p) { pt[p.id] = p.title; });
  var rows = [['topic', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'answer', 'explanation', 'rule', 'level', 'passage']];
  LIB.q.forEach(function (r) { rows.push([r.topic, r.q, r.o[0] || '', r.o[1] || '', r.o[2] || '', r.o[3] || '', r.o[4] || '', 'ABCDE'.charAt(r.a), r.e, r.rule && RB[r.rule] ? RB[r.rule].n : '', r.diff, r.p ? pt[r.p] || '' : '']); });
  return '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
}
function libTXT() {
  return LIB.q.slice().sort(function (a, b) { return ti(a.topic) - ti(b.topic); }).map(function (r) {
    var pt = r.p ? (LIB.p.filter(function (p) { return p.id === r.p; })[0] || {}).title : '';
    return 'Topic: ' + r.topic + '\nLevel: ' + r.diff + (r.rule && RB[r.rule] ? '\nRule: ' + RB[r.rule].n : '') + (pt ? '\nPassage: ' + pt : '\nPassage: none') + '\nQ: ' + r.q + '\n' +
      r.o.map(function (o, i) { return 'ABCDE'.charAt(i) + ') ' + o; }).join('\n') + '\nAnswer: ' + 'ABCDE'.charAt(r.a) + '\nExplanation: ' + (r.e || '') + '\n';
  }).join('---\n');
}
function markExported() { LMETA.exported = Date.now(); LMETA.changes = 0; metaSave(); }

/* ---------- Library UI ---------- */
function newQF(keep) { return { topic: keep ? keep.topic : '', rule: '', diff: keep ? keep.diff : 2, q: '', o: ['', '', '', ''], a: -1, e: '', p: keep ? keep.p : '' }; }
Object.assign(S, { lt: 'ov', qf: newQF(), edit: '', pf: { title: '', topic: 'Comprehension Passage', text: '', qtext: '' }, pedit: '', bulk: { fmt: 'text', text: '', defTopic: '', defDiff: '', res: null, msg: '' },
  wk: 'w', wf: { w: '', pos: '', m: '', ex: '', syn: '', ant: '', mn: '' }, xf: { a: '', am: '', ae: '', b: '', bm: '', be: '' }, wbulk: '', wmsg: '', bf: { text: '', topic: '', noexp: false, n: 30 }, sel: {}, fileFor: 'bulk' });
var PTOPICS = ['Comprehension Passage', 'Cloze Test'];
function topicSelect(path, cur, opts) {
  return '<select class="sel" data-st="' + path + '" data-rr="1">' + '<option value="">' + (opts && opts.ph || 'Choose topic…') + '</option>' + GROUPS.map(function (g) {
    return '<optgroup label="' + esc(g.i + ' ' + g.n) + '">' + g.topics.map(function (t) { return '<option value="' + esc(t.n) + '"' + (cur === t.n ? ' selected' : '') + '>' + esc(t.n) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select>';
}
function fld(label, html, hint) { return '<div style="margin:12px 0"><div class="mu" style="margin-bottom:5px;font-weight:700">' + label + '</div>' + html + (hint ? '<div class="mu" style="font-size:.78rem;margin-top:4px">' + hint + '</div>' : '') + '</div>'; }
function ta(path, val, rows, ph) { return '<textarea class="inp" rows="' + rows + '" data-st="' + path + '" placeholder="' + esc(ph || '') + '">' + esc(val) + '</textarea>'; }
function inp(path, val, ph) { return '<input class="inp" type="text" data-st="' + path + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '">'; }
function msgBox(m, bad) { return m ? '<div class="card" style="border-color:' + (bad ? '#ef4444' : '#10b981') + '">' + m + '</div>' : ''; }

function ovHtml() {
  var c = counts(false, 0), nq = LIB.q.length, mx = Math.max.apply(null, TOPICS.map(function (t) { return c[t]; }).concat([1]));
  var h = '<div class="stats">' + stat('Questions', nq) + stat('Passages', LIB.p.length) + stat('Words', LIB.w.length) + stat('Confusing pairs', LIB.x.length) + '</div>';
  if (!nq && !LIB.w.length) h += '<div class="card rulecard"><b>👋 Your library is empty — build it your way</b><p class="mu" style="margin:6px 0 10px">This app comes with no questions. Add your own, with an answer key and explanation for each one:</p>' +
    '<div class="rtask"><span class="ck">1</span><span class="t">➕ <b>Add one</b> question at a time</span><button class="btn s" data-act="libtab" data-v="add">Open</button></div>' +
    '<div class="rtask"><span class="ck">2</span><span class="t">📥 <b>Bulk add</b> by pasting text, CSV or JSON</span><button class="btn s" data-act="libtab" data-v="bulk">Open</button></div>' +
    '<div class="rtask"><span class="ck">3</span><span class="t">📖 Add <b>passages</b> with their questions</span><button class="btn s" data-act="libtab" data-v="pass">Open</button></div>' +
    '<div class="rtask"><span class="ck">4</span><span class="t">💾 <b>Export</b> the library to keep a copy</span><button class="btn s" data-act="libtab" data-v="exp">Open</button></div></div>';
  else if (LMETA.changes > 0) h += '<div class="card" style="border-color:#f59e0b"><b>⚠️ ' + LMETA.changes + ' unsaved change' + (LMETA.changes > 1 ? 's' : '') + '</b><p class="mu" style="margin:4px 0 10px">' + (LMETA.exported ? 'Last export: ' + new Date(LMETA.exported).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'You have never exported this library') + '. Export a copy so clearing browser data can\'t lose it.</p><button class="btn s" data-act="libtab" data-v="exp">💾 Export now</button></div>';
  h += '<div class="sec">Questions by topic</div>';
  GROUPS.forEach(function (g) {
    h += '<div class="card"><b>' + g.i + ' ' + g.n + '</b>' + g.topics.map(function (t) { return '<div class="line" style="padding:5px 0 0"><span class="mu">' + t.i + ' ' + esc(t.n) + '</span><b>' + c[t.n] + '</b></div><div class="bar" style="margin:3px 0 2px;height:5px"><i style="width:' + Math.round(c[t.n] / mx * 100) + '%"></i></div>'; }).join('') + '</div>';
  });
  return h;
}

function addHtml() {
  var f = S.qf, isP = PTOPICS.indexOf(f.topic) > -1, rules = (window.RULEBOOK || []).filter(function (r) { return r.t === f.topic; }), ps = LIB.p.filter(function (p) { return p.topic === f.topic; });
  var html = '<div class="card"><b>' + (S.edit ? '✏️ Edit question' : '➕ Add a question') + '</b>' +
    fld('Topic *', topicSelect('qf.topic', f.topic)) +
    (isP ? fld('Passage *', ps.length ? '<select class="sel" data-st="qf.p" data-rr="1"><option value="">Choose passage…</option>' + ps.map(function (p) { return '<option value="' + p.id + '"' + (f.p === p.id ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') + '</select>' : '<div class="note">No ' + f.topic + ' passages yet — add one under <b>Passages</b> first.</div>') : '') +
    '<div class="row" style="gap:12px;align-items:flex-start"><div style="flex:1;min-width:150px">' + fld('Rule (optional)', '<select class="sel" data-st="qf.rule" data-rr="1"' + (f.topic ? '' : ' disabled') + '><option value="">— none —</option>' + rules.map(function (r) { return '<option value="' + r.id + '"' + (f.rule === r.id ? ' selected' : '') + '>' + esc(r.n) + '</option>'; }).join('') + '</select>', 'Links wrong answers to a rule card') + '</div>' +
    '<div style="flex:1;min-width:130px">' + fld('Level', '<select class="sel" data-st="qf.diff" data-num="1" data-rr="1">' + [[1, 'Easy'], [2, 'Medium'], [3, 'Hard']].map(function (x) { return '<option value="' + x[0] + '"' + (f.diff === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>') + '</div></div>' +
    fld('Question *', ta('qf.q', f.q, 3, 'Type the question…'), 'Use **bold** or __underline__; new lines are kept.') +
    fld('Options * — tick the correct answer (answer key)', f.o.map(function (o, i) { return '<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><input type="radio" name="ans" data-st="qf.a" data-num="' + i + '" ' + (f.a === i ? 'checked' : '') + ' aria-label="Correct answer ' + 'ABCDE'.charAt(i) + '" style="width:22px;height:22px;flex:none"><b style="width:18px">' + 'ABCDE'.charAt(i) + '</b>' + inp('qf.o.' + i, o, 'Option ' + 'ABCDE'.charAt(i)) + '</div>'; }).join('') +
      '<div class="row">' + (f.o.length < 5 ? '<button class="btn g s" data-act="qopt" data-v="+">+ Option</button>' : '') + (f.o.length > 2 ? '<button class="btn g s" data-act="qopt" data-v="-">− Option</button>' : '') + '</div>') +
    fld('Explanation' + (SET.reqExp !== false ? ' *' : ''), ta('qf.e', f.e, 3, 'Why is this the right answer?')) +
    '<div class="row" style="margin-top:6px"><button class="btn" data-act="qsave">' + (S.edit ? 'Save changes' : 'Save question') + '</button>' + (S.edit ? '<button class="btn g" data-act="qcancel">Cancel</button>' : '<button class="btn g" data-act="qreset">Clear form</button>') + '</div></div>';
  var pv = '<div class="sec">Preview</div><div class="card" id="qprev">' + qprevInner() + '</div>';
  return msgBox(S.qmsg, true) + html + pv;
}

function bulkGuide() {
  return '<details class="card"><summary style="cursor:pointer;font-weight:700">📖 Format guide</summary><div class="mu" style="margin-top:8px;line-height:1.6"><b style="color:var(--tx)">Text:</b> one block per question, separated by <code>---</code>. Lines: <code>Topic:</code> (stays until changed), <code>Level:</code> (1–3 or easy/medium/hard), <code>Rule:</code>, <code>Passage:</code> (title of an existing passage), then <code>Q:</code>, options <code>A)</code> … <code>E)</code>, <code>Answer:</code> (A, (b), 3 or the option text) and <code>Explanation:</code>. Questions/explanations can span several lines.<br><b style="color:var(--tx)">CSV:</b> columns <code>topic, question, option_a … option_e, answer, explanation, rule, level, passage</code> (header row recommended; comma, tab, semicolon or | separated).<br><b style="color:var(--tx)">JSON:</b> a library file exported from this app, or an array of question objects.<br><b style="color:var(--tx)">Topics:</b> ' + TOPICS.map(esc).join(', ') + '. Short names like SVA, RC, Idioms also work.</div></details>';
}
function resHtml(res, label) {
  if (!res) return '';
  var h = '<div class="stats" style="grid-template-columns:repeat(4,1fr)">' + stat('✅ Ready', res.q.length + (res.w.length || res.x.length || res.p.length ? ' +' + (res.w.length + res.x.length + res.p.length) : '')) + stat('❌ Errors', res.errors.length) + stat('♻️ Duplicates', res.dups) + stat('⚠️ Notes', res.warns) + '</div>';
  if (res.errors.length) h += '<div class="card" style="border-color:#ef4444"><b>Fix these and check again (they will be skipped otherwise)</b>' + res.errors.slice(0, 40).map(function (e) { return '<div class="line" style="padding:5px 0;align-items:flex-start"><span style="color:#ef4444;white-space:nowrap">' + (typeof e.line === 'number' ? 'Line ' : '') + esc(e.line) + '</span><span class="mu" style="flex:1">' + esc(e.msg) + (e.q ? ' — “' + esc(e.q) + '…”' : '') + '</span></div>'; }).join('') + (res.errors.length > 40 ? '<p class="mu">+' + (res.errors.length - 40) + ' more</p>' : '') + '</div>';
  if (res.q.length) h += '<div class="card"><b>Preview</b>' + res.q.slice(0, 3).map(function (q) { return '<div style="margin-top:8px"><span class="tag">' + esc(q.topic) + '</span> <span class="tag">Level ' + q.diff + '</span><div style="margin-top:4px">' + Parse.fmt(q.q) + '</div><div class="mu">✅ ' + 'ABCDE'.charAt(q.a) + '. ' + esc(q.o[q.a]) + '</div></div>'; }).join('') + (res.q.length > 3 ? '<p class="mu" style="margin-top:8px">…and ' + (res.q.length - 3) + ' more</p>' : '') + '</div>';
  var n = res.q.length + res.w.length + res.x.length + res.p.length;
  if (n) h += '<button class="btn" data-act="' + label + '" style="width:100%">Add ' + res.q.length + ' question' + (res.q.length === 1 ? '' : 's') + (res.p.length ? ' + ' + res.p.length + ' passage(s)' : '') + (res.w.length ? ' + ' + res.w.length + ' word(s)' : '') + (res.x.length ? ' + ' + res.x.length + ' pair(s)' : '') + ' to library</button>';
  else if (!res.errors.length) h += '<p class="mu">Nothing new to add' + (res.dups ? ' — everything already exists in your library.' : '.') + '</p>';
  return h;
}
function bulkHtml() {
  var b = S.bulk, ph = { text: 'Paste questions here, e.g.\n\nTopic: Tenses\nQ: I ___ him since 2015.\nA) know\nB) knew\nC) have known\nD) am knowing\nAnswer: C\nExplanation: “Since” + a point in time needs the present perfect.', csv: 'Paste CSV rows here (header: topic,question,option_a,…,answer,explanation)', json: 'Paste library JSON here, or upload a file' }[b.fmt];
  return '<div class="card"><b>📥 Bulk add questions</b><div class="chips sm" style="margin-top:10px">' + [['text', '📝 Text'], ['csv', '📊 CSV'], ['json', '🧩 JSON']].map(function (x) { return '<button class="chip ' + (b.fmt === x[0] ? 'on' : '') + '" data-act="bulkfmt" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    (b.fmt !== 'json' ? '<div class="row" style="gap:12px;align-items:flex-start"><div style="flex:1;min-width:170px">' + fld('Default topic', topicSelect('bulk.defTopic', b.defTopic, { ph: 'None — use Topic: lines' }), 'Used when a question has no topic') + '</div><div style="flex:1;min-width:130px">' + fld('Default level', '<select class="sel" data-st="bulk.defDiff" data-rr="1">' + [['', 'Medium'], ['1', 'Easy'], ['2', 'Medium'], ['3', 'Hard']].map(function (x, i) { return '<option value="' + x[0] + '"' + (b.defDiff === x[0] && i !== 0 ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>') + '</div></div>' : '') +
    fld('Paste or upload', ta('bulk.text', b.text, 11, ph)) +
    '<div class="row"><button class="btn" data-act="bulkcheck">✔ Check</button><button class="btn g" data-act="bulkfile">📂 Upload file</button><button class="btn g" data-act="bulktpl">Load example</button><button class="btn g" data-act="bulkclear">Clear</button></div></div>' + msgBox(b.msg) + resHtml(b.res, 'bulkadd') + bulkGuide();
}

function passHtml() {
  var f = S.pf, h = '<div class="card"><b>' + (S.pedit ? '✏️ Edit passage' : '📖 Add a passage') + '</b>' + fld('Title *', inp('pf.title', f.title, 'e.g. Trees in the City'), 'Must be unique — you link questions to a passage by its title.') +
    fld('Type', '<select class="sel" data-st="pf.topic" data-rr="1">' + PTOPICS.map(function (t) { return '<option' + (f.topic === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select>') +
    fld('Passage text *', ta('pf.text', f.text, 9, 'Paste your own passage. Leave a blank line between paragraphs.' + (f.topic === 'Cloze Test' ? ' Mark blanks as (1), (2)…' : '')), '<span id="pwc">' + Parse.wordCount(f.text) + ' words</span>' + (f.topic === 'Cloze Test' ? '' : ' · use your own or public-domain text')) +
    fld(S.pedit ? 'Add more questions for this passage (optional)' : 'Questions for this passage', ta('pf.qtext', f.qtext, 8, 'Q: Which statement best expresses the main idea?\nA) …\nB) …\nC) …\nD) …\nAnswer: B\nExplanation: …\n---\nQ: …'), 'Same Q:/A)/Answer:/Explanation: format. No Topic or Passage line needed.') +
    '<div class="row"><button class="btn" data-act="psave">' + (S.pedit ? 'Save changes' : 'Save passage + questions') + '</button>' + (S.pedit ? '<button class="btn g" data-act="pcancel">Cancel</button>' : '') + '</div></div>' + msgBox(S.pmsg, S.pbad);
  var cnt = {}; LIB.q.forEach(function (q) { if (q.p) cnt[q.p] = (cnt[q.p] || 0) + 1; });
  h += '<div class="sec">Your passages (' + LIB.p.length + ')</div>' + (LIB.p.length ? LIB.p.map(function (p) { return '<div class="card"><div class="line" style="padding:0"><span><b>' + esc(p.title) + '</b><small>' + esc(p.topic) + ' · ' + Parse.wordCount(p.text) + ' words · ' + (cnt[p.id] || 0) + ' question(s)' + (cnt[p.id] ? '' : ' — not playable until you add questions') + '</small></span><span class="row"><button class="btn g s" data-act="pedit" data-v="' + p.id + '">Edit</button><button class="btn g s" data-act="pdel" data-v="' + p.id + '">🗑</button></span></div></div>'; }).join('') : '<p class="mu">No passages yet.</p>');
  return h;
}

function wordsHtml() {
  var isW = S.wk === 'w', f = isW ? S.wf : S.xf, path = isW ? 'wf' : 'xf', h = '<div class="chips sm">' + [['w', '🗂️ Words'], ['x', '👯 Confusing pairs']].map(function (x) { return '<button class="chip ' + (S.wk === x[0] ? 'on' : '') + '" data-act="wk" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
  h += '<div class="card"><b>' + (isW ? 'Add a word' : 'Add a confusing pair') + '</b>' + (isW ?
    fld('Word *', inp('wf.w', f.w, 'e.g. Benevolent')) + fld('Part of speech', inp('wf.pos', f.pos, 'adj / noun / verb')) + fld('Meaning *', inp('wf.m', f.m)) + fld('Example sentence', inp('wf.ex', f.ex)) + fld('Synonyms', inp('wf.syn', f.syn, 'comma separated')) + fld('Antonyms', inp('wf.ant', f.ant)) + fld('Mnemonic', inp('wf.mn', f.mn)) :
    '<div class="pairbox"><div>' + fld('Word A *', inp('xf.a', f.a)) + fld('Meaning A *', inp('xf.am', f.am)) + fld('Example A', inp('xf.ae', f.ae)) + '</div><div>' + fld('Word B *', inp('xf.b', f.b)) + fld('Meaning B *', inp('xf.bm', f.bm)) + fld('Example B', inp('xf.be', f.be)) + '</div></div>') +
    '<button class="btn" data-act="wsave">Save</button></div>' +
    '<div class="card"><b>Bulk add ' + (isW ? 'words' : 'pairs') + '</b><p class="mu" style="margin:4px 0 6px">One per line, fields separated by <code>|</code>, tab or comma (CSV):<br><code>' + (isW ? 'word | pos | meaning | example | synonyms | antonyms | mnemonic' : 'word A | meaning A | example A | word B | meaning B | example B') + '</code></p>' +
    ta('wbulk', S.wbulk, 6, isW ? Parse.WORDS_TEMPLATE : Parse.PAIRS_TEMPLATE) + '<div class="row" style="margin-top:8px"><button class="btn" data-act="wbulkadd">Add all</button><button class="btn g" data-act="wbulkfile">📂 Upload file</button></div></div>' + msgBox(S.wmsg, S.wbad);
  var list = isW ? LIB.w : LIB.x;
  h += '<div class="sec">Your ' + (isW ? 'words' : 'pairs') + ' (' + list.length + ')</div>' + (list.length ? '<div class="card">' + list.slice(-80).reverse().map(function (r) { return '<div class="wl"><span><b>' + esc(isW ? r.w : r.a + ' / ' + r.b) + '</b><small>' + esc(isW ? r.m : r.am + ' · ' + r.bm) + '</small></span><button class="btn g s" data-act="wdel" data-v="' + esc(r.id) + '">🗑</button></div>'; }).join('') + (list.length > 80 ? '<p class="mu" style="margin-top:8px">Showing the latest 80.</p>' : '') + '</div>' : '<p class="mu">Nothing here yet.</p>');
  return h;
}

function browseItems() {
  var f = S.bf, t = f.text.toLowerCase();
  return LIB.q.filter(function (r) { return (!f.topic || r.topic === f.topic) && (!f.noexp || !String(r.e || '').trim()) && (!t || (r.q + ' ' + r.o.join(' ') + ' ' + r.e).toLowerCase().indexOf(t) > -1); }).sort(function (a, b) { return b.ts - a.ts; });
}
function browseList() {
  var all = browseItems(), shown = all.slice(0, S.bf.n), ns = Object.keys(S.sel).length;
  return '<div class="line" style="padding:4px 0"><span class="mu">' + all.length + ' question' + (all.length === 1 ? '' : 's') + '</span><span class="row"><button class="btn g s" data-act="bselall">Select shown</button>' + (ns ? '<button class="btn g s" data-act="bdelsel" style="color:#ef4444">🗑 Delete ' + ns + '</button><button class="btn g s" data-act="bselnone">Clear</button>' : '') + '</span></div>' +
    shown.map(function (r) { return '<div class="card"><div class="line" style="padding:0 0 6px;align-items:flex-start"><span><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-act="bsel" data-v="' + r.id + '" ' + (S.sel[r.id] ? 'checked' : '') + '><span class="tag">' + esc(r.topic) + '</span></label></span><span class="row"><button class="btn g s" data-act="qedit" data-v="' + r.id + '">Edit</button><button class="btn g s" data-act="qdel" data-v="' + r.id + '">🗑</button></span></div>' +
      '<div>' + esc(plain(Parse.fmt(r.q)).slice(0, 160)) + (r.q.length > 160 ? '…' : '') + '</div><div class="mu" style="margin-top:4px">✅ ' + 'ABCDE'.charAt(r.a) + '. ' + esc(plain(Parse.fmt(r.o[r.a])).slice(0, 80)) + (r.e ? '' : ' · <span style="color:#f59e0b">no explanation</span>') + '</div></div>'; }).join('') +
    (all.length > shown.length ? '<button class="btn g" data-act="bmore" style="width:100%">Show more (' + (all.length - shown.length) + ')</button>' : '') + (!all.length ? empty('🔎', 'Nothing found', LIB.q.length ? 'Try a different search or topic.' : 'Your library has no questions yet.') : '');
}
function browseHtml() {
  return '<div class="card">' + inp('bf.text', S.bf.text, '🔎 Search questions, options, explanations…') + '<div class="row" style="margin-top:8px"><div style="flex:1;min-width:150px">' + topicSelect('bf.topic', S.bf.topic, { ph: 'All topics' }) + '</div><button class="chip ' + (S.bf.noexp ? 'on' : '') + '" data-act="bnoexp">Missing explanation</button></div></div><div id="blist">' + browseList() + '</div>';
}

function expHtml() {
  var n = LIB.q.length + LIB.p.length + LIB.w.length + LIB.x.length, last = LMETA.exported ? new Date(LMETA.exported).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'never';
  return '<div class="card"><b>💾 Save your question library</b><p class="mu" style="margin:6px 0 10px">Your library lives in this browser. Export it to create a dataset file you can back up, share, or import on another device. Last export: <b style="color:var(--tx)">' + last + '</b>' + (LMETA.changes ? ' · <span style="color:#f59e0b">' + LMETA.changes + ' unsaved change(s)</span>' : '') + '</p>' +
    '<div class="row"><button class="btn" data-act="expjson" ' + (n ? '' : 'disabled style="opacity:.4"') + '>⬇ Library (.json)</button><button class="btn g" data-act="expcsv" ' + (LIB.q.length ? '' : 'disabled style="opacity:.4"') + '>⬇ Questions (.csv)</button><button class="btn g" data-act="exptxt" ' + (LIB.q.length ? '' : 'disabled style="opacity:.4"') + '>⬇ Questions (.txt)</button></div>' +
    '<p class="mu" style="margin-top:10px;font-size:.8rem">JSON holds everything (questions, passages, words, pairs) and is the best backup. CSV opens in Excel / Google Sheets and re-imports here. TXT uses the same paste format as Bulk add.</p></div>' +
    '<div class="card"><b>⬆ Import a library file</b><p class="mu" style="margin:6px 0 10px">Merge adds new items and skips duplicates. Replace erases the current library first.</p><div class="row"><button class="btn g" data-act="impmerge">Merge .json</button><button class="btn g" data-act="impreplace">Replace with .json</button></div></div>' +
    '<div class="card"><b>⚙️ Library settings</b>' + setRow('Require explanation', 'Reject questions without one', sw(SET.reqExp !== false, 'tg', 'reqExp')) + '<div class="line"><span>Keep storage safe<small>Ask the browser not to evict your library</small></span><button class="btn g s" data-act="persist">Protect</button></div></div>' +
    '<div class="card"><b style="color:#ef4444">Danger zone</b><p class="mu" style="margin:6px 0 10px">Erases all questions, passages, words and pairs from this device. Export first!</p><button class="btn g s" style="color:#ef4444" data-act="libclear">🗑 Clear entire library</button></div>';
}
function lib(tab) {
  if (S.view === 'test') return; if (tab) S.lt = tab; S.view = 'lib'; fabs(false); closeTools(); clearInterval(S.t);
  var tabs = [['ov', '📊 Overview'], ['add', '➕ Add one'], ['bulk', '📥 Bulk add'], ['pass', '📖 Passages'], ['words', '🗂️ Words'], ['browse', '🔎 Browse'], ['exp', '💾 Export']];
  var body = ({ ov: ovHtml, add: addHtml, bulk: bulkHtml, pass: passHtml, words: wordsHtml, browse: browseHtml, exp: expHtml })[S.lt]();
  render('<div class="top"><button class="btn g s" data-act="home">← Home</button><b>📚 My Library</b><span class="pill">' + LIB.q.length + ' Q</span></div><div class="tabs2">' + tabs.map(function (t) { return '<button class="chip ' + (S.lt === t[0] ? 'on' : '') + '" data-act="libtab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' + body, S.keepL);
  S.keepL = false;
}

/* ---------- Library actions + form plumbing ---------- */
function setPath(p, v) { var k = p.split('.'), o = S; for (var i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = v; }
function qprevInner() {
  var f = S.qf; return '<b class="qt">' + (f.q ? Parse.fmt(f.q) : '<span class="mu">Your question appears here</span>') + '</b>' + f.o.map(function (o, i) { return '<div class="opt ' + (f.a === i ? 'ok' : '') + '">' + 'ABCDE'.charAt(i) + '. ' + (o ? Parse.fmt(o) : '<span class="mu">…</span>') + '</div>'; }).join('') + (f.e ? '<div class="expl">💡 ' + Parse.fmt(f.e) + '</div>' : '');
}
document.addEventListener('input', function (e) {
  var t = e.target, p = t.dataset && t.dataset.st; if (!p || t.tagName === 'SELECT' || t.type === 'radio') return;
  setPath(p, t.value);
  if (p === 'bf.text') { S.bf.n = 30; var bl = $('#blist'); if (bl) bl.innerHTML = browseList(); }
  if (p.indexOf('qf.') === 0) { var pv = $('#qprev'); if (pv) pv.innerHTML = qprevInner(); }
  if (p === 'pf.text') { var wc = $('#pwc'); if (wc) wc.textContent = Parse.wordCount(t.value) + ' words'; }
});
document.addEventListener('change', function (e) {
  var t = e.target, p = t.dataset && t.dataset.st; if (!p) return;
  var v = t.type === 'radio' ? +t.dataset.num : (t.dataset.num ? +t.value : t.value);
  setPath(p, v);
  if (p === 'qf.topic') { S.qf.rule = ''; S.qf.p = ''; }
  if (p === 'bf.topic') S.bf.n = 30;
  if (p === 'qf.a') { var pv = $('#qprev'); if (pv) pv.innerHTML = qprevInner(); return; }
  if (t.dataset.rr) { S.keepL = true; lib(); }
});
$('#libfile').addEventListener('change', function (e) {
  var f = e.target.files[0]; if (!f) return; var r = new FileReader();
  r.onload = function () {
    var txt = String(r.result), ext = (f.name.split('.').pop() || '').toLowerCase();
    if (S.fileFor === 'bulk') { S.bulk.text = txt; S.bulk.fmt = ext === 'json' ? 'json' : ext === 'csv' ? 'csv' : 'text'; S.bulk.res = null; S.bulk.msg = '📂 Loaded ' + esc(f.name) + ' — press Check'; lib('bulk'); }
    else if (S.fileFor === 'wbulk') { S.wbulk = txt; lib('words'); }
    else importFile(txt, S.fileFor);
  };
  r.readAsText(f); e.target.value = '';
});
function importFile(txt, mode) {
  var pj = Parse.parseLibraryJSON(txt); if (pj.error) return alert(pj.error);
  if (mode === 'replace') { if (!confirm('Replace your entire library with this file? Current questions, passages and words will be erased.')) return; libClear(); }
  var res = checkJSON(pj.data), n = res.q.length + res.w.length + res.x.length + res.p.length;
  if (!n) return alert('Nothing to add.' + (res.dups ? ' All ' + res.dups + ' questions already exist.' : '') + (res.errors.length ? '\n' + res.errors.length + ' item(s) had errors.' : ''));
  if (mode === 'merge' && !confirm('Add ' + res.q.length + ' question(s), ' + res.p.length + ' passage(s), ' + res.w.length + ' word(s), ' + res.x.length + ' pair(s)?\n' + res.dups + ' duplicate(s) and ' + res.errors.length + ' invalid item(s) will be skipped.')) return;
  var r = commit(res); toast('✅ Imported ' + r.q.added + ' questions'); S.lt = 'ov'; lib();
}
function dupOther(c, ignoreId) { var h = Parse.fingerprint(c.q, c.o); return LIB.q.some(function (r) { return r.h === h && r.id !== ignoreId; }); }
function errList(errs) { return errs.slice(0, 12).map(function (e) { return '• ' + esc((typeof e.line === 'number' ? 'Line ' + e.line + ': ' : '') + e.msg); }).join('<br>') + (errs.length > 12 ? '<br>…' : ''); }
Object.assign(A, {
  libtab: function (v) { lib(v); window.scrollTo(0, 0); },
  libopen: function () { if (S.view === 'test') return; closeSheet(); lib('ov'); },
  qopt: function (v) { var f = S.qf; if (v === '+' && f.o.length < 5) f.o.push(''); if (v === '-' && f.o.length > 2) { f.o.pop(); if (f.a >= f.o.length) f.a = -1; } S.keepL = true; lib(); },
  qsave: function () {
    var f = S.qf, c = Parse.checkQ({ topic: f.topic, q: f.q, o: f.o, a: f.a, e: f.e, rule: f.rule, diff: f.diff, passageId: f.p }, vctx());
    if (c.errs.length) { S.qmsg = '❌ ' + c.errs.map(esc).join('<br>❌ '); S.keepL = true; return lib(); }
    if (dupOther(c.q, S.edit)) { S.qmsg = '♻️ This question (same text and options) is already in your library.'; S.keepL = true; return lib(); }
    S.qmsg = '';
    if (S.edit) { var old = LIB.q.filter(function (r) { return r.id === S.edit; })[0] || {}, rec = qRecord(c.q, S.edit); rec.ts = old.ts || rec.ts; libSave('q', [rec]); S.edit = ''; S.qf = newQF(); toast('✅ Question updated'); return lib('browse'); }
    addQuestions([c.q]); S.qf = newQF(S.qf); toast('✅ Saved — ' + LIB.q.length + ' in library'); lib(); window.scrollTo(0, 0);
  },
  qedit: function (v) { var r = LIB.q.filter(function (x) { return x.id === v; })[0]; if (!r) return; S.qf = { topic: r.topic, rule: r.rule || '', diff: r.diff || 2, q: r.q, o: r.o.slice(), a: r.a, e: r.e || '', p: r.p || '' }; S.edit = v; S.qmsg = ''; lib('add'); window.scrollTo(0, 0); },
  qcancel: function () { S.edit = ''; S.qf = newQF(); S.qmsg = ''; lib('browse'); },
  qreset: function () { S.qf = newQF(); S.qmsg = ''; S.keepL = true; lib(); },
  qdel: function (v) { if (!confirm('Delete this question from your library?')) return; libDelete('q', [v]); delete S.sel[v]; S.keepL = true; lib(); },
  bulkfmt: function (v) { S.bulk.fmt = v; S.bulk.res = null; S.bulk.msg = ''; S.keepL = true; lib(); },
  bulkclear: function () { S.bulk.text = ''; S.bulk.res = null; S.bulk.msg = ''; S.keepL = true; lib(); },
  bulktpl: function () { S.bulk.text = S.bulk.fmt === 'csv' ? Parse.CSV_TEMPLATE : S.bulk.fmt === 'json' ? '{"questions":[{"topic":"Noun","q":"The plural of criterion is —","o":["criterions","criteria","criterias","criterion"],"a":1,"e":"Greek plural: criterion → criteria."}]}' : Parse.TEXT_TEMPLATE; S.bulk.res = null; S.bulk.msg = ''; S.keepL = true; lib(); },
  bulkfile: function () { S.fileFor = 'bulk'; $('#libfile').click(); },
  bulkcheck: function () {
    var b = S.bulk; b.msg = ''; b.res = null; S.keepL = true;
    if (!b.text.trim()) { b.msg = 'Paste or upload something first.'; return lib(); }
    if (b.fmt === 'json') { var pj = Parse.parseLibraryJSON(b.text); if (pj.error) b.msg = '❌ ' + esc(pj.error); else b.res = checkJSON(pj.data); return lib(); }
    var d = { topic: b.defTopic, diff: b.defDiff }, pr = b.fmt === 'csv' ? Parse.parseCSV(b.text, d) : Parse.parseText(b.text, d), res = checkAll(pr.items, vctx({ defTopic: b.defTopic }));
    res.errors = pr.errors.map(function (e) { return { line: e.line, msg: e.msg }; }).concat(res.errors); b.res = res;
    if (!pr.items.length && !pr.errors.length) b.msg = 'No questions found — see the format guide below.'; lib();
  },
  bulkadd: function () {
    var b = S.bulk; if (!b.res) return; var r = commit(b.res);
    b.msg = '✅ Added <b>' + r.q.added + '</b> question(s)' + (r.p ? ', ' + r.p + ' passage(s)' : '') + (r.w.added ? ', ' + r.w.added + ' word(s)' : '') + (r.x.added ? ', ' + r.x.added + ' pair(s)' : '') + (r.q.dups ? ' · ' + r.q.dups + ' duplicate(s) skipped' : '') + '. Library now has ' + LIB.q.length + ' questions.';
    b.res = null; b.text = ''; S.keepL = true; lib();
  },
  psave: function () {
    var f = S.pf, title = f.title.trim(), text = f.text.trim(); S.pbad = true; S.keepL = true;
    if (!title || !text) { S.pmsg = '❌ Title and passage text are required.'; return lib(); }
    var ex = passMaps().passagesByTitle[Parse.norm(title)]; if (ex && ex.id !== S.pedit) { S.pmsg = '❌ A passage titled “' + esc(title) + '” already exists.'; return lib(); }
    var rec = { id: S.pedit || newId('p'), topic: f.topic, title: title, text: text, ts: Date.now() }, vc = vctx(), res = { q: [], errors: [], dups: 0 };
    vc.passagesById[rec.id] = rec; vc.passagesByTitle[Parse.norm(title)] = rec;
    if (f.qtext.trim()) {
      var pr = Parse.parseText(f.qtext, {}); pr.items.forEach(function (it) { it.passageTitle = title; });
      res = checkAll(pr.items, vc); res.errors = pr.errors.map(function (e) { return { line: e.line, msg: e.msg }; }).concat(res.errors);
      if (res.errors.length) { S.pmsg = '❌ ' + res.errors.length + ' problem(s) in the questions — nothing was saved:<br>' + errList(res.errors); return lib(); }
    }
    libSave('p', [rec]);
    if (S.pedit) { var mv = LIB.q.filter(function (q) { return q.p === rec.id && q.topic !== rec.topic; }).map(function (q) { return Object.assign({}, q, { topic: rec.topic }); }); libSave('q', mv); }
    var r = addQuestions(res.q); S.pbad = false; S.pmsg = '✅ Saved “' + esc(title) + '” with ' + r.added + ' new question(s)' + (r.dups ? ' (' + r.dups + ' duplicate skipped)' : '') + '.' + (!LIB.q.some(function (q) { return q.p === rec.id; }) ? ' Add questions so it can be practised.' : '');
    S.pf = { title: '', topic: f.topic, text: '', qtext: '' }; S.pedit = ''; lib();
  },
  pedit: function (v) { var p = LIB.p.filter(function (x) { return x.id === v; })[0]; if (!p) return; S.pf = { title: p.title, topic: p.topic, text: p.text, qtext: '' }; S.pedit = v; S.pmsg = ''; lib('pass'); window.scrollTo(0, 0); },
  pcancel: function () { S.pf = { title: '', topic: 'Comprehension Passage', text: '', qtext: '' }; S.pedit = ''; S.pmsg = ''; S.keepL = true; lib(); },
  pdel: function (v) {
    var ids = LIB.q.filter(function (q) { return q.p === v; }).map(function (q) { return q.id; });
    if (!confirm('Delete this passage' + (ids.length ? ' and its ' + ids.length + ' question(s)' : '') + '?')) return; libDelete('q', ids); libDelete('p', [v]); S.keepL = true; lib();
  },
  wk: function (v) { S.wk = v; S.wmsg = ''; S.keepL = true; lib(); },
  wsave: function () {
    S.keepL = true; S.wbad = true;
    if (S.wk === 'w') { var w = S.wf; if (!w.w.trim() || !w.m.trim()) { S.wmsg = '❌ Word and meaning are required.'; return lib(); } var r = addWords([{ w: w.w.trim(), pos: w.pos.trim(), m: w.m.trim(), ex: w.ex.trim(), syn: w.syn.trim(), ant: w.ant.trim(), mn: w.mn.trim() }]); S.wmsg = r.added ? '✅ Saved “' + esc(w.w) + '”.' : '♻️ That word is already in your library.'; S.wbad = !r.added; if (r.added) S.wf = { w: '', pos: '', m: '', ex: '', syn: '', ant: '', mn: '' }; }
    else { var x = S.xf; if (!x.a.trim() || !x.b.trim() || !x.am.trim() || !x.bm.trim()) { S.wmsg = '❌ Both words and both meanings are required.'; return lib(); } var r2 = addPairs([x]); S.wmsg = r2.added ? '✅ Pair saved.' : '♻️ That pair already exists.'; S.wbad = !r2.added; if (r2.added) S.xf = { a: '', am: '', ae: '', b: '', bm: '', be: '' }; }
    lib();
  },
  wbulkadd: function () {
    S.keepL = true; if (!S.wbulk.trim()) { S.wbad = true; S.wmsg = '❌ Paste some lines first.'; return lib(); }
    var pr = S.wk === 'w' ? Parse.parseWords(S.wbulk) : Parse.parsePairs(S.wbulk), r = S.wk === 'w' ? addWords(pr.items) : addPairs(pr.items);
    S.wbad = !r.added && pr.errors.length > 0; S.wmsg = (r.added ? '✅ Added <b>' + r.added + '</b>' : 'Nothing added') + (r.dups ? ' · ' + r.dups + ' duplicate(s) skipped' : '') + (pr.errors.length ? '<br>❌ ' + pr.errors.length + ' line(s) skipped:<br>' + errList(pr.errors) : '');
    if (r.added && !pr.errors.length) S.wbulk = ''; lib();
  },
  wbulkfile: function () { S.fileFor = 'wbulk'; $('#libfile').click(); },
  wdel: function (v) { libDelete(S.wk === 'w' ? 'w' : 'x', [v]); S.keepL = true; lib(); },
  bsel: function (v) { if (S.sel[v]) delete S.sel[v]; else S.sel[v] = 1; $('#blist').innerHTML = browseList(); },
  bselall: function () { browseItems().slice(0, S.bf.n).forEach(function (r) { S.sel[r.id] = 1; }); $('#blist').innerHTML = browseList(); },
  bselnone: function () { S.sel = {}; $('#blist').innerHTML = browseList(); },
  bdelsel: function () { var ids = Object.keys(S.sel); if (!ids.length || !confirm('Delete ' + ids.length + ' selected question(s)?')) return; libDelete('q', ids); S.sel = {}; S.keepL = true; lib(); },
  bmore: function () { S.bf.n += 30; $('#blist').innerHTML = browseList(); },
  bnoexp: function () { S.bf.noexp = !S.bf.noexp; S.bf.n = 30; S.keepL = true; lib(); },
  expjson: function () { download('wise-choice-library-' + stamp() + '.json', libJSON()); markExported(); toast('⬇ Library exported'); S.keepL = true; lib(); },
  expcsv: function () { download('wise-choice-questions-' + stamp() + '.csv', libCSV(), 'text/csv;charset=utf-8'); markExported(); toast('⬇ CSV exported'); S.keepL = true; lib(); },
  exptxt: function () { download('wise-choice-questions-' + stamp() + '.txt', libTXT(), 'text/plain;charset=utf-8'); markExported(); toast('⬇ Text exported'); S.keepL = true; lib(); },
  impmerge: function () { S.fileFor = 'merge'; $('#libfile').click(); }, impreplace: function () { S.fileFor = 'replace'; $('#libfile').click(); },
  libclear: function () { var t = prompt('This erases ALL questions, passages, words and pairs from this device.\nType DELETE to confirm.'); if (t !== 'DELETE') return; libClear(); S.sel = {}; toast('Library cleared'); S.keepL = true; lib(); },
  persist: function () { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(function (ok) { toast(ok ? '🔒 Storage protected' : 'The browser declined — install the app or export regularly.'); }); else toast('Not supported on this browser.'); },
  install: function () { if (!DEFER) return; DEFER.prompt(); DEFER = null; }
});
var DEFER = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); DEFER = e; if (S.view === 'home') home(true); });
window.addEventListener('appinstalled', function () { DEFER = null; toast('📲 Installed!'); });

/* ---------- boot ---------- */
function regSW() {
  if (!('serviceWorker' in navigator) || location.protocol.indexOf('http') !== 0) return;
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    reg.onupdatefound = function () { var w = reg.installing; if (w) w.onstatechange = function () { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('✨ Update ready — reload to apply'); }; };
  }).catch(function () {});
}
function boot() {
  buildBank(); padInit(); calcInit(); home();
  var m = location.search.match(/[?&]lib=(\w+)/), tabs = { ov: 1, add: 1, bulk: 1, pass: 1, words: 1, browse: 1, exp: 1 };
  if (m) lib(tabs[m[1]] ? m[1] : 'ov'); else if (!get('wc_tour', 0)) tourShow(0);
  regSW();
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (p) { if (!p && navigator.storage.persist) navigator.storage.persist().catch(function () {}); }).catch(function () {});
}
loadLib(boot);
})();
