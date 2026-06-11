import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PLATFORMS, type PlatformLink, type User } from '../shared';
import { apiFetch } from '../lib/api';
import { clearStoredToken, getStoredToken } from '../lib/auth';
import './DashboardPage.css';

type DashboardProfile = User & {
  defaultCardId: string | null;
  platformLinks: PlatformLink[];
};

type EditableLink = PlatformLink & {
  saving?: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

const platformOptions = Object.values(PLATFORMS).filter((platform) => platform.id !== 'discord');

const PLACEHOLDERS: Record<string, string> = {
  github: 'Username (e.g. octocat)',
  linkedin: 'Username (e.g. john-doe)',
  twitter: 'Username (e.g. jack)',
  gitlab: 'Username',
  devfolio: 'Username',
  npm: 'Username',
  devto: 'Username',
  hashnode: 'Username',
  medium: 'Username',
  leetcode: 'Username',
  hackerrank: 'Username',
  stackoverflow: 'User ID (e.g. 12345)',
  telegram: 'Username',
  email: 'Email address (e.g. hello@example.com)',
  portfolio: 'Full URL (e.g. https://mywebsite.com)',
  custom: 'Full URL (e.g. https://example.com)',
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [links, setLinks] = useState<EditableLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile fields state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [accentColor, setAccentColor] = useState('#6366f1');

  // New link state
  const [newPlatform, setNewPlatform] = useState('github');
  const [newHandle, setNewHandle] = useState('');

  const token = getStoredToken();

  function handleUnauthorized() {
    clearStoredToken();
    navigate('/login');
  }

  function showSuccess(message: string) {
    setSuccess(message);
    setError('');
    setTimeout(() => {
      setSuccess('');
    }, 2600);
  }

  function applyProfile(data: DashboardProfile) {
    setProfile(data);
    setLinks(data.platformLinks.map((link) => ({ ...link })));
    setDisplayName(data.displayName);
    setUsername(data.username);
    setBio(data.bio ?? '');
    setRole(data.role ?? '');
    setCompany(data.company ?? '');
    setAccentColor(data.accentColor);
  }

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    apiFetch<DashboardProfile>('/api/profiles/me', {
      token,
      onUnauthorized: handleUnauthorized,
    })
      .then((data) => {
        applyProfile(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  async function saveProfile() {
    if (!token) return;
    setSavingProfile(true);
    setError('');

    try {
      const updated = await apiFetch<DashboardProfile>('/api/profiles/me', {
        method: 'PUT',
        token,
        body: {
          displayName,
          username,
          bio: bio || null,
          role: role || null,
          company: company || null,
          accentColor,
        },
        onUnauthorized: handleUnauthorized,
      });

      if (profile) {
        applyProfile({ ...profile, ...updated, platformLinks: links });
      }
      showSuccess('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newHandle.trim()) return;
    setSavingLink(true);
    setError('');

    try {
      const created = await apiFetch<PlatformLink>('/api/profiles/me/links', {
        method: 'POST',
        token,
        body: { platform: newPlatform, username: newHandle.trim() },
        onUnauthorized: handleUnauthorized,
      });
      setLinks((prev) => [...prev, { ...created }]);
      setNewHandle('');
      showSuccess('Link added.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add link.');
    } finally {
      setSavingLink(false);
    }
  }

  async function updateLink(link: EditableLink) {
    if (!token || !link.username.trim()) return;
    
    // Set loading for this link
    setLinks((prev) =>
      prev.map((item) => (item.id === link.id ? { ...item, saving: true } : item))
    );
    setError('');

    try {
      const updated = await apiFetch<PlatformLink>(`/api/profiles/me/links/${link.id}`, {
        method: 'PUT',
        token,
        body: { platform: link.platform, username: link.username.trim() },
        onUnauthorized: handleUnauthorized,
      });
      setLinks((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...updated, saving: false } : item))
      );
      showSuccess('Link updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update link.');
      setLinks((prev) =>
        prev.map((item) => (item.id === link.id ? { ...item, saving: false } : item))
      );
    }
  }

  async function deleteLink(linkId: string) {
    if (!token) return;
    setError('');

    try {
      await apiFetch<void>(`/api/profiles/me/links/${linkId}`, {
        method: 'DELETE',
        token,
        onUnauthorized: handleUnauthorized,
      });
      setLinks((prev) => prev.filter((link) => link.id !== linkId));
      showSuccess('Link removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove link.');
    }
  }

  const publicUrl = profile ? `${window.location.origin}/u/${profile.username}` : '';
  const qrUrl = profile ? `${API_BASE_URL}/api/u/${profile.username}/qr?format=svg&size=360` : '';

  async function copyPublicUrl() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      showSuccess('Public profile URL copied.');
    } catch (err) {
      setError('Failed to copy profile URL to clipboard.');
    }
  }

  function handleLogout() {
    clearStoredToken();
    navigate('/login');
  }

  if (loading) {
    return (
      <main className="dashboard">
        <section className="status-panel glass">
          <p>Loading dashboard...</p>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="dashboard">
        <section className="status-panel glass">
          <p>{error || 'Dashboard unavailable.'}</p>
          <Link to="/login" className="btn-primary">Log in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <Link to="/" className="brand">DevCard</Link>
        <nav>
          <Link to={`/u/${profile.username}`} target="_blank" rel="noreferrer">Public profile</Link>
          <button type="button" className="text-button" onClick={handleLogout}>Log out</button>
        </nav>
      </header>

      <section className="hero-row">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>{profile.displayName}</h1>
          <p className="muted">Manage the public developer links shown when someone scans your QR.</p>
        </div>
        <div className="qr-panel glass">
          <img src={qrUrl} alt={`QR code for ${profile.displayName}`} />
          <div>
            <p className="qr-label">Scan URL</p>
            <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
          </div>
          <button type="button" className="btn-secondary" onClick={copyPublicUrl}>Copy URL</button>
        </div>
      </section>

      {error && (
        <p className="alert error" role="alert">{error}</p>
      )}
      {success && (
        <p className="alert success" role="status">{success}</p>
      )}

      <div className="dashboard-grid">
        <section className="panel glass">
          <div className="panel-heading">
            <h2>Profile</h2>
            <button className="btn-primary compact" type="button" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save'}
            </button>
          </div>

          <div className="form-grid">
            <label>
              <span>Display name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} />
            </label>
            <label>
              <span>Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={50} pattern="[A-Za-z0-9_-]+" />
            </label>
            <label>
              <span>Role</span>
              <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={100} />
            </label>
            <label>
              <span>Company</span>
              <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={100} />
            </label>
            <label className="wide">
              <span>Bio</span>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={4}></textarea>
            </label>
            <label>
              <span>Accent color</span>
              <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} type="color" />
            </label>
          </div>
        </section>

        <section className="panel glass">
          <div className="panel-heading">
            <h2>Social Links</h2>
            <span className="count">{links.length}</span>
          </div>

          <form className="add-link" onSubmit={addLink}>
            <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} aria-label="Platform">
              {platformOptions.map((platform) => (
                <option key={platform.id} value={platform.id}>{platform.name}</option>
              ))}
            </select>
            <input
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              placeholder={PLACEHOLDERS[newPlatform] ?? 'Username or URL'}
              aria-label="Username or URL"
            />
            <button className="btn-primary compact" type="submit" disabled={savingLink}>
              {savingLink ? 'Adding...' : 'Add'}
            </button>
          </form>

          <div className="link-list">
            {links.length === 0 ? (
              <p className="empty">Add your first link to make your QR useful.</p>
            ) : (
              links.map((link) => (
                <article className="link-row" key={link.id}>
                  <select
                    value={link.platform}
                    onChange={(e) => {
                      const updatedPlatform = e.target.value;
                      setLinks((prev) =>
                        prev.map((item) => (item.id === link.id ? { ...item, platform: updatedPlatform } : item))
                      );
                    }}
                    aria-label="Platform for link"
                  >
                    {platformOptions.map((platform) => (
                      <option key={platform.id} value={platform.id}>{platform.name}</option>
                    ))}
                  </select>
                  <input
                    value={link.username}
                    onChange={(e) => {
                      const updatedUsername = e.target.value;
                      setLinks((prev) =>
                        prev.map((item) => (item.id === link.id ? { ...item, username: updatedUsername } : item))
                      );
                    }}
                    aria-label="Username for link"
                  />
                  <button
                    type="button"
                    className="btn-secondary compact"
                    onClick={() => updateLink(link)}
                    disabled={link.saving}
                  >
                    {link.saving ? 'Saving...' : 'Update'}
                  </button>
                  <button type="button" className="danger-button compact" onClick={() => deleteLink(link.id)}>
                    Remove
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
