// Check if the chrome object is available (for compatibility)
if (typeof chrome === "undefined") {
  // Handle the case where chrome is not defined (like in Firefox)
}

// Always inject mock_code.js interceptor to handle extension detection (even when not logged in)
(function injectMockCode() {
  const mockScript = document.createElement('script');
  mockScript.src = chrome.runtime.getURL('data/inject/mock_code.js');
  mockScript.onload = function () {
      console.log('✅ Mock code interceptor loaded');
      this.remove(); // Clean up after execution
  };
  mockScript.onerror = function() {
      console.error('❌ Failed to load mock code interceptor');
  };
  // Inject as early as possible
  (document.head || document.documentElement).prepend(mockScript);
})();

// Inject exam.js (no login required)
const script = document.createElement('script');
script.src = chrome.runtime.getURL('data/inject/exam.js');
(document.head || document.documentElement).appendChild(script);

// Login prompt and status sync removed - extension features now available to all users

// Function removed - login check no longer required for extension features

// Neo Browser Download Link - Updated
const neoBrowserDownloadLink = "https://freeneopass.vercel.app";

// Function to add our NeoPass button left of the existing Neo Browser button
function replaceNeoBrowserButton() {
  const neoButton = document.querySelector('button#neobrowser');

  if (neoButton && !neoButton.dataset.replaced) {
    // Create custom styled button/link
    const ourBtn = document.createElement('a');
    ourBtn.innerHTML = `
      <div class="container jcc btn-align">
        <div class="t-whitespace-nowrap ng-star-inserted">
          <span>Download NeoPass Launcher</span>
        </div>
      </div>
    `;
    ourBtn.href = neoBrowserDownloadLink;
    ourBtn.target = "_blank";
    ourBtn.className = neoButton.className;
    ourBtn.id = "neopass-browser-btn";
    ourBtn.tabIndex = 0;

    // Apply gradient styling
    ourBtn.style.cssText = `
      position: relative !important;
      display: inline-flex !important;
      padding: 8px 16px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      color: white !important;
      background-color: black !important;
      border-radius: 8px !important;
      text-align: center !important;
      text-decoration: none !important;
      cursor: pointer !important;
      z-index: 1 !important;
      border: 2px solid transparent !important;
      transition: all 0.3s ease !important;
    `;

    // Create gradient border effect
    const beforeStyle = document.createElement('style');
    beforeStyle.textContent = `
      a#neopass-browser-btn {
        position: relative !important;
        background: linear-gradient(black, black) padding-box,
                    linear-gradient(45deg, #3b82f6, #8b5cf6, #ec4899) border-box !important;
        border: 2px solid transparent !important;
      }
      a#neopass-browser-btn:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.6) !important;
      }
    `;
    if (!document.querySelector('style[data-neobrowser-style]')) {
      beforeStyle.setAttribute('data-neobrowser-style', 'true');
      document.head.appendChild(beforeStyle);
    }

    // Insert our button to the left of the existing button
    neoButton.parentNode.insertBefore(ourBtn, neoButton);

    // Make the parent (app-button) a flex row so both buttons sit side by side
    neoButton.parentNode.style.cssText += `
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 8px !important;
    `;

    neoButton.dataset.replaced = "true";

    console.log('✅ NeoPass NeoBrowser button added left of existing Neo Browser button');
  }
}

// Observer to detect Neo Browser button and add our button
const buttonObserver = new MutationObserver((mutations) => {
  replaceNeoBrowserButton();
});

// Start observing for button changes
buttonObserver.observe(document.body, { 
  childList: true, 
  subtree: true 
});

// Initial check for Neo Browser button (in case already loaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', replaceNeoBrowserButton);
} else {
  replaceNeoBrowserButton();
}

// Listen for window messages
window.addEventListener("message", function(event) {
  // Only process messages that:
  // 1. Come from the same window
  // 2. Are targeted for the extension
  if (event.data.target === "extension") {
      // Forward the message to the extension's background script
      chrome.runtime.sendMessage(event.data.message, response => {
          // Send the response back to the window
          window.postMessage({
              source: "extension",
              response: response
          }, "*");
      });
  }
});

window.addEventListener("message", function (event) {

  if (event.source === window && event.data.target === "extension") {

    browser.runtime.sendMessage(event.data.message, (response) => {

      window.postMessage({ source: "extension", response: response }, "*");
    });
  }
});

// Listen for the 'beforeunload' event to remove any injected elements
window.addEventListener("beforeunload", removeInjectedElement);

// Function to send a message to the website
function sendMessageToWebsite(messageData) {
  removeInjectedElement(); // Clean up any previous injected elements

  // Create a new span element with a unique ID
  const injectedElement = document.createElement("span");
  injectedElement.id = "x-template-base-" + messageData.currentKey; // Set a unique ID based on currentKey

  // Append the new element to the document body
  document.body.appendChild(injectedElement);
  console.log("message", messageData); // Log the message data

  // Send the message to the website
  window.postMessage(0, messageData.url); // 0 is the targetOrigin, meaning the same origin
}

// Function to remove injected elements from the DOM
function removeInjectedElement() {
  const injectedElement = document.querySelector("[id^='x-template-base-']"); // Select elements with ID starting with "x-template-base-"
  if (injectedElement) {
      injectedElement.remove(); // Remove the element if it exists
  }
}

/* ==========================================================================
   LOCAL MOCK TEST AUTOMATION ENGINE (Development Sandbox Only)
   ========================================================================== */
(function initLocalMockTestAutomation() {
  'use strict';

  // Verification: runs in local mock test environment or on piet576.examly.io
  function isMockTestPage() {
    const isLocalHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const isMockPath = window.location.pathname.includes('mock-test');
    const isPietExamly = window.location.hostname.includes('piet576.examly.io');
    const hasMockDOM = Boolean(document.querySelector('[data-mock-test-environment="true"]'));
    return (isLocalHost && isMockPath) || isPietExamly || hasMockDOM;
  }

  // If this is not the local mock test page, do not initialize
  if (!isMockTestPage()) {
    return;
  }

  console.log('🧪 [NeoPass Mock Automation] Local mock test environment detected. Initializing engine...');

  const STATES = {
    IDLE: 'IDLE',
    QUESTION_DETECTED: 'QUESTION_DETECTED',
    SOLVING: 'SOLVING',
    ANSWER_RECEIVED: 'ANSWER_RECEIVED',
    ANSWER_FILLED: 'ANSWER_FILLED',
    SUBMITTED: 'SUBMITTED',
    WAITING_FOR_RESULT: 'WAITING_FOR_RESULT',
    CORRECT: 'CORRECT',
    NEXT_QUESTION: 'NEXT_QUESTION',
    INCORRECT: 'INCORRECT',
    STOPPED: 'STOPPED',
    COMPLETED: 'COMPLETED'
  };

  let currentState = STATES.IDLE;
  let isRunning = false;
  let activeObserver = null;
  let activeTimeout = null;
  let iterationCounter = 0;
  const MAX_ALLOWED_ITERATIONS = 12; // Safety guard against infinite loops

  // -------------------------------------------------------------
  // HUD (Heads-Up Display) Overlay for Monitoring and User Control
  // -------------------------------------------------------------
  let hudContainer = null;
  let hudStateBadge = null;
  let hudActionText = null;
  let hudStartBtn = null;
  let hudKillBtn = null;
  let hudCloseBtn = null;

  function injectHUD() {
    hudContainer = document.getElementById('neopass-mock-hud');
    if (hudContainer) {
      hudContainer.style.display = 'block';
      return;
    }

    hudContainer = document.createElement('div');
    hudContainer.id = 'neopass-mock-hud';
    hudContainer.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: 320px;
      background: rgba(13, 17, 23, 0.95);
      border: 1px solid #30363d;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      color: #c9d1d9;
      backdrop-filter: blur(8px);
      box-sizing: border-box;
    `;

    hudContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-weight:700; font-size:0.85rem; color:#58a6ff; display:flex; align-items:center; gap:6px;">
          ⚡ NeoPass Practice Assistant
        </span>
        <div style="display:flex; align-items:center; gap:6px;">
          <span id="neopass-hud-state" style="
            font-size:0.7rem;
            font-weight:700;
            padding:2px 8px;
            border-radius:4px;
            background:#21262d;
            color:#8b949e;
            border:1px solid #30363d;
          ">IDLE</span>
          <button id="neopass-hud-close-btn" title="Close" style="
            background:none;
            border:none;
            color:#8b949e;
            font-size:14px;
            cursor:pointer;
            padding:2px 5px;
            line-height:1;
            border-radius:4px;
          ">✕</button>
        </div>
      </div>

      <div id="neopass-hud-action" style="
        font-size:0.8rem;
        line-height:1.4;
        background:#161b22;
        padding:8px 10px;
        border-radius:6px;
        margin-bottom:12px;
        min-height:38px;
        color:#e6edf3;
        border:1px solid #21262d;
      ">
        Press <strong>⌘G</strong> (or Ctrl+G) to analyze and fill the current practice question.
      </div>

      <div style="display:flex; gap:8px;">
        <button id="neopass-hud-start-btn" style="
          flex:1;
          padding:6px 10px;
          font-size:0.75rem;
          font-weight:600;
          background:#238636;
          color:#fff;
          border:1px solid rgba(255,255,255,0.1);
          border-radius:6px;
          cursor:pointer;
        ">Run (⌘G)</button>
        <button id="neopass-hud-kill-btn" style="
          padding:6px 12px;
          font-size:0.75rem;
          font-weight:600;
          background:#da3633;
          color:#fff;
          border:1px solid rgba(255,255,255,0.1);
          border-radius:6px;
          cursor:pointer;
        ">Kill / Stop</button>
      </div>
    `;

    document.body.appendChild(hudContainer);

    hudStateBadge = document.getElementById('neopass-hud-state');
    hudActionText = document.getElementById('neopass-hud-action');
    hudStartBtn = document.getElementById('neopass-hud-start-btn');
    hudKillBtn = document.getElementById('neopass-hud-kill-btn');
    hudCloseBtn = document.getElementById('neopass-hud-close-btn');

    hudStartBtn.addEventListener('click', () => {
      startAutomation();
    });

    hudKillBtn.addEventListener('click', () => {
      abortAutomation('Aborted via Kill button.');
    });

    if (hudCloseBtn) {
      hudCloseBtn.addEventListener('click', () => {
        abortAutomation('Closed by user.');
      });
    }
  }

  function hideHUD() {
    const el = document.getElementById('neopass-mock-hud');
    if (el) {
      el.remove();
      hudContainer = null;
      hudStateBadge = null;
      hudActionText = null;
      hudStartBtn = null;
      hudKillBtn = null;
      hudCloseBtn = null;
    }
  }

  function transitionTo(newState, message) {
    currentState = newState;
    console.log(`🤖 [Mock State Machine] -> ${newState} | ${message || ''}`);

    if (hudStateBadge) {
      hudStateBadge.textContent = newState;

      const stateColors = {
        [STATES.IDLE]: { bg: '#21262d', color: '#8b949e', border: '#30363d' },
        [STATES.QUESTION_DETECTED]: { bg: 'rgba(56, 139, 253, 0.15)', color: '#58a6ff', border: '#1f6feb' },
        [STATES.SOLVING]: { bg: 'rgba(210, 153, 34, 0.15)', color: '#e3b341', border: '#d29922' },
        [STATES.ANSWER_RECEIVED]: { bg: 'rgba(163, 113, 247, 0.15)', color: '#bc8cff', border: '#8957e5' },
        [STATES.ANSWER_FILLED]: { bg: 'rgba(56, 139, 253, 0.15)', color: '#58a6ff', border: '#1f6feb' },
        [STATES.SUBMITTED]: { bg: 'rgba(210, 153, 34, 0.15)', color: '#e3b341', border: '#d29922' },
        [STATES.WAITING_FOR_RESULT]: { bg: 'rgba(210, 153, 34, 0.15)', color: '#e3b341', border: '#d29922' },
        [STATES.CORRECT]: { bg: 'rgba(46, 160, 67, 0.15)', color: '#3fb950', border: '#238636' },
        [STATES.NEXT_QUESTION]: { bg: 'rgba(56, 139, 253, 0.15)', color: '#58a6ff', border: '#1f6feb' },
        [STATES.INCORRECT]: { bg: 'rgba(248, 81, 73, 0.15)', color: '#f85149', border: '#da3633' },
        [STATES.STOPPED]: { bg: 'rgba(248, 81, 73, 0.15)', color: '#f85149', border: '#da3633' },
        [STATES.COMPLETED]: { bg: 'rgba(46, 160, 67, 0.25)', color: '#56d364', border: '#238636' }
      };

      const style = stateColors[newState] || stateColors[STATES.IDLE];
      hudStateBadge.style.backgroundColor = style.bg;
      hudStateBadge.style.color = style.color;
      hudStateBadge.style.borderColor = style.border;
    }

    if (hudActionText && message) {
      hudActionText.textContent = message;
    }
  }

  function cleanupWatchers() {
    if (activeObserver) {
      activeObserver.disconnect();
      activeObserver = null;
    }
    if (activeTimeout) {
      clearTimeout(activeTimeout);
      activeTimeout = null;
    }
  }

  function abortAutomation(reason) {
    cleanupWatchers();
    isRunning = false;
    transitionTo(STATES.STOPPED, reason || 'Automation terminated.');
    if (hudStartBtn) hudStartBtn.disabled = false;
    hideHUD();
  }

  // -------------------------------------------------------------
  // Step 1: Detect & Extract Current Question from DOM
  // -------------------------------------------------------------
  function extractCurrentQuestion() {
    // Check if test completed card is active
    const completionCard = document.getElementById('mock-completion-card');
    if (completionCard && !completionCard.classList.contains('hidden')) {
      return { isComplete: true };
    }

    const questionTextEl = document.getElementById('mock-question-text');
    if (!questionTextEl) return null;

    const questionText = questionTextEl.textContent.trim();
    if (!questionText || questionText === 'Loading question...') return null;

    const typeEl = document.getElementById('mock-question-type');
    const typeRaw = typeEl ? typeEl.textContent.trim().toLowerCase() : 'mcq';
    const type = typeRaw.includes('coding') || typeRaw.includes('code') ? 'code' : (typeRaw.includes('text') ? 'text' : 'mcq');

    const codeEl = document.getElementById('mock-question-code');
    const code = (codeEl && codeEl.textContent.trim().length > 0) ? codeEl.textContent.trim() : null;

    let options = [];
    if (type === 'mcq') {
      const optionLabels = document.querySelectorAll('#mock-options-container .mock-option-label');
      optionLabels.forEach(lbl => options.push(lbl.textContent.trim()));
    }

    const counterEl = document.getElementById('mock-question-counter');
    const counterText = counterEl ? counterEl.textContent.trim() : '';

    return {
      isComplete: false,
      counter: counterText,
      question: questionText,
      code: code,
      type: type,
      options: options
    };
  }

  // -------------------------------------------------------------
  // Step 2: Practice Assistant Execution Cycle
  // -------------------------------------------------------------
  async function executeCycle() {
    if (!isRunning) return;

    iterationCounter++;
    if (iterationCounter > MAX_ALLOWED_ITERATIONS) {
      abortAutomation('Infinite loop guard: maximum iterations exceeded.');
      return;
    }

    // Step A: Question Detection
    transitionTo(STATES.QUESTION_DETECTED, 'Detecting question and extracting metadata from DOM...');
    await new Promise(r => setTimeout(r, 200));

    const qData = extractCurrentQuestion();
    if (!qData) {
      abortAutomation('Failed to detect mock question elements in DOM.');
      return;
    }

    if (qData.isComplete) {
      transitionTo(STATES.COMPLETED, '🎉 Mock test complete! All questions finished.');
      isRunning = false;
      if (hudStartBtn) hudStartBtn.disabled = false;
      return;
    }

    console.log('[MockAutomation] Extracted question:', qData);
    transitionTo(STATES.SOLVING, `Sending ${qData.type.toUpperCase()} question to backend AI service...`);

    // Step B: Send to backend via service worker
    chrome.runtime.sendMessage({
      action: 'mockTestSolve',
      data: {
        question: qData.question,
        options: qData.options,
        code: qData.code,
        type: qData.type
      }
    }, async (response) => {
      if (!isRunning) return;

      if (!response || !response.success || !response.data) {
        const errorMsg = response?.error || 'No answer received from backend AI service.';
        abortAutomation(`Backend AI Failure: ${errorMsg}`);
        return;
      }

      const answerData = response.data;
      transitionTo(STATES.ANSWER_RECEIVED, `Answer received (Confidence: ${Math.round(answerData.confidence * 100)}%). Filling DOM...`);
      await new Promise(r => setTimeout(r, 250));

      // Step C: Fill Answer into Mock UI
      try {
        if (qData.type === 'mcq') {
          const idx = answerData.answerIndex;
          const targetOption = document.querySelector(`.mock-option[data-index="${idx}"]`);
          const targetRadio = document.querySelector(`input[name="mock-option"][value="${idx}"]`);

          if (!targetOption && !targetRadio) {
            abortAutomation(`Could not find radio option element for index ${idx}`);
            return;
          }

          if (targetRadio) {
            targetRadio.checked = true;
            targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (targetOption) {
            targetOption.click();
          }
        } else {
          // Text / Coding question
          const textArea = document.getElementById('mock-text-answer');
          if (!textArea) {
            abortAutomation('Could not find #mock-text-answer textarea element.');
            return;
          }
          textArea.value = answerData.answer;
          textArea.dispatchEvent(new Event('input', { bubbles: true }));
          textArea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch (domErr) {
        abortAutomation(`DOM Error while filling answer: ${domErr.message}`);
        return;
      }

      // Leave submission to the user. The assistant only fills the practice UI.
      transitionTo(STATES.ANSWER_FILLED, 'Answer filled. Review it, then press Submit manually.');

      // Wait for the user to submit before advancing to the next practice question.
      transitionTo(STATES.WAITING_FOR_RESULT, 'Waiting for your manual Submit...');

      const gradeResultEl = document.getElementById('mock-grade-result');
      if (!gradeResultEl) {
        abortAutomation('#mock-grade-result element not found.');
        return;
      }

      // Timeout safety for a user who leaves the question untouched.
      const graderTimeout = setTimeout(() => {
        cleanupWatchers();
        abortAutomation('Timeout: Mock grader did not respond within 6 seconds.');
      }, 6000);

      const observer = new MutationObserver((mutations) => {
        const verdict = gradeResultEl.getAttribute('data-verdict') || '';
        const className = gradeResultEl.className || '';

        // Continue waiting if still grading or idle
        if (verdict === 'grading' || verdict === 'idle' || className.includes('result-grading')) {
          return;
        }

        clearTimeout(graderTimeout);
        observer.disconnect();

        // Evaluate Verdict
        if (verdict === 'correct' || className.includes('result-correct')) {
          handleCorrectResult();
        } else if (verdict === 'incorrect' || className.includes('result-incorrect')) {
          handleIncorrectResult(gradeResultEl.textContent.trim());
        }
      });

      activeObserver = observer;
      activeTimeout = graderTimeout;

      observer.observe(gradeResultEl, {
        attributes: true,
        attributeFilter: ['class', 'data-verdict'],
        childList: true,
        subtree: true,
        characterData: true
      });
    });
  }

  // -------------------------------------------------------------
  // Step 3: Handle Result Branches (Correct vs Incorrect)
  // -------------------------------------------------------------
  async function handleCorrectResult() {
    if (!isRunning) return;

    transitionTo(STATES.CORRECT, 'Practice answer accepted. Advancing to the next question...');
    await new Promise(r => setTimeout(r, 600)); // UI transition delay

    // Check if test is completed (progress reached 6/6 or completion card)
    const progressEl = document.getElementById('mock-progress-badge');
    const isCompleted = progressEl && progressEl.textContent.includes('6/6');

    const nextBtn = document.getElementById('mock-next-btn');

    if (isCompleted || !nextBtn || nextBtn.classList.contains('hidden')) {
      // Check if completion card appeared
      const completionCard = document.getElementById('mock-completion-card');
      if (completionCard && !completionCard.classList.contains('hidden')) {
        transitionTo(STATES.COMPLETED, '🎉 6/6 Completed! Mock test finished with 100% score.');
        isRunning = false;
        if (hudStartBtn) hudStartBtn.disabled = false;
        return;
      }
    }

    transitionTo(STATES.NEXT_QUESTION, 'Advancing to next question...');
    
    // Store current question text before clicking next
    const currentQText = document.getElementById('mock-question-text')?.textContent;
    nextBtn.click();

    // Observe question change
    const questionCard = document.getElementById('mock-question-card');
    const completionCard = document.getElementById('mock-completion-card');

    if (completionCard && !completionCard.classList.contains('hidden')) {
      transitionTo(STATES.COMPLETED, '🎉 6/6 Completed! Mock test finished with 100% score.');
      isRunning = false;
      if (hudStartBtn) hudStartBtn.disabled = false;
      return;
    }

    // Wait briefly for new question DOM to mount
    let checks = 0;
    const checkInterval = setInterval(() => {
      checks++;
      const newCard = document.getElementById('mock-completion-card');
      if (newCard && !newCard.classList.contains('hidden')) {
        clearInterval(checkInterval);
        transitionTo(STATES.COMPLETED, '🎉 6/6 Completed! All test cases passed.');
        isRunning = false;
        if (hudStartBtn) hudStartBtn.disabled = false;
        return;
      }

      const newQText = document.getElementById('mock-question-text')?.textContent;
      if (newQText && newQText !== currentQText && newQText !== 'Loading question...') {
        clearInterval(checkInterval);
        // Loop to next question!
        executeCycle();
      } else if (checks > 20) {
        clearInterval(checkInterval);
        abortAutomation('Timed out waiting for next question to render.');
      }
    }, 150);
  }

  function handleIncorrectResult(errorDetail) {
    transitionTo(STATES.INCORRECT, `Evaluation Rejected: ${errorDetail}`);
    abortAutomation(`Stopped on incorrect answer: ${errorDetail}`);
  }

  // -------------------------------------------------------------
  // Start Automation (Called via ⌘G, UI Button, or Background)
  // -------------------------------------------------------------
  function startAutomation() {
    // Show HUD on-demand when automation is triggered
    injectHUD();

    if (isRunning) {
      console.log('⚠️ [MockAutomation] Automation already in progress. Ignoring duplicate trigger.');
      return;
    }

    // Reset iteration counter on fresh run
    iterationCounter = 0;
    isRunning = true;
    if (hudStartBtn) hudStartBtn.disabled = true;

    // Reset test if already completed
    const completionCard = document.getElementById('mock-completion-card');
    if (completionCard && !completionCard.classList.contains('hidden')) {
      const restartBtn = document.getElementById('mock-restart-btn');
      if (restartBtn) restartBtn.click();
    }

    // Handle Examly live portal execution
    if (window.location.hostname.includes('piet576.examly.io') && !document.getElementById('mock-question-text')) {
      console.log('⚡ [NeoPass Automation] Piet Examly detected. Triggering solveIamneoExamly()...');
      transitionTo(STATES.SOLVING, 'Analyzing Examly question...');
      if (typeof solveIamneoExamly === 'function') {
        solveIamneoExamly();
        setTimeout(() => {
          transitionTo(STATES.ANSWER_FILLED, 'Examly solver executed. Review and continue.');
          isRunning = false;
          if (hudStartBtn) hudStartBtn.disabled = false;
        }, 1500);
      } else {
        chrome.runtime.sendMessage({ action: 'solveIamneoExamly' });
        transitionTo(STATES.ANSWER_FILLED, 'Sent solve command to extension.');
        isRunning = false;
        if (hudStartBtn) hudStartBtn.disabled = false;
      }
      return;
    }

    console.log('🚀 [MockAutomation] Starting end-to-end test automation...');
    executeCycle();
  }

  // -------------------------------------------------------------
  // Listeners: ⌘G Keyboard Shortcut and Runtime Messages
  // -------------------------------------------------------------
  document.addEventListener('keydown', (event) => {
    // Only intercept when on the local mock test page
    if (!isMockTestPage()) return;

    // Check for Command+G (Mac) or Ctrl+G (Windows/Linux)
    const isCmdG = (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'g';

    if (isCmdG) {
      event.preventDefault();
      event.stopPropagation();
      console.log('⌨️ [MockAutomation] ⌘G shortcut intercepted on mock test page.');
      startAutomation();
    } else if (event.key === 'Escape') {
      if (isRunning || document.getElementById('neopass-mock-hud')) {
        event.preventDefault();
        abortAutomation('Stopped by user (Escape key).');
      }
    }
  });

  // Background message listener (for manifest command triggers)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'triggerMockTestSolve') {
      console.log('📨 [MockAutomation] Received trigger from background command.');
      startAutomation();
      sendResponse({ status: 'started' });
    }
  });

  // Note: HUD is on-demand now. It only appears when pressing ⌘G (Command+G / Ctrl+G)
  // and disappears when clicking Kill / Stop or Close.
})();
