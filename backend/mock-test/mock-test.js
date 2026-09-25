// Local Mock Test Suite and Deterministic Grader
const MOCK_QUESTIONS = [
  {
    id: 1,
    type: 'mcq',
    question: 'What is the worst-case time complexity of searching an element in a balanced Binary Search Tree (AVL tree)?',
    code: null,
    options: [
      'O(n)',
      'O(log n)',
      'O(n log n)',
      'O(1)'
    ],
    correctAnswerIndex: 1
  },
  {
    id: 2,
    type: 'mcq',
    question: 'Which of the following JavaScript methods creates a new array with all elements that pass the test implemented by the provided function?',
    code: null,
    options: [
      'Array.prototype.forEach()',
      'Array.prototype.map()',
      'Array.prototype.filter()',
      'Array.prototype.reduce()'
    ],
    correctAnswerIndex: 2
  },
  {
    id: 3,
    type: 'mcq',
    question: 'What is the output of the following JavaScript code when executed in standard non-strict mode?',
    code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 10);\n}`,
    options: [
      '3, 3, 3',
      '0, 1, 2',
      'undefined, undefined, undefined',
      'ReferenceError'
    ],
    correctAnswerIndex: 0
  },
  {
    id: 4,
    type: 'mcq',
    question: 'Which HTTP status code signifies "Too Many Requests" for rate limiting?',
    code: null,
    options: [
      '400 Bad Request',
      '403 Forbidden',
      '404 Not Found',
      '429 Too Many Requests'
    ],
    correctAnswerIndex: 3
  },
  {
    id: 5,
    type: 'text',
    question: 'Write a JavaScript function named reverseString that takes a string str and returns the reversed string.',
    code: '// Example usage:\n// reverseString("hello") -> "olleh"',
    validator: (code) => {
      try {
        const clean = code.trim();
        if (!clean.includes('reverseString')) return false;
        // Test in isolated function context
        const fn = new Function(`${clean}; return reverseString("hello");`);
        return fn() === "olleh";
      } catch (e) {
        return false;
      }
    }
  },
  {
    id: 6,
    type: 'code',
    question: 'Write a JavaScript function named isPalindrome that returns true if a given lowercase string s is a palindrome and false otherwise.',
    code: '// Example usage:\n// isPalindrome("racecar") -> true\n// isPalindrome("apple") -> false',
    validator: (code) => {
      try {
        const clean = code.trim();
        if (!clean.includes('isPalindrome')) return false;
        const fn = new Function(`${clean}; return isPalindrome("racecar") === true && isPalindrome("hello") === false;`);
        return fn();
      } catch (e) {
        return false;
      }
    }
  }
];

let currentQuestionIndex = 0;
let passedQuestions = 0;
let isGrading = false;

// DOM Elements
const questionCard = document.getElementById('mock-question-card');
const completionCard = document.getElementById('mock-completion-card');
const counterEl = document.getElementById('mock-question-counter');
const typeEl = document.getElementById('mock-question-type');
const textEl = document.getElementById('mock-question-text');
const codeBlockEl = document.getElementById('mock-question-code-block');
const codeEl = document.getElementById('mock-question-code');
const optionsContainer = document.getElementById('mock-options-container');
const textContainer = document.getElementById('mock-text-container');
const textAnswerEl = document.getElementById('mock-text-answer');
const gradeResultEl = document.getElementById('mock-grade-result');
const submitBtn = document.getElementById('mock-submit-btn');
const nextBtn = document.getElementById('mock-next-btn');
const resetBtn = document.getElementById('mock-reset-btn');
const restartBtn = document.getElementById('mock-restart-btn');
const progressBadge = document.getElementById('mock-progress-badge');
const progressBarFill = document.getElementById('mock-progress-bar-fill');
const completionSummary = document.getElementById('mock-completion-summary');

function updateProgress() {
  const total = MOCK_QUESTIONS.length;
  progressBadge.textContent = `${passedQuestions}/${total}`;
  const pct = Math.round((passedQuestions / total) * 100);
  progressBarFill.style.width = `${pct}%`;
}

function renderCurrentQuestion() {
  const q = MOCK_QUESTIONS[currentQuestionIndex];
  const total = MOCK_QUESTIONS.length;

  counterEl.textContent = `Question ${currentQuestionIndex + 1} of ${total}`;
  typeEl.textContent = q.type.toUpperCase();
  textEl.textContent = q.question;

  if (q.code) {
    codeBlockEl.classList.remove('hidden');
    codeEl.textContent = q.code;
  } else {
    codeBlockEl.classList.add('hidden');
    codeEl.textContent = '';
  }

  // Reset inputs and grader state
  gradeResultEl.className = 'result-idle';
  gradeResultEl.setAttribute('data-verdict', 'idle');
  gradeResultEl.textContent = 'Awaiting submission...';
  submitBtn.disabled = false;
  nextBtn.disabled = true;

  if (q.type === 'mcq') {
    textContainer.classList.add('hidden');
    optionsContainer.classList.remove('hidden');
    optionsContainer.innerHTML = '';

    q.options.forEach((optText, index) => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'mock-option';
      optionDiv.setAttribute('data-index', String(index));

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'mock-option';
      radio.value = String(index);
      radio.id = `mock-opt-${index}`;

      const label = document.createElement('label');
      label.className = 'mock-option-label';
      label.htmlFor = `mock-opt-${index}`;
      label.textContent = optText;

      optionDiv.appendChild(radio);
      optionDiv.appendChild(label);

      optionDiv.addEventListener('click', (e) => {
        if (submitBtn.disabled) return;
        radio.checked = true;
        document.querySelectorAll('.mock-option').forEach(el => el.classList.remove('selected'));
        optionDiv.classList.add('selected');
      });

      optionsContainer.appendChild(optionDiv);
    });
  } else {
    optionsContainer.classList.add('hidden');
    textContainer.classList.remove('hidden');
    textAnswerEl.value = '';
    textAnswerEl.disabled = false;
  }
}

function gradeSubmission() {
  if (isGrading) return;
  const q = MOCK_QUESTIONS[currentQuestionIndex];

  let isCorrect = false;

  if (q.type === 'mcq') {
    const selectedRadio = document.querySelector('input[name="mock-option"]:checked');
    if (!selectedRadio) {
      gradeResultEl.className = 'result-incorrect';
      gradeResultEl.setAttribute('data-verdict', 'incorrect');
      gradeResultEl.textContent = 'Please select an option before submitting.';
      return;
    }
    const selectedIndex = parseInt(selectedRadio.value, 10);
    isCorrect = selectedIndex === q.correctAnswerIndex;
  } else {
    const userCode = textAnswerEl.value;
    if (!userCode.trim()) {
      gradeResultEl.className = 'result-incorrect';
      gradeResultEl.setAttribute('data-verdict', 'incorrect');
      gradeResultEl.textContent = 'Please write your answer before submitting.';
      return;
    }
    isCorrect = q.validator(userCode);
  }

  isGrading = true;
  submitBtn.disabled = true;
  if (textAnswerEl) textAnswerEl.disabled = true;

  // Set grading in-progress state
  gradeResultEl.className = 'result-grading';
  gradeResultEl.setAttribute('data-verdict', 'grading');
  gradeResultEl.textContent = 'Grading in progress... Evaluating test cases...';

  // Realistic deterministic delay
  setTimeout(() => {
    isGrading = false;
    if (isCorrect) {
      gradeResultEl.className = 'result-correct';
      gradeResultEl.setAttribute('data-verdict', 'correct');
      gradeResultEl.textContent = 'Verdict: Accepted (100/100). All test cases passed!';
      
      passedQuestions = Math.max(passedQuestions, currentQuestionIndex + 1);
      updateProgress();
      nextBtn.disabled = false;
    } else {
      gradeResultEl.className = 'result-incorrect';
      gradeResultEl.setAttribute('data-verdict', 'incorrect');
      gradeResultEl.textContent = 'Verdict: Wrong Answer. 0/100 test cases passed.';
      submitBtn.disabled = false;
      if (textAnswerEl) textAnswerEl.disabled = false;
      nextBtn.disabled = true;
    }
  }, 400);
}

function handleNext() {
  if (currentQuestionIndex + 1 < MOCK_QUESTIONS.length) {
    currentQuestionIndex++;
    renderCurrentQuestion();
  } else {
    // Completed test
    questionCard.classList.add('hidden');
    completionCard.classList.remove('hidden');
    const total = MOCK_QUESTIONS.length;
    passedQuestions = total;
    updateProgress();
    completionSummary.textContent = `Score: ${passedQuestions}/${total} (100%) - All test cases successfully solved!`;
  }
}

function resetTest() {
  currentQuestionIndex = 0;
  passedQuestions = 0;
  isGrading = false;
  updateProgress();
  questionCard.classList.remove('hidden');
  completionCard.classList.add('hidden');
  renderCurrentQuestion();
}

submitBtn.addEventListener('click', gradeSubmission);
nextBtn.addEventListener('click', handleNext);
resetBtn.addEventListener('click', resetTest);
restartBtn.addEventListener('click', resetTest);

// Initialize
updateProgress();
renderCurrentQuestion();
console.log('✅ Local Mock Test Portal Initialized. Deterministic Grader Active.');
