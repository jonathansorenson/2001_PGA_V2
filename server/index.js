/**
 * CRElytic API Server
 * Express backend for AI-powered CRE data extraction via Anthropic Claude.
 * Designed for deployment on Render.
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import * as XLSX from 'xlsx';
import Anthropic from '@anthropic-ai/sdk';

import { MANAGEMENT_REPORT_SYSTEM, MANAGEMENT_REPORT_USER } from './prompts/managementReport.js';
import { RENT_ROLL_SYSTEM, RENT_ROLL_USER } from './prompts/rentRoll.js';
import { BUDGET_SYSTEM, BUDGET_USER } from './prompts/budget.js';
import { buildChatMessages } from './prompts/chat.js';

// ── Config ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3333;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3001')
  .split(',')
  .map(s => s.trim());
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = 16000;

// ── Express setup ────────────────────────────────────────────
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB max

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '5mb' }));

// ── Anthropic client ─────────────────────────────────────────
let anthropic = null;
if (ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// ── Helper: call Claude ──────────────────────────────────────
async function callClaude(systemPrompt, userMessage, maxTokens = MAX_TOKENS) {
  if (!anthropic) throw new Error('Anthropic API key not configured');
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0]?.text || '';
}

// ── Helper: parse Claude JSON response ───────────────────────
function parseJsonResponse(text) {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(cleaned);
}

// ── Helper: Excel buffer to text ─────────────────────────────
function excelToText(buffer, originalName) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = {};
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    // Get as JSON array of arrays for maximum fidelity
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    sheets[name] = rows;
  }
  return JSON.stringify({ fileName: originalName, sheets }, null, 2);
}

// ── Routes ───────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    apiKeyConfigured: !!ANTHROPIC_API_KEY,
    model: MODEL,
    message: ANTHROPIC_API_KEY ? 'API key configured' : 'No API key set — extraction disabled',
  });
});

// Extract management report (PDF)
app.post('/api/extract/management-report', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!anthropic) return res.status(503).json({ error: 'API key not configured' });

    console.log(`[extract/management-report] Processing: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)} KB)`);

    // Extract text from PDF
    const pdfData = await pdf(req.file.buffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.trim().length < 100) {
      return res.status(422).json({ error: 'Could not extract sufficient text from PDF. The file may be scanned/image-based.' });
    }

    console.log(`[extract/management-report] Extracted ${pdfText.length} chars, sending to Claude...`);

    // Send to Claude
    const raw = await callClaude(MANAGEMENT_REPORT_SYSTEM, MANAGEMENT_REPORT_USER(pdfText));
    const result = parseJsonResponse(raw);

    console.log(`[extract/management-report] Success — ${result.t12Rows?.length || 0} months extracted`);
    res.json(result);
  } catch (err) {
    console.error('[extract/management-report] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Extract rent roll (PDF or Excel)
app.post('/api/extract/rent-roll', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!anthropic) return res.status(503).json({ error: 'API key not configured' });

    console.log(`[extract/rent-roll] Processing: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)} KB)`);

    let dataText;
    const ext = req.file.originalname.toLowerCase().split('.').pop();

    if (ext === 'pdf') {
      const pdfData = await pdf(req.file.buffer);
      dataText = pdfData.text;
    } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
      dataText = excelToText(req.file.buffer, req.file.originalname);
    } else {
      return res.status(400).json({ error: `Unsupported file type: .${ext}` });
    }

    if (!dataText || dataText.trim().length < 50) {
      return res.status(422).json({ error: 'Could not extract sufficient data from file.' });
    }

    console.log(`[extract/rent-roll] Extracted ${dataText.length} chars, sending to Claude...`);

    const raw = await callClaude(RENT_ROLL_SYSTEM, RENT_ROLL_USER(dataText));
    const result = parseJsonResponse(raw);

    console.log(`[extract/rent-roll] Success — ${result.rows?.length || 0} leases extracted`);
    res.json(result);
  } catch (err) {
    console.error('[extract/rent-roll] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Extract budget (Excel)
app.post('/api/extract/budget', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!anthropic) return res.status(503).json({ error: 'API key not configured' });

    console.log(`[extract/budget] Processing: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)} KB)`);

    const dataText = excelToText(req.file.buffer, req.file.originalname);

    if (!dataText || dataText.trim().length < 50) {
      return res.status(422).json({ error: 'Could not extract sufficient data from file.' });
    }

    console.log(`[extract/budget] Extracted ${dataText.length} chars, sending to Claude...`);

    const raw = await callClaude(BUDGET_SYSTEM, BUDGET_USER(dataText));
    const result = parseJsonResponse(raw);

    console.log(`[extract/budget] Success — ${result.rows?.length || 0} months extracted`);
    res.json(result);
  } catch (err) {
    console.error('[extract/budget] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// AI Chat
app.post('/api/chat', async (req, res) => {
  try {
    if (!anthropic) return res.status(503).json({ error: 'API key not configured' });

    const { messages, context } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' });

    const { system, messages: chatMessages } = buildChatMessages(messages, context);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: chatMessages,
    });

    res.json({ content: response.content[0]?.text || '' });
  } catch (err) {
    console.error('[chat] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  CRElytic API Server`);
  console.log(`  Port:      ${PORT}`);
  console.log(`  Model:     ${MODEL}`);
  console.log(`  API Key:   ${ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing'}`);
  console.log(`  CORS:      ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`  Endpoints:`);
  console.log(`    GET  /api/health`);
  console.log(`    POST /api/extract/management-report`);
  console.log(`    POST /api/extract/rent-roll`);
  console.log(`    POST /api/extract/budget`);
  console.log(`    POST /api/chat\n`);
});
