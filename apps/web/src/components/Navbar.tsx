import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import './Navbar.css';

type IconState = 'idle' | 'hiding' | 'showing';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [iconState, setIconState] = useState<IconState>('idle');
  const [displayedTheme, setDisplayedTheme] = useState(theme);
  const [glowing, setGlowing] = useState(false);

  const handleToggle = () => {
    if (iconState !== 'idle') return;
    setIconState('hiding');
    setGlowing(true);
  };

  const handleAnimationEnd = () => {
    if (iconState === 'hiding') {
      toggleTheme();
      setDisplayedTheme((t) => (t === 'dark' ? 'light' : 'dark'));
      setIconState('showing');
    } else if (iconState === 'showing') {
      setIconState('idle');
    }
  };

  return (
    <nav className="navbar glass" id="main-nav">
      <div className="nav-content">
        <Link to="/" className="logo" id="nav-logo">
          <span>⚡</span>
          <span className="gradient-text">DevCard</span>
        </Link>
        <button
          className={`theme-toggle${glowing ? ' glow' : ''}`}
          onClick={handleToggle}
          onAnimationEnd={(e) => {
            if (e.animationName === 'toggle-glow') setGlowing(false);
          }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          id="theme-toggle-btn"
        >
          <span
            className={`theme-toggle-icon ${iconState !== 'idle' ? iconState : ''}`}
            onAnimationEnd={handleAnimationEnd}
            aria-hidden="true"
          >
            {displayedTheme === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>
      </div>
    </nav>
  );
}