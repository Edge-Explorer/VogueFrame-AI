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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName]         = useState('');
  const [error, setError]       = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setBusy(true);
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setBusy(false);
          return;
        }
        await api.post('/auth/register', { email, password, full_name: name });
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setSuccessMsg('Registration successful. Please log in.');
      } else {
        await login(email, password);
        navigate('/');
      }
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img
              src="/logo.png"
              alt="VogueFrame AI Logo"
              style={{ width: 56, height: 56, borderRadius: 12, border: '1px solid var(--border)' }}
            />
          </div>
          <h1>VogueFrame AI</h1>
          <p>AI-powered fashion image generation</p>
        </div>

        <div className="auth-tabs">
          {(['login', 'register'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); setSuccessMsg(''); }}
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
              <input id="name" className="input" placeholder="Your Name" value={name}
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
            <div style={{ position: 'relative' }}>
              <input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                className="input" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: '#888',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="auth-field">
              <label className="label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  id="confirm-password" 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="input" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  style={{ paddingRight: '40px' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    color: '#888',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {successMsg && <p className="auth-success" style={{ color: '#34d399', fontSize: '0.875rem' }}>{successMsg}</p>}
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
