import { useState, useRef, useEffect, useCallback } from 'react';
import { buildAssetContext } from '../lib/buildContext';
import { askAI } from '../lib/ingestionService';

function formatAIResponse(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-jll-navy/50 text-jll-accent px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="text-white font-semibold text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-white font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^- (.*$)/gm, '<li class="ml-3 text-xs">• $1</li>')
    .replace(/\n/g, '<br/>');
}

function MessageBubble({ role, content }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
      <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
        role === 'user'
          ? 'bg-jll-accent/20 text-white border border-jll-accent/30'
          : 'bg-jll-card text-jll-muted border border-jll-border'
      }`}>
        {role === 'assistant' ? (
          <div className="ai-prose" dangerouslySetInnerHTML={{ __html: formatAIResponse(content) }} />
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  );
}

export default function AskAIPanel({ open, onClose, activeTab, dashboardState }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = buildAssetContext(activeTab, dashboardState);
      const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const response = await askAI(allMessages, context);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content || response.message || 'No response received.',
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${e.message}. Make sure the backend server is running (npm run server).`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, activeTab, dashboardState]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] z-50 flex flex-col bg-jll-navy border-l border-jll-border shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-jll-border bg-jll-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-jll-accent/15 flex items-center justify-center">
            <span className="text-jll-accent text-xs font-bold">AI</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">CRElytic Assistant</p>
            <p className="text-xs text-jll-muted">Ask about this property</p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg bg-jll-navy/50 border border-jll-border flex items-center justify-center text-jll-muted hover:text-white hover:border-jll-accent/50 transition-all">
          ✕
        </button>
      </div>

      {/* Suggestion chips */}
      {messages.length === 0 && (
        <div className="px-5 py-4 border-b border-jll-border/60">
          <p className="text-xs text-jll-muted mb-3">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'What are the biggest risks for this property?',
              'Summarize the T12 financial performance',
              'Which leases expire in the next 12 months?',
              'What is the NOI variance vs budget?',
            ].map((q, i) => (
              <button key={i} onClick={() => setInput(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-jll-border text-jll-muted hover:text-white hover:border-jll-accent/40 transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-up">
            <div className="bg-jll-card border border-jll-border rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-jll-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-jll-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-jll-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 border-t border-jll-border bg-jll-card">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this property..."
            rows={1}
            className="flex-1 bg-jll-navy border border-jll-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-jll-muted resize-none focus:outline-none focus:border-jll-accent/50"
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              input.trim() && !loading
                ? 'bg-jll-accent text-white hover:bg-jll-accent/80'
                : 'bg-jll-border/40 text-jll-muted cursor-not-allowed'
            }`}>
            Send
          </button>
        </div>
        <p className="text-xs text-jll-border mt-2">Powered by CRElytic AI • Context: {activeTab} tab</p>
      </div>
    </div>
  );
}
