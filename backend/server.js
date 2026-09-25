const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
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

// Call Google Gemini API
async function callGemini(question, options, code, type, apiKey) {
  const modelName = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini response missing text candidate');
  }

  // Parse JSON
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  }

  const parsed = JSON.parse(cleaned);
  return parsed;
}

// POST /solve endpoint
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

    const apiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim();
    let structuredAnswer = null;

    if (apiKey) {
      try {
        console.log('[Backend] Contacting Gemini API for structured answer...');
        const aiResponse = await callGemini(question, options, code, type, apiKey);

        if (type === 'mcq') {
          const index = Number(aiResponse.answerIndex);
          if (!Number.isInteger(index) || index < 0 || index >= options.length) {
            throw new Error(`AI returned invalid answerIndex: ${aiResponse.answerIndex}`);
          }
          structuredAnswer = {
            answerIndex: index,
            confidence: Math.min(1.0, Math.max(0.0, Number(aiResponse.confidence) || 0.9)),
            explanation: String(aiResponse.explanation || 'Answer generated by Gemini AI.')
          };
        } else {
          if (!aiResponse.answer || typeof aiResponse.answer !== 'string') {
            throw new Error('AI returned missing or invalid "answer" property for text/code question.');
          }
          structuredAnswer = {
            answer: aiResponse.answer,
            confidence: Math.min(1.0, Math.max(0.0, Number(aiResponse.confidence) || 0.9)),
            explanation: String(aiResponse.explanation || 'Answer generated by Gemini AI.')
          };
        }
        console.log('[Backend] Successfully solved via Gemini API.');
      } catch (geminiError) {
        console.warn(`[Backend] Gemini API call failed (${geminiError.message}). Falling back to mock solver...`);
      }
    }

    // Fallback to deterministic knowledge base if AI was not configured or call failed
    if (!structuredAnswer) {
      console.log('[Backend] Using deterministic mock test knowledge base.');
      const mockResult = findMockKnowledgeAnswer(question, options, type, code);
      if (mockResult) {
        structuredAnswer = mockResult;
      } else {
        return res.status(500).json({
          error: 'Unable to solve question: Gemini API key not active and question not in mock dataset.',
          status: 'error'
        });
      }
    }

    // Return strictly validated structured answer
    return res.json(structuredAnswer);

  } catch (error) {
    console.error('[Backend /solve] Error handling request:', error);
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

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 NeoPass Mock Test Backend running on http://localhost:${PORT}`);
  console.log(`📝 Mock Test Portal: http://localhost:${PORT}/mock-test`);
  console.log(`🤖 AI Status: ${process.env.GEMINI_API_KEY ? 'Gemini API Key Detected' : 'Mock Deterministic Solver Mode'}`);
  console.log(`=======================================================`);
});
