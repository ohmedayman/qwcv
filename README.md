# QCV (qwcv)

AI-powered CV / resume builder (Arabic + English), built as a static site on Firebase Realtime Database + Auth.

## Structure
| Path | What |
|---|---|
| `*.html`, `en/` | Pages (Arabic at root, English in `en/`) |
| `blog/`, `en/blog/` | Blog posts |
| `js/` | Shared scripts (config, AI service, analyzer, template engine, theme, language) |
| `scss/` -> `styles.css` | Sass source and compiled output (`npm run build`) |
| `functions/` | Firebase Cloud Functions (`geminiProxy`, `deleteAuthUser`) |
| `marketing-assets/` | Brand images and marketing screenshots |
| `_dev/` | Internal scratch files, not used by the site |
| `scripts/platform-check.js` | Sanity check (`npm run check`) |

## Local setup
```bash
npm install
cp js/config.example.js js/config.js   # then fill in your values
npm run build   # compile Sass
npm run check   # validate required files
```

## Deploy
Vercel (`vercel.json`) and Firebase Hosting (`firebase.json`) are both configured.
