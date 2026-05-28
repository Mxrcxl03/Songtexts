import { useState } from 'react';
import AuthService from '../services/auth.service';
import { useNavigate } from 'react-router';
import '../styles/global.css';

export const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await AuthService.login(username, password);
      navigate('/', { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? 'Login fehlgeschlagen');
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={onSubmit} className="auth-card stack-form">
        <h1 className="auth-title">Login</h1>
        <p className="auth-subtitle">Login Songtexte</p>
        {err && <p className="status-error">{err}</p>}
        <input
          className="text-input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="text-input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="primary-button btn-edit">
          Anmelden
        </button>
        <p className="auth-switch-text">
          Noch nicht registriert?{' '}
          <button
            type="button"
            className="auth-switch-link"
            onClick={() => navigate('/register')}
          >
            Jetzt registrieren
          </button>
        </p>
      </form>
    </div>
  );
};
