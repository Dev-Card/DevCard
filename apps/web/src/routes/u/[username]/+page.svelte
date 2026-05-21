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
  let copyMessageTimeout: ReturnType<typeof setTimeout> | undefined;

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

    copyMessageTimeout = setTimeout(() => {
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
      <p class="copy-message {copyStatus}" aria-live="polite">
        {copyMessage}
      </p>
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
    opacity: 0.15;
    z-index: -1;
  }

  .profile-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 1.5rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .profile-container.loaded {
    opacity: 1;
    transform: translateY(0);
  }

  .profile-card {
    width: 100%;
    max-width: 480px;
    border-radius: var(--radius-xl);
    padding: 3rem 2rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    position: relative;
    overflow: hidden;
  }

  .profile-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .avatar-wrapper {
    position: relative;
    width: 110px;
    height: 110px;
    margin: 0 auto 1.5rem;
  }

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 35% 65% 70% 30% / 30% 30% 70% 70%;
    object-fit: cover;
    border: 3px solid white;
    position: relative;
    z-index: 2;
    animation: morph 8s ease-in-out infinite;
  }

  @keyframes morph {
    0%, 100% { border-radius: 35% 65% 70% 30% / 30% 30% 70% 70%; }
    50% { border-radius: 65% 35% 30% 70% / 70% 70% 30% 30%; }
  }

  .avatar-glow {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    filter: blur(20px);
    opacity: 0.4;
    z-index: 1;
    border-radius: 50%;
  }

  .display-name {
    font-size: 2.25rem;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 0.5rem;
  }

  .role-badge {
    display: inline-block;
    padding: 0.4rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  .bio {
    color: var(--text-secondary);
    font-size: 1rem;
    line-height: 1.6;
    max-width: 320px;
    margin: 0 auto;
  }

  .links-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .link-tile {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-radius: var(--radius-lg);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: slideIn 0.5s ease-out forwards;
    animation-delay: var(--delay);
    opacity: 0;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .link-tile:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.02) translateX(5px);
  }

  .tile-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 1.2rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  .tile-content {
    flex: 1;
    margin-left: 1.25rem;
  }

  .platform-name {
    display: block;
    font-weight: 700;
    font-size: 1.05rem;
  }

  .username {
    display: block;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .arrow {
    opacity: 0.3;
    font-size: 1.2rem;
    transition: all 0.3s;
  }

  .link-tile:hover .arrow {
    opacity: 1;
    transform: translateX(5px);
  }

  .card-footer {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255,255,255,0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .logo-sm {
    color: var(--text-secondary);
    font-family: 'Outfit', sans-serif;
  }

  .get-your-own {
    margin-top: 3rem;
    text-align: center;
  }

  .get-your-own p {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
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
    font-size: 1.1rem;
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
    padding: 4rem;
    border-radius: var(--radius-xl);
  }

  @media (max-width: 480px) {
    .profile-card { padding: 2rem 1.5rem; }
    .display-name { font-size: 1.75rem; }
  }
</style>
