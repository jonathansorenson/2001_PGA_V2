import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (accessToken, authUser) => {
    // Try backend /api/me (bypasses RLS via service_role key) with 5s timeout
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const profile = await res.json();
        console.log('[Auth] Profile loaded via /api/me:', profile.role);
        return profile;
      }
      console.warn('[Auth] /api/me failed:', res.status);
    } catch (err) {
      console.warn('[Auth] /api/me error:', err.message);
    }

    // Fallback: direct Supabase query (RLS must allow it)
    for (let i = 0; i < 2; i++) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (data) {
          console.log('[Auth] Profile loaded via Supabase:', data.role);
          return data;
        }
        console.warn(`[Auth] Supabase attempt ${i + 1}:`, error?.message);
      } catch (err) {
        console.warn(`[Auth] Supabase attempt ${i + 1} threw:`, err.message);
      }
      if (i < 1) await new Promise(r => setTimeout(r, 500));
    }
    console.warn('[Auth] All profile fetches failed, defaulting to read');
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        const profile = await fetchProfile(s.access_token, s.user);
        if (!mounted) return;
        setUser({ ...s.user, ...profile });
        setRole(profile?.role || 'read');
      }
      setLoading(false);
    }).catch((err) => {
      console.warn('[Auth] getSession error:', err);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user) {
          const profile = await fetchProfile(newSession.access_token, newSession.user);
          if (!mounted) return;
          setUser({ ...newSession.user, ...profile });
          setRole(profile?.role || 'read');
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('[Auth] signOut error (forcing clear):', err);
    }
    // Force-clear Supabase session from localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('sb-')) localStorage.removeItem(k);
    });
    // Hard reload to fully reset state
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
