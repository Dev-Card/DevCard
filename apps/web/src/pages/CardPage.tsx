import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { PublicCard } from '../shared';
import { apiFetch } from '../lib/api';
import './CardPage.css';

function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    github: '#181717', linkedin: '#0A66C2', twitter: '#000000',
    instagram: '#E4405F', youtube: '#FF0000', devto: '#0A0A0A',
    hashnode: '#2962FF', gitlab: '#FC6D26', devfolio: '#3770FF',
    npm: '#CB3837', medium: '#000000', leetcode: '#FFA116',
    hackerrank: '#00EA64', discord: '#5865F2', telegram: '#26A5E4',
    email: '#EA4335', portfolio: '#6366F1', custom: '#8B5CF6',
  };
  return colors[platform.toLowerCase()] || '#6366F1';
}

export default function CardPage() {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<PublicCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<PublicCard>(`/api/u/card/${id}`)
      .then((data) => {
        setCard(data);
        setError(null);
      })
      .catch(() => {
        setCard(null);
        setError('Card not found');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Update document title
  useEffect(() => {
    if (card) {
      document.title = `${card.title} | ${card.owner.displayName}`;
    } else if (error) {
      document.title = 'Card Not Found | DevCard';
    }
  }, [card, error]);

  if (loading) {
    return (
      <div className="card-page-container">
        <div className="card-wrapper">
          <div className="premium-card loading-card">
            <div className="skeleton skeleton-chip" />
            <div className="skeleton skeleton-avatar-card" />
            <div className="skeleton skeleton-name-card" />
            <div className="skeleton skeleton-role-card" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="card-page-container">
        <div className="card-wrapper">
          <div className="error-glass glass">
            <div className="error-emoji">😕</div>
            <h1>Card not found</h1>
            <p>This DevCard doesn't exist or has been removed.</p>
            <Link to="/" className="btn-primary">Return Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-page-container">
      <div className="card-wrapper">
        {/* Premium Obsidian Card */}
        <div className="premium-card" id="premium-card">
          <div className="card-glass" />

          <div className="card-top">
            <div className="brand-row">
              <div className="mini-chip" />
              <span className="brand-text">DevCard PRO</span>
            </div>
            <span className="contactless">📶</span>
          </div>

          <div className="card-mid">
            <div className="avatar-container">
              {card.owner.avatarUrl ? (
                <img
                  src={card.owner.avatarUrl}
                  alt={card.owner.displayName}
                  className="card-avatar"
                />
              ) : (
                <div
                  className="card-avatar-placeholder"
                  style={{ background: card.owner.accentColor || '#6366F1' }}
                >
                  {card.owner.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="main-info">
              <h1>{card.owner.displayName}</h1>
              <p className="role">
                {card.owner.role || 'Developer'}
                {card.owner.company ? ` @ ${card.owner.company}` : ''}
              </p>
              {card.owner.pronouns && (
                <p className="pronouns">{card.owner.pronouns}</p>
              )}
            </div>
          </div>

          <div className="card-bottom">
            <div className="bio-container">
              {card.owner.bio && <p className="bio-text">{card.owner.bio}</p>}
            </div>
            <div className="card-badge">
              <span>PLATINUM</span>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="action-section" id="card-connections">
          <h2>Connections</h2>
          <div className="platform-grid">
            {card.links.map((link) => (
              <button
                key={link.id}
                className="platform-tile"
                onClick={() => window.open(link.url, '_blank')}
                style={{ '--brand-color': getPlatformColor(link.platform) } as React.CSSProperties}
                id={`platform-tile-${link.platform}`}
              >
                <div className="tile-icon-card">
                  {link.platform.charAt(0).toUpperCase()}
                </div>
                <div className="tile-info">
                  <span className="platform-name-card">{link.platform}</span>
                  <span className="tile-username">@{link.username}</span>
                </div>
                <div className="tile-arrow">→</div>
              </button>
            ))}
          </div>
        </div>

        <footer className="card-page-footer">
          <p>
            Powered by <Link to="/">DevCard</Link> ⚡
          </p>
        </footer>
      </div>
    </div>
  );
}
