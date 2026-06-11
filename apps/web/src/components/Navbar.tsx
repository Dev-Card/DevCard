import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { getStoredToken, clearStoredToken } from '../lib/auth';
import './Navbar.css';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!getStoredToken());
  }, []);

  function handleLogout() {
    clearStoredToken();
    setHasToken(false);
    navigate('/');
  }

  return (
    <nav className="navbar glass" id="main-nav">
      <div className="nav-content">
        <Link to="/" className="logo" id="nav-logo">
          <span>⚡</span>
          <span className="gradient-text">DevCard</span>
        </Link>
        <div className="nav-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            id="theme-toggle-btn"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {hasToken ? (
            <>
              <Link to="/dashboard" className="btn-secondary" id="nav-dashboard">Dashboard</Link>
              <button onClick={handleLogout} className="btn-primary" id="nav-logout">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary" id="nav-login">Log in</Link>
              <Link to="/signup" className="btn-primary" id="nav-signup">Create card</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
