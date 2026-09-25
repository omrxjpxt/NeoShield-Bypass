const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function runE2ETest() {
  console.log('====================================================');
  console.log('🧪 Starting End-to-End Local Mock Environment Test');
  console.log('====================================================');

  // Step 1: Health Check
  console.log('\n[Layer 1: Backend Health Check]');
  const healthRes = await fetch('http://localhost:3000/health');
  if (!healthRes.ok) throw new Error(`Backend not healthy: ${healthRes.status}`);
  const health = await healthRes.json();
  console.log('✅ Backend Health Status:', health.status);
  console.log('✅ Active Provider:', health.provider);
  console.log('✅ Key Configured:', health.configured);
  console.log('✅ Active Model:', health.model);

  // Step 2: Load DOM from http://localhost:3000/mock-test
  console.log('\n[Layer 2: Mock Test DOM Inspection]');
  const pageRes = await fetch('http://localhost:3000/mock-test');
  const pageHtml = await pageRes.text();

  const dom = new JSDOM(pageHtml, {
    url: 'http://localhost:3000/mock-test',
    runScripts: 'dangerously',
    resources: 'usable'
  });

  const { window } = dom;
  const { document } = window;

  // Load and execute mock-test.js in the DOM context
  const mockTestJs = fs.readFileSync(path.join(__dirname, 'mock-test/mock-test.js'), 'utf-8');
  window.eval(mockTestJs);

  console.log('DOM Environment Loaded.');

  // Validate selectors against requirements
  const selectors = {
    questionText: document.getElementById('mock-question-text'),
    questionType: document.getElementById('mock-question-type'),
    optionsContainer: document.getElementById('mock-options-container'),
    answerInput: document.getElementById('mock-text-answer'),
    submitBtn: document.getElementById('mock-submit-btn'),
    gradeResult: document.getElementById('mock-grade-result'),
    nextBtn: document.getElementById('mock-next-btn'),
    progressBadge: document.getElementById('mock-progress-badge')
  };

  for (const [name, el] of Object.entries(selectors)) {
    if (!el) {
      throw new Error(`❌ Missing expected selector in DOM: ${name}`);
    }
    console.log(`✅ Selector verified: ${name} ->`, el.tagName, el.id);
  }

  // Step 3: Question Extraction (Question 1)
  console.log('\n[Layer 3: DOM Extraction - Question 1]');
  const qText = selectors.questionText.textContent.trim();
  const qType = selectors.questionType.textContent.trim().toLowerCase();
  const optionLabels = Array.from(document.querySelectorAll('#mock-options-container .mock-option-label')).map(el => el.textContent.trim());

  console.log('Extracted Question Text:', qText);
  console.log('Extracted Question Type:', qType);
  console.log('Extracted Options Count:', optionLabels.length);
  console.log('Options:', optionLabels);

  if (!qText.includes('Binary Search Tree')) {
    throw new Error('Question 1 text mismatch!');
  }
  if (optionLabels.length !== 4) {
    throw new Error(`Expected 4 options, found ${optionLabels.length}`);
  }

  // Step 4: Extension Messaging & Backend /solve
  console.log('\n[Layer 4: Extension Messaging & Backend /solve]');
  const solvePayload = {
    question: qText,
    type: qType,
    options: optionLabels
  };

  const solveRes = await fetch('http://localhost:3000/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(solvePayload)
  });

  if (!solveRes.ok) {
    throw new Error(`Backend /solve failed with status ${solveRes.status}`);
  }

  const structuredAnswer = await solveRes.json();
  console.log('✅ Structured Answer received from backend:');
  console.log('   answerIndex:', structuredAnswer.answerIndex);
  console.log('   confidence:', structuredAnswer.confidence);
  console.log('   explanation:', structuredAnswer.explanation);
  if (structuredAnswer.fallbackUsed) {
    console.log('   notice:', structuredAnswer.providerNotice);
  }

  if (typeof structuredAnswer.answerIndex !== 'number') {
    throw new Error('Malformed answerIndex in response!');
  }

  // Step 5: Answer Population into DOM
  console.log('\n[Layer 5: Answer Population]');
  const targetIndex = structuredAnswer.answerIndex;
  const targetOption = document.querySelector(`.mock-option[data-index="${targetIndex}"]`);
  const targetRadio = document.querySelector(`input[name="mock-option"][value="${targetIndex}"]`);

  if (!targetOption || !targetRadio) {
    throw new Error(`Could not find radio option element for index ${targetIndex}`);
  }

  targetRadio.checked = true;
  targetRadio.dispatchEvent(new window.Event('change', { bubbles: true }));
  targetOption.click();

  console.log(`✅ Selected option ${targetIndex} ("${optionLabels[targetIndex]}") in DOM.`);
  console.log('Radio is checked:', targetRadio.checked);
  console.log('Option element classes:', targetOption.className);

  // Step 6: Submission to Grader
  console.log('\n[Layer 6: Submission to Mock Grader]');
  const initialVerdict = selectors.gradeResult.getAttribute('data-verdict');
  console.log('Initial Grader Verdict:', initialVerdict);

  selectors.submitBtn.click();
  console.log('Submit button clicked.');

  const gradingVerdict = selectors.gradeResult.getAttribute('data-verdict');
  console.log('Immediate Verdict after submit:', gradingVerdict, `("${selectors.gradeResult.textContent}")`);

  // Step 7: Await Grader Verdict (Deterministic delay 400ms)
  console.log('\n[Layer 7: Grader Observation via Mutation]');
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Grader observation timed out after 3000ms'));
    }, 3000);

    const observer = new window.MutationObserver(() => {
      const verdict = selectors.gradeResult.getAttribute('data-verdict');
      const text = selectors.gradeResult.textContent;
      if (verdict === 'correct' || verdict === 'incorrect') {
        clearTimeout(timeout);
        observer.disconnect();
        resolve({ verdict, text });
      }
    });

    observer.observe(selectors.gradeResult, {
      attributes: true,
      attributeFilter: ['data-verdict', 'class'],
      childList: true,
      characterData: true,
      subtree: true
    });
  }).then(res => {
    console.log(`✅ Grader evaluated successfully!`);
    console.log(`   Final Verdict: "${res.verdict}"`);
    console.log(`   Message: "${res.text}"`);
    if (res.verdict !== 'correct') {
      throw new Error(`Expected verdict "correct", got "${res.verdict}"`);
    }
  });

  // Step 8: Confirm Progress Update
  console.log('\n[Layer 8: Progress Counter]');
  const progressText = selectors.progressBadge.textContent;
  console.log('Progress badge after Question 1:', progressText);
  if (progressText !== '1/6') {
    throw new Error(`Expected progress 1/6, got ${progressText}`);
  }
  console.log('✅ Progress successfully updated to 1/6.');

  // Step 9: Confirm Next Question Transition
  console.log('\n[Layer 9: Next Question Transition]');
  console.log('Next button disabled state before click:', selectors.nextBtn.disabled);
  if (selectors.nextBtn.disabled) {
    throw new Error('Next button is disabled after correct answer!');
  }

  selectors.nextBtn.click();

  const nextQText = selectors.questionText.textContent.trim();
  const nextCounter = document.getElementById('mock-question-counter').textContent.trim();
  console.log('✅ Transitioned to next question!');
  console.log('   New Counter:', nextCounter);
  console.log('   New Question:', nextQText);

  if (!nextCounter.includes('Question 2 of 6')) {
    throw new Error(`Expected Question 2 of 6, got ${nextCounter}`);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 9 LAYERS VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

runE2ETest().catch(err => {
  console.error('\n❌ TEST FAILED AT LAYER:', err.message);
  process.exit(1);
});
