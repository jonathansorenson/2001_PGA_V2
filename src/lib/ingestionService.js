/**
 * ingestionService.js — AI-powered CRE data extraction
 * Calls backend Express server that proxies Anthropic API requests.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export async function checkApiKeyStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
    if (!res.ok) return { ok: false, message: 'Server unreachable' };
    const data = await res.json();
    return { ok: data.apiKeyConfigured, message: data.apiKeyConfigured ? 'API key configured' : 'No API key set' };
  } catch {
    return { ok: false, message: 'Server not running' };
  }
}

export async function extractManagementReport(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/extract/management-report`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Extraction failed' }));
    throw new Error(err.error || 'Failed to extract management report');
  }
  return res.json();
}

export async function extractRentRoll(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/extract/rent-roll`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Extraction failed' }));
    throw new Error(err.error || 'Failed to extract rent roll');
  }
  return res.json();
}

export async function extractBudget(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/extract/budget`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Extraction failed' }));
    throw new Error(err.error || 'Failed to extract budget');
  }
  return res.json();
}

export async function extractDebtSchedule(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/extract/debt-schedule`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Extraction failed' }));
    throw new Error(err.error || 'Failed to extract debt schedule');
  }
  return res.json();
}

export async function askAI(messages, context) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI request failed' }));
    throw new Error(err.error || 'AI request failed');
  }
  return res.json();
}
