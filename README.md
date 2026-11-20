# Wise Choice · Master Competitive English (PWA)

An installable, offline-first practice app. **It ships with no questions** — you build your own library
(one by one or in bulk) and export it as a dataset file whenever you like.

## Run / install
A PWA must be served over **HTTPS** (or `localhost`) to install and work offline.
- **Quick local test:** in this folder run `python3 -m http.server 8000`, open http://localhost:8000
- **Host it free:** drag this folder onto Netlify Drop, or upload it to GitHub Pages / Cloudflare Pages / Vercel.
- Open the hosted URL on your phone → browser menu → **Install app / Add to Home Screen**.
- (Opening `index.html` directly from disk also works as a normal web page, but without install/offline caching.)

## Build your library  (📚 My library)
| Tab | What it does |
|---|---|
| ➕ Add one | Topic, rule, level, question, 2–5 options, **answer key**, **explanation**, live preview |
| 📥 Bulk add | Paste or upload **Text**, **CSV** or **JSON**; *Check* shows errors by line before anything is saved |
| 📖 Passages | Add a reading/cloze passage together with its questions |
| 🗂️ Words | Vocabulary words and confusing pairs (single or bulk) |
| 🔎 Browse | Search, edit, delete, multi-select delete, find questions missing explanations |
| 💾 Export | Download the dataset: `.json` (everything), `.csv` (Excel/Sheets), `.txt` (paste format); import / merge / replace |

### Text format (Bulk add)
```
Topic: Tenses          <- stays active until changed (short names like SVA, RC, Idioms work)
Level: 2               <- optional: 1-3 or easy/medium/hard (applies to the next question)
Rule: Present perfect vs simple past     <- optional, links wrong answers to a rule card
Q: I ___ him since 2015.
A) know
B) knew
C) have known
D) am knowing
Answer: C              <- A, (b), 3, or the option text
Explanation: "Since" + a point in time needs the present perfect.
---
```
For reading passages add them in **Passages** first, then use `Passage: <title>` before the questions.
Formatting: `**bold**`, `__underline__`; line breaks are kept.

### CSV columns
`topic, question, option_a … option_e, answer, explanation, rule, level, passage`  (header row recommended)

## Saving your data
Your library lives in this browser's IndexedDB. Export regularly (the app reminds you of unsaved changes).
`starter-pack.json` (shipped separately) is an optional sample library: Library → Export → *Merge .json*.

## Files
`index.html · style.css · app.js · parse.js · data/ (topics + rule cards only) · sw.js · manifest.webmanifest · icons/ · tools/test-parse.js`
Bump `VERSION` in `sw.js` whenever you change any app file so installed copies update.
