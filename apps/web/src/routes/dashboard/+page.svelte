<script lang="ts">
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { PLATFORMS, type PlatformLink, type User } from '@devcard/shared';
  import { apiRequest } from '$lib/apiClient';
  import { clearStoredToken, getStoredToken } from '$lib/auth';

  type DashboardProfile = User & {
    defaultCardId: string | null;
    platformLinks: PlatformLink[];
  };

  type EditableLink = PlatformLink & {
    saving?: boolean;
  };

  // Empty string in browser → Vite proxy forwards /api to backend (no CORS).
  const API_BASE_URL = typeof window !== 'undefined' ? '' : (import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3000');
  const platformOptions = Object.values(PLATFORMS).filter((platform) => platform.id !== 'discord');

  let token = $state<string | null>(null);
  let profile = $state<DashboardProfile | null>(null);
  let links = $state<EditableLink[]>([]);
  let loading = $state(true);
  let savingProfile = $state(false);
  let savingLink = $state(false);
  let error = $state('');
  let success = $state('');

  let displayName = $state('');
  let username = $state('');
  let bio = $state('');
  let role = $state('');
  let company = $state('');
  let accentColor = $state('#6366f1');

  let newPlatform = $state('github');
  let newHandle = $state('');

  let publicUrl = $derived(profile && browser ? `${window.location.origin}/u/${profile.username}` : '');
  let qrUrl = $derived(profile ? `${API_BASE_URL}/api/u/${profile.username}/qr?format=svg&size=360` : '');

  function handleUnauthorized() {
    clearStoredToken();
    void goto('/login');
  }

  function showSuccess(message: string) {
    success = message;
    error = '';
    setTimeout(() => {
      success = '';
    }, 2600);
  }

  function applyProfile(data: DashboardProfile) {
    profile = data;
    links = data.platformLinks.map((link) => ({ ...link }));
    displayName = data.displayName;
    username = data.username;
    bio = data.bio ?? '';
    role = data.role ?? '';
    company = data.company ?? '';
    accentColor = data.accentColor;
  }

  async function loadDashboard() {
    token = getStoredToken();

    if (!token) {
      await goto('/login');
      return;
    }

    loading = true;
    error = '';

    try {
      const data = await apiRequest<DashboardProfile>('/api/profiles/me', {
        token,
        onUnauthorized: handleUnauthorized,
      });
      applyProfile(data);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard.';
    } finally {
      loading = false;
    }
  }

  async function saveProfile() {
    if (!token) return;
    savingProfile = true;
    error = '';

    try {
      const updated = await apiRequest<DashboardProfile>('/api/profiles/me', {
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
      error = err instanceof Error ? err.message : 'Failed to save profile.';
    } finally {
      savingProfile = false;
    }
  }

  async function addLink() {
    if (!token || !newHandle.trim()) return;
    savingLink = true;
    error = '';

    try {
      const created = await apiRequest<PlatformLink>('/api/profiles/me/links', {
        method: 'POST',
        token,
        body: { platform: newPlatform, username: newHandle.trim() },
        onUnauthorized: handleUnauthorized,
      });
      links = [...links, { ...created }];
      newHandle = '';
      showSuccess('Link added.');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add link.';
    } finally {
      savingLink = false;
    }
  }

  async function updateLink(link: EditableLink) {
    if (!token || !link.username.trim()) return;
    link.saving = true;
    links = [...links];
    error = '';

    try {
      const updated = await apiRequest<PlatformLink>(`/api/profiles/me/links/${link.id}`, {
        method: 'PUT',
        token,
        body: { platform: link.platform, username: link.username.trim() },
        onUnauthorized: handleUnauthorized,
      });
      links = links.map((item) => (item.id === updated.id ? { ...updated } : item));
      showSuccess('Link updated.');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update link.';
    } finally {
      link.saving = false;
      links = [...links];
    }
  }

  async function deleteLink(linkId: string) {
    if (!token) return;
    error = '';

    try {
      await apiRequest<void>(`/api/profiles/me/links/${linkId}`, {
        method: 'DELETE',
        token,
        onUnauthorized: handleUnauthorized,
      });
      links = links.filter((link) => link.id !== linkId);
      showSuccess('Link removed.');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to remove link.';
    }
  }

  async function copyPublicUrl() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    showSuccess('Public profile URL copied.');
  }

  function logout() {
    clearStoredToken();
    void goto('/login');
  }

  onMount(() => {
    void loadDashboard();
  });
</script>

<svelte:head>
  <title>Dashboard | DevCard</title>
</svelte:head>

<main class="dashboard">
  <header class="topbar">
    <a href="/" class="brand">DevCard</a>
    <nav>
      {#if profile}
        <a href="/u/{profile.username}" target="_blank" rel="noreferrer">Public profile</a>
      {/if}
      <button type="button" class="text-button" onclick={logout}>Log out</button>
    </nav>
  </header>

  {#if loading}
    <section class="status-panel glass">
      <p>Loading dashboard...</p>
    </section>
  {:else if !profile}
    <section class="status-panel glass">
      <p>{error || 'Dashboard unavailable.'}</p>
      <a href="/login" class="btn-primary">Log in</a>
    </section>
  {:else}
    <section class="hero-row">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>{profile.displayName}</h1>
        <p class="muted">Manage the public developer links shown when someone scans your QR.</p>
      </div>
      <div class="qr-panel glass">
        <img src={qrUrl} alt="QR code for {profile.displayName}" />
        <div>
          <p class="qr-label">Scan URL</p>
          <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
        </div>
        <button type="button" class="btn-secondary" onclick={copyPublicUrl}>Copy URL</button>
      </div>
    </section>

    {#if error}
      <p class="alert error" role="alert">{error}</p>
    {/if}
    {#if success}
      <p class="alert success" role="status">{success}</p>
    {/if}

    <div class="dashboard-grid">
      <section class="panel glass">
        <div class="panel-heading">
          <h2>Profile</h2>
          <button class="btn-primary compact" type="button" onclick={saveProfile} disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div class="form-grid">
          <label>
            <span>Display name</span>
            <input bind:value={displayName} maxlength="100" />
          </label>
          <label>
            <span>Username</span>
            <input bind:value={username} minlength="3" maxlength="50" pattern="[A-Za-z0-9_-]+" />
          </label>
          <label>
            <span>Role</span>
            <input bind:value={role} maxlength="100" />
          </label>
          <label>
            <span>Company</span>
            <input bind:value={company} maxlength="100" />
          </label>
          <label class="wide">
            <span>Bio</span>
            <textarea bind:value={bio} maxlength="300" rows="4"></textarea>
          </label>
          <label>
            <span>Accent color</span>
            <input bind:value={accentColor} type="color" />
          </label>
        </div>
      </section>

      <section class="panel glass">
        <div class="panel-heading">
          <h2>Social Links</h2>
          <span class="count">{links.length}</span>
        </div>

        <form class="add-link" onsubmit={(event) => { event.preventDefault(); void addLink(); }}>
          <select bind:value={newPlatform} aria-label="Platform">
            {#each platformOptions as platform}
              <option value={platform.id}>{platform.name}</option>
            {/each}
          </select>
          <input
            bind:value={newHandle}
            placeholder={PLATFORMS[newPlatform]?.usernamePlaceholder ?? 'Username or URL'}
            aria-label="Username or URL"
          />
          <button class="btn-primary compact" type="submit" disabled={savingLink}>
            {savingLink ? 'Adding...' : 'Add'}
          </button>
        </form>

        <div class="link-list">
          {#if links.length === 0}
            <p class="empty">Add your first link to make your QR useful.</p>
          {:else}
            {#each links as link (link.id)}
              <article class="link-row">
                <select bind:value={link.platform} aria-label="Platform for link">
                  {#each platformOptions as platform}
                    <option value={platform.id}>{platform.name}</option>
                  {/each}
                </select>
                <input bind:value={link.username} aria-label="Username for link" />
                <button type="button" class="btn-secondary compact" onclick={() => updateLink(link)} disabled={link.saving}>
                  {link.saving ? 'Saving...' : 'Update'}
                </button>
                <button type="button" class="danger-button compact" onclick={() => deleteLink(link.id)}>
                  Remove
                </button>
              </article>
            {/each}
          {/if}
        </div>
      </section>
    </div>
  {/if}
</main>

<style>
  .dashboard {
    width: min(1180px, calc(100% - 2rem));
    margin: 0 auto;
    padding: 1.25rem 0 3rem;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 0 2rem;
  }

  .brand {
    font-family: 'Outfit', sans-serif;
    font-size: 1.35rem;
    font-weight: 900;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--text-secondary);
    font-weight: 700;
  }

  .text-button {
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-weight: 800;
  }

  .hero-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
    gap: 1.25rem;
    align-items: end;
    margin-bottom: 1.25rem;
  }

  .eyebrow {
    color: var(--primary);
    font-size: 0.78rem;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 0.65rem;
  }

  h1 {
    font-size: clamp(2rem, 4vw, 3.5rem);
    margin-bottom: 0.75rem;
  }

  h2 {
    font-size: 1.2rem;
  }

  .muted,
  .empty {
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .qr-panel,
  .panel,
  .status-panel {
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.78);
  }

  :global(html.dark) .qr-panel,
  :global(html.dark) .panel,
  :global(html.dark) .status-panel {
    background: rgba(15, 23, 42, 0.82);
  }

  .qr-panel {
    display: grid;
    gap: 0.85rem;
    padding: 1rem;
  }

  .qr-panel img {
    width: 160px;
    height: 160px;
    border-radius: 10px;
    background: #fff;
    padding: 0.5rem;
  }

  .qr-label {
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
    text-transform: uppercase;
  }

  .qr-panel a {
    color: var(--primary);
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 1.25rem;
  }

  .panel,
  .status-panel {
    padding: 1.25rem;
  }

  .status-panel {
    display: grid;
    gap: 1rem;
    justify-items: start;
  }

  .panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.1rem;
  }

  .count {
    border-radius: 999px;
    background: rgba(99, 102, 241, 0.14);
    color: var(--primary);
    font-weight: 900;
    min-width: 2rem;
    padding: 0.25rem 0.65rem;
    text-align: center;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .wide {
    grid-column: 1 / -1;
  }

  label {
    display: grid;
    gap: 0.45rem;
    color: var(--text-secondary);
    font-weight: 800;
  }

  input,
  select,
  textarea {
    min-width: 0;
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    padding: 0.8rem 0.9rem;
  }

  input[type='color'] {
    height: 46px;
    padding: 0.25rem;
  }

  textarea {
    resize: vertical;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: var(--primary);
    outline: 3px solid rgba(99, 102, 241, 0.18);
  }

  .add-link,
  .link-row {
    display: grid;
    grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
  }

  .link-list {
    display: grid;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .link-row {
    grid-template-columns: minmax(120px, 150px) minmax(0, 1fr) auto auto;
    border-top: 1px solid var(--border);
    padding-top: 0.75rem;
  }

  .compact {
    min-height: 42px;
    padding: 0.7rem 1rem;
    white-space: nowrap;
  }

  .danger-button {
    border: 1px solid rgba(239, 68, 68, 0.28);
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
  }

  .alert {
    border-radius: 10px;
    font-weight: 800;
    margin-bottom: 1rem;
    padding: 0.85rem 1rem;
  }

  .alert.error {
    background: rgba(239, 68, 68, 0.12);
    color: #b91c1c;
  }

  .alert.success {
    background: rgba(34, 197, 94, 0.14);
    color: #15803d;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  @media (max-width: 920px) {
    .hero-row,
    .dashboard-grid {
      grid-template-columns: 1fr;
    }

    .qr-panel {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: center;
    }

    .qr-panel .btn-secondary {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 660px) {
    .dashboard {
      width: min(100% - 1rem, 1180px);
    }

    .topbar,
    nav {
      align-items: flex-start;
      flex-direction: column;
    }

    .form-grid,
    .add-link,
    .link-row {
      grid-template-columns: 1fr;
    }

    .qr-panel {
      grid-template-columns: 1fr;
    }
  }
</style>
