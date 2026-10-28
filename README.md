# HireSmartly

AI-assisted resume screening frontend. Paste a job description and a candidate's resume, and get back a match score, a requirement-by-requirement breakdown, the strengths and gaps behind it, and a coaching plan to close them.

**Live demo:** _add your GitHub Pages URL here once enabled_

## How it works

The page is a static HTML/CSS/JS site with no build step. Submitting the form sends one POST request to an n8n webhook, which runs a five-agent pipeline and returns a single JSON report. See [about.html](about.html) for the plain-language walkthrough.

1. **Resume Parser** structures the resume
2. **JD Analyzer** structures the job description
3. **Evidence retrieval (RAG)** finds the resume lines that support each requirement
4. **Gap Reasoning** marks each requirement matched / partial / missing and scores the match
5. **Coach** writes priority actions, resume improvements, and interview prep

## Tech stack

- HTML / CSS / vanilla JavaScript (no framework, no build step)
- [n8n](https://n8n.io): one workflow orchestrates all five agents ([`n8n/Hiresmartly_workflow.json`](n8n/Hiresmartly_workflow.json))
- [Groq](https://groq.com): the LLM behind each agent (`openai/gpt-oss-120b`)
- Google Sheets: optional logging node, disabled by default
- GitHub Pages: hosting

## Files

| File | Purpose |
|---|---|
| `index.html` | The scorer: paste a JD and resume, see the report |
| `about.html` | Plain-language explanation of the pipeline and stack |
| `style.css` | Shared styling for both pages |
| `nav.js` | Mobile nav toggle + active-link highlighting |
| `script.js` | Calls the webhook and renders the report |
| `n8n/Hiresmartly_workflow.json` | Importable n8n workflow |

## Setup

1. **Import the workflow** in n8n: Workflows → Import from file → `n8n/Hiresmartly_workflow.json`.
2. On each of the four Groq nodes, select a **Header Auth** credential with name `Authorization` and value `Bearer <your Groq API key>`.
3. **Publish / activate** the workflow. The production URL only responds when the workflow is active.
4. Confirm `CONFIG.webhookUrl` in `script.js` matches the webhook's **Production URL**:
   ```js
   var CONFIG = {
     webhookUrl: 'https://urjasagar.app.n8n.cloud/webhook/hiresmartly'
   };
   ```
5. **CORS** is already set in the workflow (Webhook → Options → Allowed Origins `*`, plus an `Access-Control-Allow-Origin` header on each Respond node). For production, replace `*` with your GitHub Pages origin, e.g. `https://<username>.github.io`.
6. Push this repo to GitHub, then enable **Pages** (Settings → Pages → Deploy from branch → `main` → `/root`).

## API

`POST /webhook/hiresmartly`

```json
{ "mode": "full_analysis", "resume_text": "...", "jd_text": "..." }
```

`mode` can also be `parse_resume` (resume only, `jd_text` not needed). Errors return HTTP 400 with `{ "status": "error", "errors": [...] }`.

## Notes

- A full run makes four sequential AI calls and usually takes 20-60 seconds. The page shows progress and times out after 2 minutes.
- There's no auth on the webhook: anyone with the URL can call it. Fine for a demo; add a shared-secret header check in n8n before using real candidate data.
- Results are AI-generated guidance, not a hiring decision.
