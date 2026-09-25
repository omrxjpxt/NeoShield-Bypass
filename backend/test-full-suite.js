const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function testFullSuite() {
  console.log('====================================================');
  console.log('🧪 Testing Full 6-Question Mock Exam Workflow');
  console.log('====================================================');

  const pageRes = await fetch('http://localhost:3000/mock-test');
  const pageHtml = await pageRes.text();

  const dom = new JSDOM(pageHtml, {
    url: 'http://localhost:3000/mock-test',
    runScripts: 'dangerously'
  });

  const { window } = dom;
  const { document } = window;

  const mockTestJs = fs.readFileSync(path.join(__dirname, 'mock-test/mock-test.js'), 'utf-8');
  window.eval(mockTestJs);

  for (let qIndex = 1; qIndex <= 6; qIndex++) {
    console.log(`\n--- Processing Question ${qIndex} of 6 ---`);

    const qTextEl = document.getElementById('mock-question-text');
    const typeEl = document.getElementById('mock-question-type');
    const codeEl = document.getElementById('mock-question-code');
    const submitBtn = document.getElementById('mock-submit-btn');
    const nextBtn = document.getElementById('mock-next-btn');
    const gradeResultEl = document.getElementById('mock-grade-result');
    const progressBadge = document.getElementById('mock-progress-badge');

    const question = qTextEl.textContent.trim();
    const typeRaw = typeEl.textContent.trim().toLowerCase();
    const type = typeRaw.includes('coding') || typeRaw.includes('code') ? 'code' : (typeRaw.includes('text') ? 'text' : 'mcq');
    const code = codeEl && codeEl.textContent.trim().length > 0 ? codeEl.textContent.trim() : null;

    let options = [];
    if (type === 'mcq') {
      const optionLabels = document.querySelectorAll('#mock-options-container .mock-option-label');
      optionLabels.forEach(lbl => options.push(lbl.textContent.trim()));
    }

    console.log(`[Q${qIndex}] Type: ${type}, Question: "${question.substring(0, 50)}..."`);

    // Call /solve
    const solveRes = await fetch('http://localhost:3000/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, type, options, code })
    });

    if (!solveRes.ok) {
      throw new Error(`Solve failed for Q${qIndex}: status ${solveRes.status}`);
    }

    const answerData = await solveRes.json();
    console.log(`[Q${qIndex}] Answer received:`, answerData.answerIndex !== undefined ? `Option ${answerData.answerIndex}` : `Code snippet (${answerData.answer.length} chars)`);

    // Populate Answer
    if (type === 'mcq') {
      const idx = answerData.answerIndex;
      const targetRadio = document.querySelector(`input[name="mock-option"][value="${idx}"]`);
      const targetOption = document.querySelector(`.mock-option[data-index="${idx}"]`);
      if (!targetRadio || !targetOption) throw new Error(`Missing option ${idx} in DOM`);
      targetRadio.checked = true;
      targetRadio.dispatchEvent(new window.Event('change', { bubbles: true }));
      targetOption.click();
    } else {
      const textArea = document.getElementById('mock-text-answer');
      if (!textArea) throw new Error('Missing #mock-text-answer');
      textArea.value = answerData.answer;
      textArea.dispatchEvent(new window.Event('input', { bubbles: true }));
      textArea.dispatchEvent(new window.Event('change', { bubbles: true }));
    }

    // Submit
    submitBtn.click();

    // Await grader
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timeout on Q${qIndex} grading`)), 2000);
      const observer = new window.MutationObserver(() => {
        const verdict = gradeResultEl.getAttribute('data-verdict');
        if (verdict === 'correct' || verdict === 'incorrect') {
          clearTimeout(timeout);
          observer.disconnect();
          resolve(verdict);
        }
      });
      observer.observe(gradeResultEl, { attributes: true, attributeFilter: ['data-verdict', 'class'] });
    }).then(verdict => {
      console.log(`[Q${qIndex}] Grader Verdict: ${verdict.toUpperCase()}`);
      if (verdict !== 'correct') throw new Error(`Q${qIndex} was marked incorrect!`);
    });

    console.log(`[Q${qIndex}] Progress updated to: ${progressBadge.textContent}`);

    // Next
    if (qIndex < 6) {
      nextBtn.click();
    } else {
      nextBtn.click(); // Triggers completion
      const compCard = document.getElementById('mock-completion-card');
      const isComplete = !compCard.classList.contains('hidden');
      console.log(`[Finish] Completion card visible: ${isComplete}`);
      const summary = document.getElementById('mock-completion-summary').textContent.trim();
      console.log(`[Finish] Completion Summary: ${summary}`);
      if (!isComplete || !summary.includes('6/6')) {
        throw new Error('Test completion state not achieved!');
      }
    }
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 6/6 QUESTIONS SOLVED & VALIDATED PERFECTLY!');
  console.log('====================================================');
}

testFullSuite().catch(err => {
  console.error('\n❌ FULL SUITE FAILED:', err.message);
  process.exit(1);
});
