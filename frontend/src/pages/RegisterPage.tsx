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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  const mapRegisterErrorMessage = (
    error: any
  ): { message: string; usernameError: boolean; emailError: boolean } => {
    const raw = String(
      error?.response?.data?.message ??
        error?.response?.data ??
        error?.message ??
        ''
    ).toLowerCase();

    if (raw.includes('username') && raw.includes('already')) {
      return {
        message:
          'Der Benutzername ist bereits vergeben. Bitte waehle einen anderen Benutzernamen.',
        usernameError: true,
        emailError: false,
      };
    }

    if (raw.includes('email') && raw.includes('already')) {
      return {
        message:
          'Die E-Mail-Adresse ist bereits registriert. Bitte verwende eine andere E-Mail-Adresse.',
        usernameError: false,
        emailError: true,
      };
    }

    if (raw.includes('pending') && raw.includes('username')) {
      return {
        message:
          'Fuer diesen Benutzernamen gibt es bereits eine offene Anfrage. Bitte waehle einen anderen Benutzernamen.',
        usernameError: true,
        emailError: false,
      };
    }

    if (raw.includes('pending') && raw.includes('email')) {
      return {
        message:
          'Fuer diese E-Mail-Adresse gibt es bereits eine offene Anfrage. Bitte verwende eine andere E-Mail-Adresse.',
        usernameError: false,
        emailError: true,
      };
    }

    return {
      message:
        'Registrierung fehlgeschlagen. Bitte pruefe deine Eingaben und versuche es erneut.',
      usernameError: false,
      emailError: false,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccessMessage(null);
    setUsernameError(false);
    setEmailError(false);
    setSubmitting(true);
    try {
      const result = await AuthService.register(username, email, password);
      setSuccessMessage(
        typeof result === 'string'
          ? result
          : result.message ||
              'Registrierungsanfrage wurde eingereicht und wartet auf Freigabe.'
      );
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error: any) {
      const mappedError = mapRegisterErrorMessage(error);
      setErr(mappedError.message);
      setUsernameError(mappedError.usernameError);
      setEmailError(mappedError.emailError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-card stack-form">
        <h1 className="auth-title">Registrieren</h1>
        {err && <p className="status-error">{err}</p>}
        {successMessage && <p className="status-success">{successMessage}</p>}
        <input
          className={`text-input${usernameError ? ' input-error' : ''}`}
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setUsernameError(false);
          }}
        />
        <input
          className={`text-input${emailError ? ' input-error' : ''}`}
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(false);
          }}
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
        <p className="auth-switch-text">
          Bereits registriert?
          <button
            type="button"
            className="auth-switch-link"
            onClick={() => navigate('/login')}
          >
            Zum Login
          </button>
        </p>
      </form>
    </div>
  );
};
