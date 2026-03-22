import '../styles/navbar.css';
import { Link, useNavigate } from 'react-router';
import AuthService from '../services/auth.service';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function Navbar() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  async function handleLogout() {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout handling failed:', error);
    }

    navigate('/login', { replace: true });
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          <img
            src="/songtexts-icon.svg?v=2"
            alt="Campfire Songs Icon"
            className="navbar-logo-icon"
          />
          <span className="navbar-logo-text">
            <span className="navbar-logo-campfire">Campfire</span>
            <span className="navbar-logo-songs">Songs</span>
          </span>
        </Link>
        <Link to="/profile" className="navbar-link">
          Profile
        </Link>
      </div>

      <div
        className={
          'connection-indicator ' + (isOnline ? 'is-online' : 'is-offline')
        }
        aria-live="polite"
      >
        <span className="connection-dot" aria-hidden="true" />
        <span>{isOnline ? 'Online' : 'Offline (Read-Only)'}</span>
      </div>

      <button onClick={handleLogout} className="navbar-logout">
        Logout
      </button>
    </nav>
  );
}

export default Navbar;
