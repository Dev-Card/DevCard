<script lang="ts">
  import { PLATFORMS, getProfileUrl } from '@devcard/shared';
  import { onMount } from 'svelte';

  let { data } = $props();
  const profile = data.profile;
  const error = data.error;

  const platformColors: Record<string, string> = {
    github: '#181717', linkedin: '#0A66C2', twitter: '#000000',
    gitlab: '#FC6D26', devfolio: '#3770FF', npm: '#CB3837',
    devto: '#0A0A0A', hashnode: '#2962FF', medium: '#000000',
    leetcode: '#FFA116', hackerrank: '#00EA64', discord: '#5865F2',
    telegram: '#26A5E4', email: '#EA4335', portfolio: '#6366F1', custom: '#8B5CF6',
  };

  let mounted = $state(false);
  let copyMessage = $state('');
  let copyStatus = $state<'success' | 'error'>('success');
  let copyMessageTimeout: ReturnType<typeof setTimeout>;

  onMount(() => {
    mounted = true;

    return () => {
      if (copyMessageTimeout) {
        clearTimeout(copyMessageTimeout);
      }
    };
  });

  function showCopyMessage(message: string, status: 'success' | 'error') {
    copyMessage = message;
    copyStatus = status;

    if (copyMessageTimeout) {
      clearTimeout(copyMessageTimeout);
    }

    clearTimeout(copyTimeout);

    copyTimeout = setTimeout(() => {
      copyMessage = '';
    }, 3000);
  }

  async function copyProfileUrl() {
    if (!navigator.clipboard?.writeText) {
      showCopyMessage('Clipboard API unavailable. Copy the URL from your address bar.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      showCopyMessage('Profile link copied.', 'success');
    } catch {
      showCopyMessage('Could not copy link. Copy the URL from your address bar.', 'error');
    }
  }
</script>

<svelte:head>
  {#if profile}
    <title>{profile.displayName} | DevCard</title>
    <meta name="description" content="{profile.bio || `${profile.displayName}'s developer profiles`}" />
  {:else}
    <title>User Not Found | DevCard</title>
  {/if}
</svelte:head>

<div class="bg-gradient" style="--accent: {profile?.accentColor || '#6366f1'}"></div>

<main class="profile-container {mounted ? 'loaded' : ''}">
  {#if error || !profile}
    <div class="error-glass glass">
      <div class="error-emoji">😕</div>
      <h1>Profile not found</h1>
      <p>This DevCard has vanished into the digital void.</p>
      <a href="/" class="btn-primary">Return Home</a>
    </div>
  {:else}
    <div class="profile-card glass" style="--accent: {profile.accentColor}">
      <header class="profile-header">
        <div class="avatar-wrapper">
          {#if profile.avatarUrl}
            <img src={profile.avatarUrl} alt={profile.displayName} class="avatar" />
          {:else}
            <div class="avatar avatar-placeholder" style="background: {profile.accentColor}">
              {profile.displayName.charAt(0).toUpperCase()}
            </div>
          {/if}
          <div class="avatar-glow" style="background: {profile.accentColor}"></div>
        </div>
        
        <h1 class="display-name">{profile.displayName}</h1>
        {#if profile.role}
          <div class="role-badge">
            {profile.role}{profile.company ? ` @ ${profile.company}` : ''}
          </div>
        {/if}
        
        {#if profile.bio}
          <p class="bio">{profile.bio}</p>
        {/if}
      </header>

      <div class="links-grid">
        {#each profile.links as link, i}
          {@const platform = PLATFORMS[link.platform]}
          {@const color = platformColors[link.platform] || '#6366f1'}
          <a
            href={link.url || getProfileUrl(link.platform, link.username)}
            target="_blank"
            rel="noopener noreferrer"
            class="link-tile glass"
            style="--delay: {i * 0.1}s"
          >
            <div class="tile-icon" style="background: {color}">
              <span class="platform-initial">{platform?.name.charAt(0) || '?'}</span>
            </div>
            <div class="tile-content">
              <span class="platform-name">{platform?.name || link.platform}</span>
              <span class="username">@{link.username}</span>
            </div>
            <span class="arrow">→</span>
          </a>
        {/each}
      </div>
      
      <footer class="card-footer">
        <p>Verified Developer Profile</p>
        <div class="logo-sm">⚡ DevCard</div>
      </footer>
    </div>

    <div class="get-your-own">
      <p>Want a card like this?</p>
      <div class="profile-actions">
        <a href="/" class="gradient-text get-devcard-link">Create your DevCard ⚡</a>
        <button type="button" class="copy-link-button" onclick={copyProfileUrl}>
          Copy Link
        </button>
      </div>
      {#if copyMessage}
        <p class="copy-message {copyStatus}" aria-live="polite">
          {copyMessage}
        </p>
      {/if}
    </div>
  {/if}
</main>

<style>
  .bg-gradient {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, var(--accent), transparent 50%),
                #020617;
    opacity: 0.18;
    z-index: -1;
  }

  .profile-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: clamp(2rem, 6vw, 5rem) 1.25rem 3rem;
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.65s ease, transform 0.65s ease;
  }

  .profile-container.loaded {
    opacity: 1;
    transform: translateY(0);
  }

  .profile-card {
    width: 100%;
    max-width: 540px;
    border-radius: var(--radius-xl);
    padding: 2.5rem 2rem;
    box-shadow: 0 26px 60px -20px rgba(0, 0, 0, 0.55);
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.96);
  }

  .profile-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .avatar-wrapper {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto 1.75rem;
  }

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 32% 68% 63% 37% / 34% 36% 64% 66%;
    object-fit: cover;
    border: 3px solid rgba(255, 255, 255, 0.18);
    position: relative;
    z-index: 2;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    border-radius: 32% 68% 63% 37% / 34% 36% 64% 66%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    font-weight: 800;
    color: white;
  }

  .display-name {
    font-size: clamp(2rem, 4vw, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 0.75rem;
  }

  .role-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.45rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  .bio {
    color: var(--text-secondary);
    font-size: 1rem;
    line-height: 1.85;
    max-width: 640px;
    margin: 0 auto;
  }

  .links-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .link-tile {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-radius: calc(var(--radius) * 1.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 12px 30px -18px rgba(0, 0, 0, 0.35);
    transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
    animation: slideIn 0.5s ease-out forwards;
    animation-delay: var(--delay);
    opacity: 0;
  }

  .link-tile:hover,
  .link-tile:focus-visible {
    background: rgba(255, 255, 255, 0.13);
    transform: translateY(-2px);
    border-color: rgba(99, 102, 241, 0.35);
  }

  .link-tile:focus-visible {
    outline: 3px solid rgba(99, 102, 241, 0.2);
    outline-offset: 3px;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .tile-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 1.1rem;
    box-shadow: 0 8px 18px -10px rgba(0,0,0,0.4);
  }

  .tile-content {
    flex: 1;
    margin-left: 1.1rem;
  }

  .platform-name {
    display: block;
    font-weight: 700;
    font-size: 1rem;
  }

  .username {
    display: block;
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-top: 0.1rem;
  }

  .arrow {
    opacity: 0.45;
    font-size: 1.2rem;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  .link-tile:hover .arrow {
    opacity: 1;
    transform: translateX(5px);
  }

  .card-footer {
    margin-top: 2.5rem;
    padding-top: 1.75rem;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.82rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .logo-sm {
    color: var(--text-secondary);
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
  }

  .get-your-own {
    margin-top: 2rem;
    text-align: center;
  }

  .get-your-own p {
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
    color: var(--text-muted);
  }

  .profile-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .get-devcard-link {
    font-weight: 700;
    font-size: 1.05rem;
  }

  .copy-link-button {
    border: 1px solid var(--border-glass);
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.65rem 1rem;
    transition: all 0.2s ease;
  }

  .copy-link-button:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .copy-link-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }

  .copy-message {
    min-height: 1.2rem;
    margin-top: 0.75rem;
    margin-bottom: 0;
    font-size: 0.85rem;
  }

  .copy-message.success {
    color: var(--text-secondary);
  }

  .copy-message.error {
    color: #ef4444;
  }

  .error-glass {
    text-align: center;
    padding: 3rem;
    border-radius: var(--radius-xl);
    width: min(100%, 520px);
  }

  @media (max-width: 720px) {
    .profile-card { padding: 2rem 1.5rem; }
    .profile-header { margin-bottom: 2rem; }
    .avatar-wrapper { width: 108px; height: 108px; margin-bottom: 1.5rem; }
    .card-footer { flex-direction: column; align-items: flex-start; }
  }

  @media (max-width: 520px) {
    .profile-container { padding: 2rem 1rem 2.5rem; }
    .display-name { font-size: 2rem; }
    .link-tile { padding: 0.95rem; }
    .tile-content { margin-left: 0.9rem; }
    .card-footer { text-align: left; }
  }
</style>
