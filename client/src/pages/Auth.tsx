// Login & Register page
import { useState, FormEvent } from 'react';
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">VogueFrame AI</h1>
          <p className="text-neutral-500 text-sm mt-1">AI-powered fashion image generation</p>
        </div>

        {/* Toggle */}
        <div className="flex bg-[#111] border border-[#222] rounded-lg p-1 mb-6">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors capitalize
                ${mode === m ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="label">Full name</label>
              <input id="name" className="input" placeholder="Jane Doe" value={name}
                     onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input id="email" type="email" className="input" placeholder="you@brand.com" value={email}
                   onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input id="password" type="password" className="input" placeholder="••••••••" value={password}
                   onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button id="auth-submit" type="submit" disabled={busy} className="btn-primary w-full mt-2">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
