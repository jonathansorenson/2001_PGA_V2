import { useState, useEffect, useCallback } from 'react';
import { checkApiKeyStatus, extractManagementReport, extractRentRoll, extractBudget } from '../lib/ingestionService';

function StatusBadge({ ok }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
      ok ? 'bg-green-500/15 text-green-400 border border-green-500/30'
         : 'bg-jll-red/15 text-jll-red border border-jll-red/30'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-jll-red'}`} />
      {ok ? 'Connected' : 'Offline'}
    </span>
  );
}

function DropZone({ label, accept, icon, onFile, disabled }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
        disabled ? 'opacity-40 pointer-events-none' :
        dragOver ? 'border-jll-accent bg-jll-accent/5' : 'border-jll-border hover:border-jll-accent/50'
      }`}
    >
      <input
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        className="absolute inset-0 opacity-0 cursor-pointer"
        disabled={disabled}
      />
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-sm text-white font-medium">{label}</p>
      <p className="text-xs text-jll-muted mt-1">Drag & drop or click to browse</p>
    </div>
  );
}

export default function DataUpload({ onReportExtracted, onRentRollExtracted, onBudgetExtracted }) {
  const [apiStatus, setApiStatus] = useState({ ok: false, message: 'Checking...' });
  const [extracting, setExtracting] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkApiKeyStatus().then(setApiStatus);
  }, []);

  const handleReportUpload = useCallback(async (file) => {
    setExtracting('report');
    setError(null);
    setLastResult(null);
    try {
      const result = await extractManagementReport(file);
      setLastResult({ type: 'Management Report', file: file.name, data: result });
      onReportExtracted?.(file.name, result);
    } catch (e) {
      setError(e.message);
    } finally {
      setExtracting(null);
    }
  }, [onReportExtracted]);

  const handleRentRollUpload = useCallback(async (file) => {
    setExtracting('rentroll');
    setError(null);
    setLastResult(null);
    try {
      const result = await extractRentRoll(file);
      setLastResult({ type: 'Rent Roll', file: file.name, data: result });
      onRentRollExtracted?.(file.name, result);
    } catch (e) {
      setError(e.message);
    } finally {
      setExtracting(null);
    }
  }, [onRentRollExtracted]);

  const handleBudgetUpload = useCallback(async (file) => {
    setExtracting('budget');
    setError(null);
    setLastResult(null);
    try {
      const result = await extractBudget(file);
      setLastResult({ type: 'Budget', file: file.name, data: result });
      onBudgetExtracted?.(file.name, result);
    } catch (e) {
      setError(e.message);
    } finally {
      setExtracting(null);
    }
  }, [onBudgetExtracted]);

  const extractingLabel = {
    report: 'management report',
    rentroll: 'rent roll',
    budget: 'budget',
  };

  return (
    <div className="space-y-4">
      {/* Server status */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-jll-border bg-jll-navy/50">
        <div className="flex items-center gap-2">
          <StatusBadge ok={apiStatus.ok} />
          <span className="text-xs text-jll-muted">{apiStatus.message}</span>
        </div>
        <span className="text-xs text-jll-muted font-mono">AI Extraction Engine</span>
      </div>

      {!apiStatus.ok && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
          <p className="text-xs text-yellow-300 font-medium">AI extraction server not detected</p>
          <p className="text-xs text-jll-muted mt-1">
            The backend API must be running to enable AI-powered data extraction.
            In production, this is hosted on Render. For local development, run <code className="text-jll-accent font-mono">cd server && npm start</code>.
          </p>
        </div>
      )}

      {/* Upload zones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DropZone label="Management Report (PDF)" accept=".pdf" icon="📊" onFile={handleReportUpload} disabled={!apiStatus.ok || extracting} />
        <DropZone label="Rent Roll (PDF/Excel)" accept=".pdf,.xlsx,.xls,.csv" icon="📋" onFile={handleRentRollUpload} disabled={!apiStatus.ok || extracting} />
        <DropZone label="Annual Budget (Excel)" accept=".xlsx,.xls,.csv" icon="💰" onFile={handleBudgetUpload} disabled={!apiStatus.ok || extracting} />
      </div>

      {extracting && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-jll-accent/30 bg-jll-accent/5">
          <div className="w-5 h-5 border-2 border-jll-accent border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-sm text-white font-medium">Extracting {extractingLabel[extracting] || 'data'}...</p>
            <p className="text-xs text-jll-muted">AI is parsing and structuring the data. This may take 30-60 seconds.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-jll-red/30 bg-jll-red/5">
          <p className="text-xs text-jll-red font-medium">Extraction Error</p>
          <p className="text-xs text-jll-muted mt-1">{error}</p>
        </div>
      )}

      {lastResult && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400 text-sm">✓</span>
            <p className="text-sm text-green-300 font-medium">Successfully extracted {lastResult.type}</p>
          </div>
          <p className="text-xs text-jll-muted">Source: {lastResult.file}</p>
          <details className="mt-2">
            <summary className="text-xs text-jll-accent cursor-pointer hover:underline">View extracted data</summary>
            <pre className="mt-2 p-3 rounded-lg bg-jll-navy/50 border border-jll-border text-xs text-jll-muted overflow-auto max-h-60 font-mono">
              {JSON.stringify(lastResult.data, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
