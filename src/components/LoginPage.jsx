import { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-jll-navy">
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-50 pointer-events-none" />
      <div className="relative w-full max-w-sm mx-4">
        <div className="rounded-2xl border border-jll-border bg-jll-card p-8 shadow-2xl">
          {/* Logo / Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-jll-accent/20 flex items-center justify-center">
                <span className="text-jll-accent font-bold text-sm">C</span>
              </div>
              <span className="font-display text-xl text-white tracking-tight">CRElytic</span>
            </div>
            <p className="text-xs text-jll-muted uppercase tracking-widest">Spotlight Dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-jll-muted uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-jll-border bg-jll-navy/60 text-white placeholder-jll-muted/50 focus:outline-none focus:border-jll-accent/50 focus:ring-1 focus:ring-jll-accent/30 transition-colors"
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-jll-muted uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-jll-border bg-jll-navy/60 text-white placeholder-jll-muted/50 focus:outline-none focus:border-jll-accent/50 focus:ring-1 focus:ring-jll-accent/30 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-jll-red/10 border border-jll-red/30 px-3 py-2">
                <p className="text-jll-red text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-jll-accent text-jll-navy font-semibold hover:bg-jll-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-jll-muted/50 mt-6">
            Contact your administrator for access
          </p>
        </div>
      </div>
    </div>
  );
}
