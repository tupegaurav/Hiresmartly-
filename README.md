# HireSmartly

AI-assisted resume screening frontend. Paste a job description and a candidate's resume, and get back a match score, a plain-language verdict, and the specific strengths and gaps behind it.

**Live demo:** _add your GitHub Pages URL here once enabled_

## How it works

The page is a static HTML/CSS/JS site with no build step. Submitting the form sends one POST request to an n8n webhook, which runs the full scoring pipeline (parse the job description, parse the resume, compare the two) and returns a single JSON result. See [about.html](about.html) for the plain-language walkthrough of the pipeline.

## Tech stack

- HTML / CSS / vanilla JavaScript (no framework, no build step)
- [n8n](https://n8n.io) — orchestrates the JD parser, resume parser, and match scorer workflows
- [Groq](https://groq.com) — the LLM behind each parsing/scoring step
- Google Sheets — stores every parsed job description, parsed resume, and match score
- GitHub Pages — hosting

## Files

| File | Purpose |
|---|---|
| `index.html` | The scorer — paste a JD and resume, see the result |
| `about.html` | Plain-language explanation of the pipeline and stack |
| `style.css` | Shared styling for both pages |
| `nav.js` | Mobile nav toggle + active-link highlighting |
| `script.js` | Calls the webhook and renders the result |

## Setup

1. Open `script.js` and confirm `CONFIG.webhookUrl` points at your **production** Master Orchestrator webhook (Active toggle on, not the Test URL):
   ```js
   var CONFIG = {
     webhookUrl: 'https://tupeai.app.n8n.cloud/webhook/master-pipeline'
   };
   ```
2. Make sure all four n8n workflows (JD Parser, Resume Parser, Match Scorer, Master Orchestrator) are **Active** — the orchestrator calls the other three over HTTP, so if any one is inactive the whole request fails.
3. **Enable CORS on the webhook**, or requests from this page will be blocked by the browser. In the Master Orchestrator's `Respond to Webhook` node, add a response header:
   - `Access-Control-Allow-Origin: *` (or your GitHub Pages origin specifically, e.g. `https://<username>.github.io`)

   If you still see a CORS error in the browser console, add an `OPTIONS` response on the `Webhook` node itself (n8n's Webhook node has a built-in "Allow CORS" option under **Options**).
4. Push this repo to GitHub, then enable **Pages** in the repo settings (Settings → Pages → Deploy from branch → `main` → `/root`).

## Notes

- There's no API key or auth on the webhook in this version — anyone with the URL can call it. Fine for a demo; add an auth header check in n8n (e.g. a shared secret in a custom header, checked with an `If` node) before using this with real candidate data.
- Long job descriptions or resumes may take a few seconds to score, since each one triggers three sequential AI calls.
