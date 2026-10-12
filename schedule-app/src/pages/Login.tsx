import { useState } from 'react';
import type { FormEvent } from 'react';import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password: pass });

    if (authError) {
      setErr(authError.message);
      setBusy(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    nav(profile?.role === 'admin' ? '/admin' : '/my', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <form onSubmit={submit} className="card" style={{ width: 360 }}>
        <h2 style={{ marginTop: 0, marginBottom: 20 }}>Вход в систему</h2>

        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ width: '100%', marginRight: 0 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="Пароль"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
            autoComplete="current-password"
            style={{ width: '100%', marginRight: 0 }}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          style={{ width: '100%', padding: 10, fontSize: 15 }}
        >
          {busy ? 'Вход...' : 'Войти'}
        </button>

        {err && (
          <p style={{ color: '#d00', marginBottom: 0, marginTop: 12 }}>{err}</p>
        )}
      </form>
    </div>
  );
}