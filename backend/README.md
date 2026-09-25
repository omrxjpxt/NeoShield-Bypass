# NeoPass Local Mock Test Automation Backend & Sandbox

This module provides an isolated, local development sandbox and backend AI service for testing the NeoPass browser extension automation workflow end-to-end.

---

## 🏗️ Architecture & Data Flow

```
[ User presses ⌘G on http://localhost:3000/mock-test ]
                         │
                         ▼
[ contentScript.js: extractCurrentQuestion() ]
 - Detects mock test environment (`data-mock-test-environment="true"`)
 - Extracts question text, options, and code snippet from DOM
 - Updates HUD State -> QUESTION_DETECTED -> SOLVING
                         │
                         ▼  (chrome.runtime.sendMessage)
[ worker.js: mockTestSolve handler ]
 - Guard against simultaneous / duplicate requests
 - Forwards request to local backend POST http://localhost:3000/solve
                         │
                         ▼  (HTTP POST JSON)
[ backend/server.js: /solve ]
 - Validates input structure (question, options, type)
 - Selects provider based on AI_PROVIDER (gemini | groq)
 - If GEMINI: Calls solveWithGemini() using GEMINI_API_KEY
 - If GROQ: Calls solveWithGroq() using GROQ_API_KEY via groq-sdk
 - If no API key configured: Uses deterministic mock test knowledge base
 - Returns validated JSON: { answerIndex, confidence, explanation } (or { answer, ... })
                         │
                         ▼
[ worker.js -> contentScript.js ]
 - Validates received structured answer
 - Updates HUD State -> ANSWER_RECEIVED -> ANSWER_FILLED
 - Populates DOM radio input / textarea & dispatches change events
 - Updates HUD State -> SUBMITTED
 - Clicks #mock-submit-btn
                         │
                         ▼
[ mock-test.js: Deterministic Grader ]
 - Grader evaluates submission with realistic 400ms delay
 - Updates #mock-grade-result (verdict: correct / incorrect)
                         │
                         ▼
[ contentScript.js: MutationObserver ]
 - Reads grader verdict:
   • If CORRECT: Updates progress badge, waits 600ms, clicks Next Question, repeats cycle.
   • If INCORRECT: Halts immediately, displays failure state.
   • If 6/6 Completed: Displays completion state.
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on v26+)
- **Google Chrome** or Chromium-based browser

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Configure AI Provider (.env)
Create your `.env` from `.env.example`:
```bash
cp .env.example .env
```

You can choose either **Gemini** or **Groq**:

#### Option A: Use Google Gemini
Edit `.env`:
```ini
PORT=3000
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=
```
*(Optional model override: `GEMINI_MODEL=gemini-1.5-flash`)*

#### Option B: Use Groq
Edit `.env`:
```ini
PORT=3000
AI_PROVIDER=groq
GEMINI_API_KEY=
GROQ_API_KEY=your_groq_api_key_here
```
*(Optional model override: `GROQ_MODEL=llama-3.3-70b-versatile`)*

> [!IMPORTANT]
> **Server Restart Required**: The backend must be restarted whenever you change values in `.env`.

> [!NOTE]
> **Deterministic Mock Solver**: If no API key is provided for the selected provider, the backend automatically runs in **Deterministic Mock Solver Mode**, resolving all 6 mock test questions with 100% accuracy for out-of-the-box local testing.

### 4. Start Backend Server
```bash
npm start
```
On startup, diagnostics will display:
```
=======================================================
🚀 NeoPass Mock Test Backend running on http://localhost:3000
📝 Mock Test Portal: http://localhost:3000/mock-test
🤖 AI Provider: Gemini (or Groq / Deterministic Mock Solver)
🔑 API Key: Configured
📦 Model: gemini-1.5-flash (or llama-3.3-70b-versatile)
=======================================================
```

---

## 🔌 Load the Browser Extension in Chrome

1. Open Google Chrome.
2. In the address bar, navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the repository root folder (`NeoPass-main 4`).
6. The extension is now active.

---

## 🧪 Run the End-to-End Test Automation

1. Make sure the backend server is running (`http://localhost:3000`).
2. Open the mock test portal:
   👉 **`http://localhost:3000/mock-test`**
3. Notice the **NeoPass Auto-Solver** floating HUD overlay in the top-right corner.
4. Press **`⌘G`** on macOS (or **`Ctrl+G`** on Windows/Linux) or click **Run (⌘G)** in the floating HUD.
5. Watch the state machine progress autonomously through all 6 questions:
   - `QUESTION_DETECTED` → `SOLVING` → `ANSWER_RECEIVED` → `ANSWER_FILLED` → `SUBMITTED` → `WAITING_FOR_RESULT` → `CORRECT` → `NEXT_QUESTION` → Repeat until `COMPLETED` (Score: 6/6).

---

## 🛑 Emergency Kill Switch
- Click the red **Kill / Stop** button in the floating HUD at any time.
- Or press the **`Escape`** key while focused on the mock test page.

---

## 🔒 Security & Safety Controls
- **Strict Isolation**: The ⌘G shortcut and automation listeners activate **only** on the local mock test page (`localhost:3000/mock-test` or DOM attribute `data-mock-test-environment="true"`).
- **Backend Key Isolation**: API keys stay strictly on the local backend (`.env`) and are never sent to content scripts or logged in the console.
- **CORS Restricted**: Backend CORS permits only localhost origins and `chrome-extension://*`.
- **Zero Bypass Code**: No exam proctoring, lockdown, or security evasion code is involved.
