import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PLATFORMS, getProfileUrl } from '../shared';
import type { PublicProfile } from '../shared';
import { apiFetch } from '../lib/api';
import './ProfilePage.css';

const platformColors: Record<string, string> = {
  github: '#181717', linkedin: '#0A66C2', twitter: '#000000',
  gitlab: '#FC6D26', devfolio: '#3770FF', npm: '#CB3837',
  devto: '#0A0A0A', hashnode: '#2962FF', medium: '#000000',
  leetcode: '#FFA116', hackerrank: '#00EA64', discord: '#5865F2',
  telegram: '#26A5E4', email: '#EA4335', portfolio: '#6366F1', custom: '#8B5CF6',
};

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [copyStatus, setCopyStatus] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    apiFetch<PublicProfile>(`/api/u/${username}?source=web`)
      .then((data) => {
        setProfile(data);
        setError(null);
      })
      .catch(() => {
        setProfile(null);
        setError('User not found');
      })
      .finally(() => setLoading(false));
  }, [username]);

  async function copyProfileUrl() {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage('Clipboard API unavailable. Copy the URL from your address bar.');
      setCopyStatus('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage('Profile link copied.');
      setCopyStatus('success');
    } catch {
      setCopyMessage('Could not copy link. Copy the URL from your address bar.');
      setCopyStatus('error');
    }
    setTimeout(() => setCopyMessage(''), 3000);
  }

  // Update document title
  useEffect(() => {
    if (profile) {
      document.title = `${profile.displayName} | DevCard`;
    } else if (error) {
      document.title = 'User Not Found | DevCard';
    }
  }, [profile, error]);

  if (loading) {
    return (
      <>
        <div className="bg-gradient" />
        <main className="profile-container loaded">
          <div className="profile-card glass loading-card">
            <div className="skeleton skeleton-avatar" />
            <div className="skeleton skeleton-name" />
            <div className="skeleton skeleton-role" />
            <div className="skeleton skeleton-bio" />
            <div className="skeleton skeleton-link" />
            <div className="skeleton skeleton-link" />
          </div>
        </main>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <div className="bg-gradient" />
        <main className="profile-container loaded">
          <div className="error-glass glass">
            <div className="error-emoji">😕</div>
            <h1>Profile not found</h1>
            <p>This DevCard has vanished into the digital void.</p>
            <Link to="/" className="btn-primary">Return Home</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <div
        className="bg-gradient"
        style={{ '--accent': profile.accentColor || '#6366f1' } as React.CSSProperties}
      />
      <main className={`profile-container ${mounted ? 'loaded' : ''}`}>
        <div
          className="profile-card glass"
          style={{ '--accent': profile.accentColor } as React.CSSProperties}
          id="profile-card"
        >
          <header className="profile-header">
            <div className="avatar-wrapper">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="avatar"
                />
              ) : (
                <div
                  className="avatar avatar-placeholder"
                  style={{ background: profile.accentColor }}
                >
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="avatar-glow" style={{ background: profile.accentColor }} />
            </div>

            <h1 className="display-name">{profile.displayName}</h1>
            {profile.role && (
              <div className="role-badge">
                {profile.role}{profile.company ? ` @ ${profile.company}` : ''}
              </div>
            )}
            {profile.bio && <p className="bio">{profile.bio}</p>}
          </header>

          <div className="links-grid" id="profile-links">
            {profile.links.map((link, i) => {
              const platform = PLATFORMS[link.platform];
              const color = platformColors[link.platform] || '#6366f1';
              return (
                <a
                  key={link.id}
                  href={link.url || getProfileUrl(link.platform, link.username)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-tile glass"
                  style={{ '--delay': `${i * 0.1}s` } as React.CSSProperties}
                  id={`link-tile-${link.platform}`}
                >
                  <div className="tile-icon" style={{ background: color }}>
                    <span className="platform-initial">
                      {platform?.name.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="tile-content">
                    <span className="platform-name">
                      {platform?.name || link.platform}
                    </span>
                    <span className="username">@{link.username}</span>
                  </div>
                  <span className="arrow">→</span>
                </a>
              );
            })}
          </div>

          <footer className="card-footer">
            <p>Verified Developer Profile</p>
            <div className="logo-sm">⚡ DevCard</div>
          </footer>
        </div>

        <div className="get-your-own">
          <p>Want a card like this?</p>
          <div className="profile-actions">
            <Link to="/" className="gradient-text get-devcard-link">
              Create your DevCard ⚡
            </Link>
            <button
              type="button"
              className="copy-link-button"
              onClick={copyProfileUrl}
              id="copy-link-btn"
            >
              Copy Link
            </button>
          </div>
          {copyMessage && (
            <p className={`copy-message ${copyStatus}`} aria-live="polite">
              {copyMessage}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
