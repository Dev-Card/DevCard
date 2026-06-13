import { Link } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import './Navbar.css';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar glass" id="main-nav">
      <div className="nav-content">
        <Link to="/" className="logo" id="nav-logo">
          <span>⚡</span>
          <span className="gradient-text">DevCard</span>
        </Link>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}
