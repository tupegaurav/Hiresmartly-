// HireSmartly — scorer form
//
// Calls the Hiresmartly n8n webhook (5-agent pipeline: resume parser, JD analyzer,
// evidence retrieval, gap reasoning, coach) and renders the full report.

var CONFIG = {
  webhookUrl: 'https://urjasagar.app.n8n.cloud/webhook/hiresmartly',
  timeoutMs: 120000
};

(function () {
  var form = document.querySelector('#scorer-form');
  if (!form) return; // this script also loads on pages without the form

  var jdField = document.querySelector('#jd-text');
  var resumeField = document.querySelector('#resume-text');
  var runButton = document.querySelector('#run-button');
  var sampleButton = document.querySelector('#sample-button');
  var statusLine = document.querySelector('#status-line');
  var resultsSection = document.querySelector('#results');
  var copyButton = document.querySelector('#copy-json');
  var lastReport = null;
  var progressTimer = null;

  var STEPS = [
    'Routing your request…',
    'Reading the resume…',
    'Reading the job description…',
    'Checking requirements against the resume…',
    'Writing the coaching plan…'
  ];

  var SAMPLE_JD = 'Senior AI Automation Engineer\n\nWe are looking for a Senior AI Automation Engineer with 5+ years of experience to design and ship agentic workflows for our HR products.\n\nResponsibilities:\n- Design multi-agent workflows using n8n or similar orchestration tools.\n- Build RAG pipelines using vector databases such as Pinecone or Qdrant.\n- Integrate LLM APIs and write robust prompts.\n- Deploy services with Docker and manage CI/CD pipelines.\n\nMust have:\n- 5+ years of experience in software or automation engineering\n- Strong Python and REST API skills\n- Hands-on n8n experience\n- Experience with RAG and vector databases\n- Docker and CI/CD\n- SQL\n\nNice to have:\n- Kubernetes\n- Experience in HR tech\n- Stakeholder management\n\nEducation: Bachelor\'s degree in Computer Science or related field.';
  var SAMPLE_RESUME = 'Priya Sharma\nEmail: priya.sharma@example.com | Phone: +91 98765 43210 | Pune, India\n\nSUMMARY\nAutomation engineer with 4 years of experience building workflow automations and internal tools for operations teams.\n\nEXPERIENCE\nAutomation Engineer, BrightOps Solutions (Jan 2023 - Present)\n- Built 15+ n8n workflows integrating Google Sheets, Slack and REST APIs, saving the ops team 20 hours per week.\n- Developed Python scripts for data cleaning and reporting using pandas.\n- Integrated LLM APIs (Groq, OpenAI) to classify and summarize support tickets.\n\nJunior Software Developer, CodeNest Technologies (Jul 2021 - Dec 2022)\n- Built REST APIs with FastAPI and wrote SQL queries on PostgreSQL.\n- Worked in an Agile team and used Git and GitHub daily.\n\nEDUCATION\nB.E. Computer Engineering, Savitribai Phule Pune University, 2021\n\nSKILLS\nPython, n8n, FastAPI, SQL, PostgreSQL, Git, Prompt Engineering, Google Sheets, REST APIs';

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    runScore();
  });

  sampleButton.addEventListener('click', function () {
    jdField.value = SAMPLE_JD;
    resumeField.value = SAMPLE_RESUME;
    setStatus('Sample loaded. Click "Score this match".');
  });

  copyButton.addEventListener('click', function () {
    if (!lastReport || !navigator.clipboard) return;
    navigator.clipboard.writeText(JSON.stringify(lastReport, null, 2)).then(function () {
      copyButton.textContent = 'Copied';
      setTimeout(function () { copyButton.textContent = 'Copy full report as JSON'; }, 1500);
    });
  });

  function setStatus(text, state) {
    statusLine.textContent = text;
    if (state) {
      statusLine.setAttribute('data-state', state);
    } else {
      statusLine.removeAttribute('data-state');
    }
  }

  function startProgress() {
    var i = 0;
    setStatus(STEPS[0]);
    progressTimer = setInterval(function () {
      if (i < STEPS.length - 1) i++;
      setStatus(STEPS[i]);
    }, 8000);
  }

  function stopProgress() {
    clearInterval(progressTimer);
  }

  function runScore() {
    var jdText = jdField.value.trim();
    var resumeText = resumeField.value.trim();

    if (!jdText || !resumeText) {
      setStatus('Paste both the job description and the resume before scoring.', 'error');
      return;
    }

    runButton.disabled = true;
    resultsSection.setAttribute('hidden', '');
    startProgress();

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, CONFIG.timeoutMs);

    fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'full_analysis', jd_text: jdText, resume_text: resumeText }),
      signal: controller.signal
    })
      .then(function (response) {
        return response.text().then(function (text) {
          var data;
          try { data = JSON.parse(text); } catch (e) { data = null; }
          if (!response.ok || !data || data.status === 'error') {
            var detail = data && data.errors ? data.errors.join(', ') : 'status ' + response.status;
            throw new Error('The pipeline returned an error (' + detail + ').');
          }
          return data;
        });
      })
      .then(function (data) {
        lastReport = data;
        renderResults(data);
        setStatus('Done.', 'ok');
      })
      .catch(function (err) {
        console.error(err);
        if (err.name === 'AbortError') {
          setStatus('The pipeline took longer than 2 minutes. Try again, or use shorter text.', 'error');
        } else if (err instanceof TypeError) {
          setStatus('Could not reach the pipeline. Check that the n8n workflow is published and that the webhook allows requests from this page (CORS).', 'error');
        } else {
          setStatus(err.message, 'error');
        }
      })
      .finally(function () {
        clearTimeout(timeout);
        stopProgress();
        runButton.disabled = false;
      });
  }

  function arr(v) { return Array.isArray(v) ? v : []; }

  function renderResults(data) {
    var gap = data.gap_analysis || {};
    var profile = data.resume_profile || {};
    var jd = data.jd_requirements || {};
    var coach = data.coaching || {};

    var score = Math.max(0, Math.min(100, Math.round(Number(gap.overall_match_pct) || 0)));
    var level = score >= 75 ? 'Strong match' : score >= 50 ? 'Moderate match' : 'Weak match';

    document.querySelector('#case-ref').textContent =
      (profile.name || 'Candidate') + ' → ' + (jd.job_title || 'this role') +
      (data.request_id ? '  ·  ' + data.request_id : '');

    document.querySelector('#score-number').innerHTML = score + '<small>/100</small>';
    var stampEl = document.querySelector('#stamp');
    stampEl.textContent = level;
    stampEl.className = 'stamp ' + levelClass(level);

    document.querySelector('#reasoning').textContent = gap.summary || 'No summary was returned.';

    var strengths = arr(gap.strengths).slice();
    arr(gap.matched).forEach(function (m) { if (m && m.requirement) strengths.push(m.requirement + ' (' + (m.strength || 'matched') + ')'); });
    var gaps = [];
    if (gap.experience_gap) gaps.push(gap.experience_gap);
    arr(gap.missing).forEach(function (m) { if (m && m.requirement) gaps.push(m.requirement + (m.severity ? ' — ' + m.severity + ' severity' : '')); });
    arr(gap.risks).forEach(function (r) { gaps.push(r); });

    fillList(document.querySelector('#strengths-list'), strengths, 'No standout strengths were flagged.');
    fillList(document.querySelector('#gaps-list'), gaps, 'No gaps were flagged.');

    var reqList = document.querySelector('#req-list');
    reqList.innerHTML = '';
    arr(gap.missing).forEach(function (m) { addReq(reqList, 'miss', 'missing', m.requirement, m.reason); });
    arr(gap.partial).forEach(function (m) { addReq(reqList, 'part', 'partial', m.requirement, [m.evidence, m.what_is_missing && 'Missing: ' + m.what_is_missing].filter(Boolean).join(' ')); });
    arr(gap.matched).forEach(function (m) { addReq(reqList, 'ok', 'matched', m.requirement, m.evidence); });
    if (!reqList.children.length) addReq(reqList, '', '', 'No requirements were returned.', '');

    document.querySelector('#coach-headline').textContent = coach.headline || 'Coaching plan';
    var actions = document.querySelector('#actions-list');
    actions.innerHTML = '';
    arr(coach.priority_actions).forEach(function (a) {
      var li = document.createElement('li');
      var strong = document.createElement('strong');
      strong.textContent = a.gap || 'Action';
      li.appendChild(strong);
      li.appendChild(document.createTextNode(' ' + (a.action || '')));
      if (a.timeframe) {
        var when = document.createElement('span');
        when.className = 'when';
        when.textContent = a.timeframe + (arr(a.resources).length ? ' · ' + arr(a.resources).join(', ') : '');
        li.appendChild(when);
      }
      actions.appendChild(li);
    });
    if (!actions.children.length) {
      var none = document.createElement('li');
      none.textContent = 'No actions were suggested.';
      actions.appendChild(none);
    }
    fillList(document.querySelector('#improve-list'), arr(coach.resume_improvements).map(function (x) { return (x.section ? x.section + ': ' : '') + (x.suggestion || ''); }), 'No resume changes suggested.');
    fillList(document.querySelector('#prep-list'), arr(coach.interview_prep), 'No interview prep returned.');

    resultsSection.removeAttribute('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addReq(listEl, cls, tag, title, note) {
    var li = document.createElement('li');
    li.className = 'req ' + cls;
    if (tag) {
      var t = document.createElement('span');
      t.className = 'tag';
      t.textContent = tag;
      li.appendChild(t);
    }
    var b = document.createElement('strong');
    b.textContent = title || '';
    li.appendChild(b);
    if (note) {
      var n = document.createElement('span');
      n.className = 'note';
      n.textContent = note;
      li.appendChild(n);
    }
    listEl.appendChild(li);
  }

  function fillList(listEl, items, emptyText) {
    listEl.innerHTML = '';
    if (items.length === 0) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = emptyText;
      listEl.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      listEl.appendChild(li);
    });
  }

  function levelClass(level) {
    var normalized = String(level).toLowerCase();
    if (normalized.indexOf('strong') !== -1) return 'level-strong';
    if (normalized.indexOf('moderate') !== -1) return 'level-moderate';
    return 'level-weak';
  }
})();
