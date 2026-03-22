import React, { useState } from 'react';
import AuthService from '../services/auth.service';
import { useNavigate } from 'react-router';
import '../styles/global.css';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await AuthService.register(username, email, password);
      navigate('/login', { replace: true });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        'Registrierung fehlgeschlagen';
      setErr(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-card stack-form">
        <h1 className="auth-title">Registrieren</h1>
        {err && <p className="status-error">{err}</p>}
        <input
          className="text-input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="text-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="text-input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="primary-button btn-save"
        >
          {submitting ? '...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
};
