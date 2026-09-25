const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Restrict CORS to local development origin and Chrome extensions
const allowedOrigins = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    
    // Allow local origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // Allow chrome-extension:// origins
    if (origin.startsWith('chrome-extension://')) return callback(null, true);
    
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// Serve mock test static files
app.use('/mock-test', express.static(path.join(__dirname, 'mock-test')));
app.get('/', (req, res) => res.redirect('/mock-test'));

// Provider Configuration Helper
function getActiveProviderConfig() {
  const provider = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim();
  const groqKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim();

  if (provider === 'groq') {
    const model = (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
    return {
      provider: 'groq',
      displayName: 'Groq',
      configured: Boolean(groqKey),
      apiKey: groqKey || null,
      model: model
    };
  }

  // Default to Gemini
  const model = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
  return {
    provider: 'gemini',
    displayName: 'Gemini',
    configured: Boolean(geminiKey),
    apiKey: geminiKey || null,
    model: model
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  const activeConfig = getActiveProviderConfig();
  res.json({
    status: 'ok',
    provider: activeConfig.configured ? activeConfig.provider : 'mock',
    configured: activeConfig.configured,
    model: activeConfig.configured ? activeConfig.model : 'deterministic-mock-kb',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Deterministic answers for local mock test suite
const MOCK_KNOWLEDGE_BASE = [
  {
    matcher: (q) => /binary search tree|avl tree/i.test(q),
    type: 'mcq',
    answerIndex: 1, // "O(log n)"
    confidence: 0.99,
    explanation: 'In a balanced BST like an AVL tree, the height is guaranteed to be O(log n), so search is O(log n).'
  },
  {
    matcher: (q) => /creates a new array.*pass the test|filter/i.test(q),
    type: 'mcq',
    answerIndex: 2, // "Array.prototype.filter()"
    confidence: 0.99,
    explanation: 'filter() creates a shallow copy of a portion of a given array filtered down to just the elements from the given array that pass the test implemented by the provided function.'
  },
  {
    matcher: (q) => /var i = 0|closure/i.test(q),
    type: 'mcq',
    answerIndex: 0, // "3, 3, 3"
    confidence: 0.98,
    explanation: 'Because var is function-scoped and not block-scoped, by the time setTimeout callbacks execute, i has already reached 3.'
  },
  {
    matcher: (q) => /too many requests|rate limiting|429/i.test(q),
    type: 'mcq',
    answerIndex: 3, // "429"
    confidence: 1.0,
    explanation: 'HTTP 429 Too Many Requests response status code indicates the user has sent too many requests in a given amount of time.'
  },
  {
    matcher: (q) => /reversestring|reverse.*string/i.test(q),
    type: 'text',
    answer: "function reverseString(str) {\n  return str.split('').reverse().join('');\n}",
    confidence: 0.99,
    explanation: 'Splitting into an array of characters, reversing the array, and joining it back into a string reverses the string in JavaScript.'
  },
  {
    matcher: (q) => /ispalindrome|palindrome/i.test(q),
    type: 'code',
    answer: "function isPalindrome(s) {\n  const clean = s.toLowerCase();\n  return clean === clean.split('').reverse().join('');\n}",
    confidence: 0.99,
    explanation: 'Compares the original lowercase string to its reverse.'
  }
];

function findMockKnowledgeAnswer(question, options, type, code = '') {
  const combinedText = (question || '') + ' ' + (code || '');
  
  for (const item of MOCK_KNOWLEDGE_BASE) {
    if (item.matcher(combinedText)) {
      if (item.type === 'mcq') {
        return {
          answerIndex: item.answerIndex,
          confidence: item.confidence,
          explanation: `[Deterministic Mock Solver] ${item.explanation}`
        };
      } else {
        return {
          answer: item.answer,
          confidence: item.confidence,
          explanation: `[Deterministic Mock Solver] ${item.explanation}`
        };
      }
    }
  }

  // Fallback heuristic if question matches partially or general MCQ
  if (type === 'mcq' && Array.isArray(options) && options.length > 0) {
    return {
      answerIndex: 0,
      confidence: 0.70,
      explanation: '[Deterministic Mock Solver Default] First option selected as default heuristic.'
    };
  }

  if (type === 'text' || type === 'code') {
    return {
      answer: '// Generic solution\nfunction solution() { return true; }',
      confidence: 0.50,
      explanation: '[Deterministic Mock Solver Default] Generic fallback solution template.'
    };
  }

  return null;
}

// Response Validator
function validateStructuredResponse(raw, type, optionsCount) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI returned invalid or empty response structure');
  }

  if (type === 'mcq') {
    const idx = Number(raw.answerIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= optionsCount) {
      throw new Error(`AI returned invalid answerIndex: ${raw.answerIndex} (options length: ${optionsCount})`);
    }
    const confidence = Math.min(1.0, Math.max(0.0, Number(raw.confidence) || 0.9));
    const explanation = typeof raw.explanation === 'string' && raw.explanation.trim()
      ? raw.explanation.trim()
      : 'Answer selected by AI.';
    return {
      answerIndex: idx,
      confidence,
      explanation
    };
  } else {
    if (typeof raw.answer !== 'string' || raw.answer.trim().length === 0) {
      throw new Error('AI returned missing or empty "answer" string for text/code question.');
    }
    const confidence = Math.min(1.0, Math.max(0.0, Number(raw.confidence) || 0.9));
    const explanation = typeof raw.explanation === 'string' && raw.explanation.trim()
      ? raw.explanation.trim()
      : 'Solution generated by AI.';
    return {
      answer: raw.answer.trim(),
      confidence,
      explanation
    };
  }
}

// -------------------------------------------------------------
// Provider 1: Gemini
// -------------------------------------------------------------
async function solveWithGemini(question, options, code, type, apiKey, modelName) {
  const preferredModel = modelName || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const modelsToTry = [preferredModel, 'gemini-3.5-flash-lite'].filter((m, i, a) => a.indexOf(m) === i);

  let prompt = '';
  if (type === 'mcq') {
    const formattedOptions = options.map((opt, i) => `Option ${i}: ${opt}`).join('\n');
    prompt = `You are an automated exam solver. Analyze this multiple-choice question and respond with strictly valid JSON only.

Question:
${question}

${code ? `Code snippet:\n${code}\n` : ''}
Options:
${formattedOptions}

Requirements:
- Choose the single best option.
- Respond with a STRICT JSON object only. Do NOT use markdown fences or backticks.
- Schema:
{
  "answerIndex": <0-based integer index of the correct option>,
  "confidence": <float between 0.0 and 1.0>,
  "explanation": "<short sentence explaining why this option is correct>"
}`;
  } else {
    prompt = `You are an automated exam solver. Provide the exact code or text answer for this question. Respond with strictly valid JSON only.

Question:
${question}

${code ? `Existing code / snippet:\n${code}\n` : ''}

Requirements:
- Provide ONLY the direct, working code or text answer needed.
- Respond with a STRICT JSON object only. Do NOT use markdown fences.
- Schema:
{
  "answer": "<exact code or text answer>",
  "confidence": <float between 0.0 and 1.0>,
  "explanation": "<short rationale>"
}`;
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json'
    }
  };

  let lastError = null;
  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        const errText = await response.text();
        // If 404, 503, or rate limit, try next model
        if (model !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`[Backend Gemini] Model ${model} returned HTTP ${response.status}. Trying next model...`);
          lastError = new Error(`Gemini API HTTP ${response.status}: ${errText}`);
          continue;
        }
        throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini response missing candidate text');
      }

      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      return validateStructuredResponse(parsed, type, options?.length || 0);
    } catch (err) {
      lastError = err;
      if (model !== modelsToTry[modelsToTry.length - 1]) {
        console.warn(`[Backend Gemini] Model ${model} error: ${err.message}. Trying next model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All Gemini candidate models failed');
}

// -------------------------------------------------------------
// Provider 2: Groq
// -------------------------------------------------------------
async function solveWithGroq(question, options, code, type, apiKey, modelName) {
  const model = modelName || 'llama-3.3-70b-versatile';
  const groq = new Groq({ apiKey });

  let prompt = '';
  if (type === 'mcq') {
    const formattedOptions = options.map((opt, i) => `Option ${i}: ${opt}`).join('\n');
    prompt = `You are an automated exam solver. Analyze this multiple-choice question and respond with strictly valid JSON only.

Question:
${question}

${code ? `Code snippet:\n${code}\n` : ''}
Options:
${formattedOptions}

Requirements:
- Choose the single best option.
- Respond with a valid JSON object only. Do NOT use markdown code blocks.
- Schema:
{
  "answerIndex": <0-based integer index of the correct option>,
  "confidence": <float between 0.0 and 1.0>,
  "explanation": "<short sentence explaining why this option is correct>"
}`;
  } else {
    prompt = `You are an automated exam solver. Provide the exact code or text answer for this question. Respond with strictly valid JSON only.

Question:
${question}

${code ? `Existing code / snippet:\n${code}\n` : ''}

Requirements:
- Provide ONLY the direct, working code or text answer needed.
- Respond with a valid JSON object only. Do NOT use markdown code blocks.
- Schema:
{
  "answer": "<exact code or text answer>",
  "confidence": <float between 0.0 and 1.0>,
  "explanation": "<short rationale>"
}`;
  }

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an expert exam solver. You MUST respond with a valid JSON object matching the requested schema only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    model: model,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned empty response content');
  }

  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  }

  const parsed = JSON.parse(cleaned);
  return validateStructuredResponse(parsed, type, options?.length || 0);
}

// -------------------------------------------------------------
// Endpoint: POST /solve
// -------------------------------------------------------------
app.post('/solve', async (req, res) => {
  try {
    const { question, options, code, type = 'mcq' } = req.body;

    // Validate inputs
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request: "question" must be a non-empty string.',
        status: 'error'
      });
    }

    if (!['mcq', 'text', 'code'].includes(type)) {
      return res.status(400).json({
        error: `Invalid question type: "${type}". Expected "mcq", "text", or "code".`,
        status: 'error'
      });
    }

    if (type === 'mcq') {
      if (!Array.isArray(options) || options.length < 2) {
        return res.status(400).json({
          error: 'Invalid request: "options" must be an array with at least 2 items for MCQ.',
          status: 'error'
        });
      }
    }

    console.log(`[Backend /solve] Received question: "${question.substring(0, 60)}..." (Type: ${type})`);

    const activeConfig = getActiveProviderConfig();

    if (activeConfig.configured) {
      try {
        console.log(`[Backend /solve] Contacting ${activeConfig.displayName} API (${activeConfig.model})...`);
        let structuredAnswer;
        if (activeConfig.provider === 'groq') {
          structuredAnswer = await solveWithGroq(question, options, code, type, activeConfig.apiKey, activeConfig.model);
        } else {
          structuredAnswer = await solveWithGemini(question, options, code, type, activeConfig.apiKey, activeConfig.model);
        }
        console.log(`[Backend /solve] Successfully solved via ${activeConfig.displayName}.`);
        return res.json(structuredAnswer);
      } catch (providerError) {
        // Log category and provider, NEVER expose API key
        console.error(`[Backend /solve] Provider Error [${activeConfig.displayName}]: ${providerError.message}`);
        
        // If AI provider is unavailable, fallback to deterministic mock solver so workflow can still be validated
        const mockFallback = findMockKnowledgeAnswer(question, options, type, code);
        if (mockFallback) {
          console.log(`[Backend /solve] Falling back to deterministic mock knowledge base answer.`);
          return res.json({
            ...mockFallback,
            fallbackUsed: true,
            providerNotice: `${activeConfig.displayName} temporarily unavailable, deterministic mock fallback used.`
          });
        }

        return res.status(502).json({
          error: `${activeConfig.displayName} provider error: ${providerError.message}`,
          provider: activeConfig.provider,
          status: 'error'
        });
      }
    } else {
      // Deterministic Mock Solver Mode (when no API key configured)
      console.log(`[Backend /solve] Using deterministic mock test knowledge base.`);
      const mockResult = findMockKnowledgeAnswer(question, options, type, code);
      if (mockResult) {
        return res.json(mockResult);
      } else {
        return res.status(500).json({
          error: `No API key configured for ${activeConfig.displayName} and question not in mock dataset.`,
          provider: 'mock',
          status: 'error'
        });
      }
    }

  } catch (error) {
    console.error('[Backend /solve] Error handling request:', error.message);
    return res.status(500).json({
      error: error.message || 'Internal server error while solving question.',
      status: 'error'
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Backend] Uncaught error:', err.message);
  res.status(500).json({
    error: err.message || 'Unexpected server error',
    status: 'error'
  });
});

const server = app.listen(PORT, () => {
  const activeConfig = getActiveProviderConfig();
  console.log(`=======================================================`);
  console.log(`🚀 NeoPass Mock Test Backend running on http://localhost:${PORT}`);
  console.log(`📝 Mock Test Portal: http://localhost:${PORT}/mock-test`);
  if (activeConfig.configured) {
    console.log(`🤖 AI Provider: ${activeConfig.displayName}`);
    console.log(`🔑 API Key: Configured`);
    console.log(`📦 Model: ${activeConfig.model}`);
  } else {
    console.log(`🤖 AI Provider: Deterministic Mock Solver`);
    console.log(`🔑 API Key: Not Configured (using built-in deterministic solver)`);
  }
  console.log(`=======================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
    console.error(`To stop the process using port ${PORT}, run:`);
    console.error(`   lsof -ti :${PORT} | xargs kill -9\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
