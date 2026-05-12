import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

type Mode = 'login' | 'register';

export default function Auth() {
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') {
        await api.post('/auth/register', { email, password, full_name: name });
      }
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box fade-up">
        <div className="auth-brand">
          <h1>VogueFrame AI</h1>
          <p>AI-powered fashion image generation</p>
        </div>

        <div className="auth-tabs">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`auth-tab ${mode === m ? 'auth-tab--active' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <div className="auth-field">
              <label className="label">Full name</label>
              <input id="name" className="input" placeholder="Jane Doe" value={name}
                     onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="auth-field">
            <label className="label">Email</label>
            <input id="email" type="email" className="input" placeholder="you@brand.com" value={email}
                   onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="auth-field">
            <label className="label">Password</label>
            <input id="password" type="password" className="input" placeholder="••••••••" value={password}
                   onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button id="auth-submit" type="submit" disabled={busy} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {busy
              ? <><span className="dots"><span className="dot"/><span className="dot"/><span className="dot"/></span> Please wait…</>
              : mode === 'login' ? 'Sign in' : 'Create account'
            }
          </button>
        </form>
      </div>
    </div>
  );
}
