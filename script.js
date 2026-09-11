// HireSmartly — scorer form
//
// Calls the 04-Master-Orchestrator webhook, which internally runs the
// JD parser, resume parser, and match scorer, then returns one JSON
// object with the score.

var CONFIG = {
  webhookUrl: 'https://tupeai.app.n8n.cloud/webhook-test/master-pipeline'
};

(function () {
  var form = document.querySelector('#scorer-form');
  if (!form) return; // this script also loads on pages without the form

  var jdField = document.querySelector('#jd-text');
  var resumeField = document.querySelector('#resume-text');
  var runButton = document.querySelector('#run-button');
  var statusLine = document.querySelector('#status-line');
  var resultsSection = document.querySelector('#results');

  var scoreNumberEl = document.querySelector('#score-number');
  var stampEl = document.querySelector('#stamp');
  var reasoningEl = document.querySelector('#reasoning');
  var strengthsEl = document.querySelector('#strengths-list');
  var gapsEl = document.querySelector('#gaps-list');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    runScore();
  });

  function setStatus(text, state) {
    statusLine.textContent = text;
    if (state) {
      statusLine.setAttribute('data-state', state);
    } else {
      statusLine.removeAttribute('data-state');
    }
  }

  function runScore() {
    var jdText = jdField.value.trim();
    var resumeText = resumeField.value.trim();

    if (!jdText || !resumeText) {
      setStatus('Paste both the job description and the resume before scoring.', 'error');
      return;
    }

    runButton.disabled = true;
    setStatus('Reading the job description and the resume…');
    resultsSection.setAttribute('hidden', '');

    fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd_text: jdText, resume_text: resumeText })
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('The pipeline returned an error (status ' + response.status + ').');
        }
        return response.json();
      })
      .then(function (data) {
        renderResults(data);
        setStatus('Done.', 'ok');
      })
      .catch(function (err) {
        console.error(err);
        setStatus(
          'Could not reach the scoring pipeline. Check that all four n8n workflows are active, ' +
            'and that the webhook allows requests from this page.',
          'error'
        );
      })
      .finally(function () {
        runButton.disabled = false;
      });
  }

  function renderResults(data) {
    var score = typeof data.match_score === 'number' ? data.match_score : 0;
    var level = data.match_level || 'Unknown';
    var reasoning = data.reasoning || 'No reasoning was returned.';
    var strengths = Array.isArray(data.strengths) ? data.strengths : [];
    var gaps = Array.isArray(data.gaps) ? data.gaps : [];

    scoreNumberEl.innerHTML = score + '<small>/100</small>';

    stampEl.textContent = level;
    stampEl.className = 'stamp ' + levelClass(level);

    reasoningEl.textContent = reasoning;

    fillList(strengthsEl, strengths, 'No standout strengths were flagged.');
    fillList(gapsEl, gaps, 'No gaps were flagged.');

    resultsSection.removeAttribute('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    if (normalized.indexOf('moderate') !== -1 || normalized.indexOf('partial') !== -1) return 'level-moderate';
    return 'level-weak';
  }
})();
