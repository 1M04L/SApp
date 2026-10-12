import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabase';

type Profile = {
  role: 'admin' | 'employee';
  employee_id: number | null;
};

type AuthCtxType = {
  user: any;
  profile: Profile | null;
  loading: boolean;
};

const AuthCtx = createContext<AuthCtxType>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, employee_id')
      .eq('id', uid)
      .single();

    if (error) {
      console.error('Profile load error:', error);
      setProfile(null);
      return;
    }
    setProfile(data as Profile);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) await loadProfile(u.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await loadProfile(u.id);
        else setProfile(null);
      }
    );

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, profile, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);