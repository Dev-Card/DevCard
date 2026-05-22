<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, tick } from 'svelte';
  import QRCode from 'qrcode';

  const platformColors: Record<string, string> = {
    github: '#181717',
    linkedin: '#0A66C2',
    twitter: '#000000',
    instagram: '#E1306C',
    youtube: '#FF0000',
    devto: '#0A0A0A',
    leetcode: '#FFA116',
    portfolio: '#6366F1'
  };

  const platformNames: Record<string, string> = {
    github: 'GitHub',
    linkedin: 'LinkedIn',
    twitter: 'Twitter / X',
    instagram: 'Instagram',
    youtube: 'YouTube',
    devto: 'Dev.to',
    leetcode: 'LeetCode',
    portfolio: 'Portfolio'
  };

  const platformInitials: Record<string, string> = {
    github: 'GH',
    linkedin: 'IN',
    twitter: '𝕏',
    instagram: 'IG',
    youtube: 'YT',
    devto: 'DV',
    leetcode: 'LC',
    portfolio: '🌐'
  };

  let profile = $state<any>(null);
  let errorStatus = $state<string | null>(null);
  let mounted = $state(false);
  let canvasElement = $state<HTMLCanvasElement | null>(null);

  let copyMessage = $state('');
  let copyStatus = $state<'success' | 'error'>('success');
  let copyMessageTimeout: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    mounted = true;
    const routeUsername = $page.params.username;
    const key = `devcard_${routeUsername}`;
    const data = localStorage.getItem(key);

    if (data) {
      try {
        profile = JSON.parse(data);
        // Wait for Svelte DOM to render the canvas element before generating the QR code
        tick().then(() => {
          generateQRCode();
        });
      } catch (e) {
        errorStatus = 'Failed to parse card data';
      }
    } else {
      errorStatus = 'Card not found';
    }

    return () => {
      if (copyMessageTimeout) {
        clearTimeout(copyMessageTimeout);
      }
    };
  });

  async function generateQRCode() {
    if (!canvasElement) return;
    try {
      const url = window.location.href;
      await QRCode.toCanvas(canvasElement, url, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  }

  function downloadQR() {
    if (!canvasElement) return;
    try {
      const dataUrl = canvasElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `devcard-${profile?.username || 'profile'}-qr.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download QR code', err);
    }
  }

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
      showCopyMessage('Clipboard API unavailable. Copy URL from your address bar.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      showCopyMessage('Profile link copied.', 'success');
    } catch {
      showCopyMessage('Could not copy link.', 'error');
    }
  }
</script>

<svelte:head>
  {#if profile}
    <title>{profile.displayName} | DevCard</title>
    <meta name="description" content="{profile.bio || `${profile.displayName}'s developer profiles`}" />
  {:else}
    <title>Card Not Found | DevCard</title>
  {/if}
</svelte:head>

<div class="bg-gradient" style="--accent: {profile?.accentColor || '#6366f1'}"></div>

<main class="profile-container {mounted ? 'loaded' : ''}">
  {#if errorStatus}
    <div class="error-glass glass">
      <div class="error-emoji">😕</div>
      <h1>Card not found</h1>
      <p>This DevCard has vanished into the digital void.</p>
      <a href="/" class="btn-primary">Create yours</a>
    </div>
  {:else if !profile}
    <!-- Loading state -->
    <div class="error-glass glass">
      <div class="spinner">⚡</div>
      <p>Retrieving your DevCard...</p>
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
        <div class="role-badge">
          @{profile.username}
        </div>
        
        {#if profile.bio}
          <p class="bio">{profile.bio}</p>
        {/if}
      </header>

      <div class="links-grid">
        {#each profile.links as link, i}
          {@const color = platformColors[link.platform] || '#6366f1'}
          {@const name = platformNames[link.platform] || link.platform}
          {@const initial = platformInitials[link.platform] || '?'}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="link-tile glass"
            style="--delay: {i * 0.1}s"
          >
            <div class="tile-icon" style="background: {color}">
              <span class="platform-initial">{initial}</span>
            </div>
            <div class="tile-content">
              <span class="platform-name">{name}</span>
              <span class="username">@{link.username}</span>
            </div>
            <span class="arrow">→</span>
          </a>
        {/each}
      </div>

      <!-- QR Code Section -->
      <div class="qr-section glass">
        <canvas bind:this={canvasElement} class="qr-canvas"></canvas>
        <div class="qr-actions">
          <p class="qr-title">Share Your Profile</p>
          <p class="qr-hint">Scan to view or tap below to download QR as a high-quality PNG.</p>
          <button type="button" class="btn-qr-download" onclick={downloadQR}>
            💾 Download QR
          </button>
        </div>
      </div>
      
      <footer class="card-footer">
        <p>Verified Developer Profile</p>
        <div class="logo-sm">⚡ DevCard</div>
      </footer>
    </div>

    <div class="get-your-own">
      <div class="profile-actions">
        <a href="/" class="copy-link-button btn-home">🏠 Home</a>
        <a href="/?edit={profile.username}" class="copy-link-button btn-edit">✏️ Edit Card</a>
        <button type="button" class="copy-link-button btn-copy" onclick={copyProfileUrl}>
          📋 Copy Link
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
    text-decoration: none;
    color: inherit;
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

  /* --- QR Section Styles --- */
  .qr-section {
    margin-top: 2.25rem;
    padding: 1.5rem;
    border-radius: var(--radius-lg, 16px);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .qr-canvas {
    border-radius: 12px;
    background: white;
    padding: 6px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
    width: 140px;
    height: 140px;
  }

  .qr-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.45rem;
    flex: 1;
    min-width: 180px;
  }

  .qr-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .qr-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.45;
    margin-bottom: 0.25rem;
  }

  .btn-qr-download {
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.55rem 1.1rem;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .btn-qr-download:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
    border-color: var(--accent);
  }

  .card-footer {
    margin-top: 2.25rem;
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
    margin-top: 2.25rem;
    text-align: center;
  }

  .profile-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .copy-link-button {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary);
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.65rem 1.2rem;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .copy-link-button:hover {
    background: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px);
    border-color: var(--accent);
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
    padding: 3.5rem clamp(1.5rem, 4vw, 3rem);
    border-radius: var(--radius-xl);
    width: min(100%, 520px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 26px 60px -20px rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.96);
  }

  .error-glass h1 {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  .error-glass p {
    color: var(--text-secondary);
    margin-bottom: 1.75rem;
    line-height: 1.5;
  }

  .error-emoji {
    font-size: 3.5rem;
    margin-bottom: 1.25rem;
  }

  .spinner {
    font-size: 3rem;
    margin-bottom: 1.25rem;
    animation: rotate 1.5s linear infinite;
  }

  @keyframes rotate {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.1); }
    100% { transform: rotate(360deg) scale(1); }
  }

  .btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    border: none;
    box-shadow: 0 10px 25px -10px rgba(99, 102, 241, 0.4);
    text-decoration: none;
    padding: 0.8rem 1.75rem;
    border-radius: calc(var(--radius) * 1.15);
    font-weight: 700;
    transition: all 0.25s ease;
    display: inline-flex;
    align-items: center;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -10px rgba(99, 102, 241, 0.5);
  }

  @media (max-width: 720px) {
    .profile-card { padding: 2rem 1.5rem; }
    .profile-header { margin-bottom: 2rem; }
    .avatar-wrapper { width: 108px; height: 108px; margin-bottom: 1.5rem; }
    .card-footer { flex-direction: column; align-items: flex-start; }
    .qr-section { gap: 1rem; padding: 1.2rem; }
  }

  @media (max-width: 520px) {
    .profile-container { padding: 2rem 1rem 2.5rem; }
    .display-name { font-size: 2rem; }
    .link-tile { padding: 0.95rem; }
    .tile-content { margin-left: 0.9rem; }
    .card-footer { text-align: left; }
    .qr-section { flex-direction: column; align-items: center; text-align: center; }
    .qr-actions { align-items: center; }
  }
</style>
