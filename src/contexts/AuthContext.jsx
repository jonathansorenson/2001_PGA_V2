import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) return data;
      console.warn(`[Auth] Profile fetch attempt ${i + 1} failed:`, error?.message);
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500));
    }
    return null;
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const profile = await fetchProfile(s.user.id);
        setUser({ ...s.user, ...profile });
        setRole(profile?.role || 'read');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          const profile = await fetchProfile(newSession.user.id);
          setUser({ ...newSession.user, ...profile });
          setRole(profile?.role || 'read');
        } else {
          setUser(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setUser(null);
    setRole(null);
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
