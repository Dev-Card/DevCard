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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const APP_BASE_URL = import.meta.env.VITE_APP_URL ?? window.location.origin;
const MANAGED_META_SELECTOR = 'meta[data-devcard-profile-meta], link[data-devcard-profile-meta]';

function buildMetaDescription(profile: PublicProfile): string {
  const platformCount = profile.links.length;
  const platformSummary = platformCount === 1 ? '1 platform' : `${platformCount} platforms`;
  const fallback = `${profile.displayName}'s developer profile with ${platformSummary} connected on DevCard.`;

  if (!profile.bio) return fallback;
  return `${profile.bio} ${platformSummary} connected on DevCard.`;
}

function upsertMetaTag(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[data-devcard-profile-meta][${attribute}="${key}"]`,
  );

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.dataset.devcardProfileMeta = 'true';
  element.content = content;
}

function upsertCanonicalLink(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[data-devcard-profile-meta][rel="canonical"]',
  );

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  element.dataset.devcardProfileMeta = 'true';
  element.href = href;
}

function clearManagedProfileMeta(): void {
  document.head.querySelectorAll(MANAGED_META_SELECTOR).forEach((element) => element.remove());
}

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

  useEffect(() => {
    clearManagedProfileMeta();

    if (!username) return;

    const canonicalUrl = `${APP_BASE_URL}/u/${username}`;
    const ogImageUrl = `${API_BASE_URL}/api/u/${username}/og-image`;

    if (!profile) {
      if (error) {
        document.title = 'User Not Found | DevCard';
        upsertMetaTag('name', 'description', 'DevCard developer profile.');
        upsertCanonicalLink(canonicalUrl);
      }
      return;
    }

    const title = `${profile.displayName} | DevCard`;
    const description = buildMetaDescription(profile);

    document.title = title;
    upsertMetaTag('name', 'description', description);
    upsertCanonicalLink(canonicalUrl);

    upsertMetaTag('property', 'og:type', 'profile');
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:title', title);
    upsertMetaTag('property', 'og:description', description);
    upsertMetaTag('property', 'og:image', ogImageUrl);
    upsertMetaTag('property', 'og:image:width', '1200');
    upsertMetaTag('property', 'og:image:height', '630');
    upsertMetaTag('property', 'og:site_name', 'DevCard');

    upsertMetaTag('name', 'twitter:card', 'summary');
    upsertMetaTag('name', 'twitter:site', '@devcard');
    upsertMetaTag('name', 'twitter:title', title);
    upsertMetaTag('name', 'twitter:description', description);
    upsertMetaTag('name', 'twitter:image', ogImageUrl);

    return clearManagedProfileMeta;
  }, [profile, error, username]);

  useEffect(() => {
    return () => {
      document.title = 'DevCard';
      clearManagedProfileMeta();
    };
  }, []);

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
