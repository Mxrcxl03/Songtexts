import '../styles/navbar.css';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import AuthService from '../services/auth.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import UserService from '../services/user.service';
import type { User } from '../types/user';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'songtexts-theme';

function getInitialTheme(): Theme {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return 'light';
}

function Navbar() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    UserService.getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const isAdmin = currentUser?.role === 'ADMIN';

  async function handleLogout() {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout handling failed:', error);
    }

    navigate('/login', { replace: true });
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          <img
            src="/songtexts-icon.svg?v=4"
            alt="Campfire Songs Icon"
            className="navbar-logo-icon"
          />
          <span className="navbar-logo-text">
            <span className="navbar-logo-campfire">Campfire</span>
            <span className="navbar-logo-songs">Songs</span>
          </span>
        </Link>
        <Link to="/" className="navbar-link">
          Songs
        </Link>
        <Link to="/song-lists" className="navbar-link">
          Song-Listen
        </Link>
        <Link to="/profile" className="navbar-link">
          Profile
        </Link>
        {isAdmin && (
          <Link to="/admin" className="navbar-link">
            Admin-Panel
          </Link>
        )}
      </div>

      {!isOnline && (
        <div className="connection-indicator is-offline" aria-live="polite">
          <span className="connection-dot" aria-hidden="true" />
          <span>Offline (Read-Only)</span>
        </div>
      )}

      <div className="navbar-actions">
        <button
          type="button"
          onClick={toggleTheme}
          className="navbar-theme-toggle"
          aria-label={
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
          }
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button onClick={handleLogout} className="navbar-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
