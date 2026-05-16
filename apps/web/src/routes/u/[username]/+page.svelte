<script lang="ts">
  import { PLATFORMS, getProfileUrl } from '@devcard/shared';
  import { onMount } from 'svelte';

  let { data } = $props();
  let profile = $state(data.profile);
  const error = data.error;

  let currentUrl = $state('');
  
  onMount(() => {
    // Check for preview mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('preview') === 'true') {
      const saved = localStorage.getItem('devcard-draft');
      if (saved) {
        try {
          profile = JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse preview draft", e);
        }
      }
    }
    currentUrl = window.location.href;
  });

  const platformColors: Record<string, string> = {
    github: '#181717', linkedin: '#0A66C2', twitter: '#000000',
    gitlab: '#FC6D26', devfolio: '#3770FF', npm: '#CB3837',
    devto: '#0A0A0A', hashnode: '#2962FF', medium: '#000000',
    leetcode: '#FFA116', hackerrank: '#00EA64', discord: '#5865F2',
    telegram: '#26A5E4', email: '#EA4335', portfolio: '#6366F1', custom: '#8B5CF6',
  };
</script>

<svelte:head>
  {#if profile}
    <title>{profile.displayName} — DevCard</title>
    <meta name="description" content="{profile.bio || `${profile.displayName}'s developer profiles`}" />
    <meta property="og:title" content="{profile.displayName} — DevCard" />
    <meta property="og:description" content="{profile.bio || 'Developer profile card'}" />
  {/if}
</svelte:head>

<main class="profile-container" style="--accent: {profile?.accentColor || '#6366F1'}">
  <div class="mesh-gradient"></div>
  
  <div class="content-wrapper">
    {#if profile}
      <!-- Hero Section with Premium Card -->
      <section class="hero-section">
        <div class="card-float-wrapper">
          <div class="premium-card">
            <div class="card-glass"></div>
            <div class="card-content">
              <div class="card-top">
                <div class="brand-row">
                  <div class="mini-chip"></div>
                  <span class="brand-text">DevCard</span>
                </div>
                <span class="contactless">📶</span>
              </div>

              <div class="card-mid">
                <div class="avatar-container">
                  {#if profile.avatarUrl}
                    <img src={profile.avatarUrl} alt={profile.displayName} class="avatar" />
                  {:else}
                    <div class="avatar-placeholder">
                      {profile.displayName.charAt(0).toUpperCase()}
                    </div>
                  {/if}
                </div>
                <div class="main-info">
                  <h1>{profile.displayName}</h1>
                  <p class="role">{profile.role}{profile.company ? ` @ ${profile.company}` : ''}</p>
                  {#if profile.pronouns}
                    <span class="pronouns-badge">{profile.pronouns}</span>
                  {/if}
                </div>
              </div>

              <div class="card-bottom">
                <div class="bio-container">
                  <p class="bio-text">{profile.bio || 'Building something amazing.'}</p>
                </div>
                
                <div class="qr-wrapper">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(currentUrl)}&color=ffffff&bgcolor=0f172a`} 
                    alt="Profile QR" 
                    class="qr-code" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Social Links Section -->
      <section class="links-section">
        <h2 class="section-title">Connect with me</h2>
        <div class="links-grid">
          {#each profile.links as link}
            <a 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              class="link-tile"
              style="--tile-color: {platformColors[link.platform] || '#6366F1'}"
            >
              <div class="tile-icon">
                <span class="icon-placeholder">{link.platform.charAt(0).toUpperCase()}</span>
              </div>
              <div class="tile-content">
                <span class="platform-name">{PLATFORMS[link.platform]?.name || link.platform}</span>
                <span class="platform-handle">@{link.username}</span>
              </div>
              <div class="tile-arrow">↗</div>
            </a>
          {/each}
        </div>
      </section>

      <!-- Footer / Action Area -->
      <footer class="profile-footer">
        <p>Shared via <strong>DevCard</strong></p>
        <div class="footer-actions">
          <button class="action-btn" onclick={() => {
            navigator.clipboard.writeText(currentUrl);
            alert('Profile link copied!');
          }}>🔗 Copy Link</button>
          <a href="/" class="action-btn primary">✨ Create Your Own</a>
        </div>
      </footer>
    {:else if error}
      <div class="error-state">
        <span class="error-icon">😕</span>
        <h2>User Not Found</h2>
        <p>{error}</p>
        <a href="/" class="back-home">Back to DevCard</a>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #050810;
    color: #ffffff;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow-x: hidden;
  }

  .profile-container {
    min-height: 100vh;
    position: relative;
    padding: 2rem 1rem 4rem;
  }

  /* Animated Mesh Gradient Background */
  .mesh-gradient {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    background: 
      radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 50%),
      radial-gradient(at 50% 100%, rgba(var(--accent), 0.1) 0px, transparent 50%);
    opacity: 0.8;
  }

  .content-wrapper {
    max-width: 600px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  /* Hero Section */
  .hero-section {
    padding: 2rem 0;
    display: flex;
    justify-content: center;
  }

  .card-float-wrapper {
    width: 100%;
    max-width: 500px;
    perspective: 1000px;
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotateX(0deg); }
    50% { transform: translateY(-15px) rotateX(2deg); }
  }

  /* Premium Card (Internal Styles) */
  .premium-card {
    background: linear-gradient(145deg, #1e293b, #0f172a);
    border-radius: 24px;
    padding: 28px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6), 
                0 0 0 1px rgba(255, 255, 255, 0.05);
    aspect-ratio: 1.58;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .card-glass {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
    pointer-events: none;
  }

  .card-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mini-chip {
    width: 35px;
    height: 22px;
    background: linear-gradient(135deg, #fef08a, #ca8a04);
    border-radius: 4px;
    opacity: 0.4;
  }

  .brand-text {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }

  .contactless { font-size: 24px; opacity: 0.4; }

  .card-mid {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-top: 0.5rem;
  }

  .avatar-container {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    padding: 3px;
    background: linear-gradient(135deg, var(--accent), #ffffff33);
    flex-shrink: 0;
  }

  .avatar, .avatar-placeholder {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    background: #1e293b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 800;
  }

  .main-info h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1.1;
  }

  .role {
    margin: 6px 0;
    font-size: 0.95rem;
    color: #94a3b8;
    font-weight: 500;
  }

  .pronouns-badge {
    font-size: 0.7rem;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 100px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
  }

  .bio-text {
    margin: 0;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    max-width: 300px;
  }

  .qr-wrapper {
    width: 90px;
    height: 90px;
    background: white;
    border-radius: 12px;
    padding: 6px;
    flex-shrink: 0;
    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
  }

  .qr-code { width: 100%; height: 100%; }

  /* Links Section */
  .links-section {
    margin-top: 2rem;
  }

  .section-title {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #64748b;
    margin-bottom: 1.5rem;
    padding-left: 0.5rem;
  }

  .links-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .link-tile {
    display: flex;
    align-items: center;
    padding: 1rem 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    text-decoration: none;
    color: white;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
  }

  .link-tile:hover {
    background: rgba(255, 255, 255, 0.07);
    border-color: var(--tile-color);
    transform: translateX(4px);
    box-shadow: -10px 0 20px -10px var(--tile-color);
  }

  .tile-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--tile-color);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 1.25rem;
    font-weight: 800;
    color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }

  .tile-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .platform-name {
    font-size: 1rem;
    font-weight: 700;
  }

  .platform-handle {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  .tile-arrow {
    font-size: 1.2rem;
    color: #334155;
    transition: color 0.2s;
  }

  .link-tile:hover .tile-arrow { color: white; }

  /* Footer */
  .profile-footer {
    margin-top: 4rem;
    text-align: center;
    color: #64748b;
    font-size: 0.9rem;
  }

  .footer-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
  }

  .action-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 100px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }

  .action-btn.primary {
    background: var(--accent);
    border-color: transparent;
    box-shadow: 0 10px 20px -5px var(--accent);
  }

  /* Error State */
  .error-state {
    padding: 4rem 2rem;
    text-align: center;
  }

  .error-icon { font-size: 4rem; margin-bottom: 2rem; display: block; }

  @media (max-width: 480px) {
    .premium-card { padding: 20px; aspect-ratio: auto; }
    .avatar-container { width: 70px; height: 70px; }
    .main-info h1 { font-size: 1.4rem; }
    .qr-wrapper { width: 70px; height: 70px; }
  }
</style>
