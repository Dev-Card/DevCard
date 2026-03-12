<script lang="ts">
  import { PLATFORMS, getProfileUrl } from '@devcard/shared';

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
</script>

<svelte:head>
  {#if profile}
    <title>{profile.displayName} — DevCard</title>
    <meta name="description" content="{profile.bio || `${profile.displayName}'s developer profiles`}" />
    <meta property="og:title" content="{profile.displayName} — DevCard" />
    <meta property="og:description" content="{profile.bio || 'Developer profile card'}" />
  {:else}
    <title>User Not Found — DevCard</title>
  {/if}
</svelte:head>

{#if error || !profile}
  <main class="error-page">
    <div class="error-content">
      <div class="error-emoji">😕</div>
      <h1>User Not Found</h1>
      <p>This DevCard doesn't exist or has been removed.</p>
      <a href="/" class="home-link">← Back to DevCard</a>
    </div>
  </main>
{:else}
  <main class="profile-page">
    <div class="profile-card" style="--accent: {profile.accentColor}">
      <!-- Avatar & Header -->
      <div class="profile-header">
        {#if profile.avatarUrl}
          <img src={profile.avatarUrl} alt={profile.displayName} class="avatar" />
        {:else}
          <div class="avatar avatar-placeholder" style="background: {profile.accentColor}">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        {/if}
        <h1 class="display-name">{profile.displayName}</h1>
        {#if profile.pronouns}
          <span class="pronouns">{profile.pronouns}</span>
        {/if}
        {#if profile.role}
          <p class="role">
            {profile.role}{profile.company ? ` @ ${profile.company}` : ''}
          </p>
        {/if}
        {#if profile.bio}
          <p class="bio">{profile.bio}</p>
        {/if}
      </div>

      <!-- Platform Links -->
      <div class="links-section">
        <p class="links-label">Connect with {profile.displayName.split(' ')[0]}</p>
        {#each profile.links as link}
          {@const platform = PLATFORMS[link.platform]}
          {@const color = platformColors[link.platform] || '#6366f1'}
          <a
            href={link.url || getProfileUrl(link.platform, link.username)}
            target="_blank"
            rel="noopener noreferrer"
            class="platform-tile"
          >
            <div class="tile-icon" style="background: {color}">
              {platform?.name.charAt(0) || '?'}
            </div>
            <div class="tile-info">
              <span class="tile-name">{platform?.name || link.platform}</span>
              <span class="tile-username">{link.username}</span>
            </div>
            <span class="tile-arrow">→</span>
          </a>
        {/each}
      </div>
    </div>

    <!-- Get DevCard CTA -->
    <div class="get-devcard">
      <p>Want your own DevCard?</p>
      <a href="/" class="cta-link">Get your DevCard ⚡</a>
    </div>

    <footer class="footer">
      Powered by <a href="/">DevCard</a> — Open Source Developer Profiles
    </footer>
  </main>
{/if}

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .error-content {
    text-align: center;
  }

  .error-emoji {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .error-content h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .error-content p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }

  .home-link {
    color: var(--primary-light);
    font-weight: 600;
  }

  /* Profile Page */
  .profile-page {
    max-width: 480px;
    margin: 0 auto;
    padding: 2rem 1rem;
    min-height: 100vh;
  }

  .profile-card {
    background: var(--bg-card);
    border: 2px solid var(--accent);
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.15);
  }

  .profile-header {
    text-align: center;
    padding: 2.5rem 2rem 1.5rem;
  }

  .avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    margin: 0 auto 1rem;
    display: block;
    object-fit: cover;
  }

  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 2rem;
    font-weight: 700;
  }

  .display-name {
    font-size: 1.75rem;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .pronouns {
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-top: 0.25rem;
    display: block;
  }

  .role {
    color: var(--text-secondary);
    margin-top: 0.5rem;
    font-size: 0.95rem;
  }

  .bio {
    color: var(--text-secondary);
    margin-top: 1rem;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  /* Links */
  .links-section {
    padding: 0.5rem 1.5rem 1.5rem;
  }

  .links-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 0.75rem;
    padding-left: 0.25rem;
  }

  .platform-tile {
    display: flex;
    align-items: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.875rem 1rem;
    margin-bottom: 0.5rem;
    transition: all 0.2s ease;
    color: var(--text-primary);
  }

  .platform-tile:hover {
    border-color: var(--primary);
    transform: translateX(4px);
    color: var(--text-primary);
  }

  .tile-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .tile-info {
    flex: 1;
    margin-left: 0.875rem;
  }

  .tile-name {
    display: block;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .tile-username {
    display: block;
    color: var(--text-muted);
    font-size: 0.8rem;
    margin-top: 1px;
  }

  .tile-arrow {
    color: var(--text-muted);
    font-size: 1.1rem;
    transition: transform 0.2s;
  }

  .platform-tile:hover .tile-arrow {
    transform: translateX(4px);
    color: var(--primary-light);
  }

  /* CTA */
  .get-devcard {
    text-align: center;
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
  }

  .get-devcard p {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .cta-link {
    font-weight: 700;
    font-size: 1rem;
  }

  .footer {
    text-align: center;
    padding: 2rem 0;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  @media (max-width: 500px) {
    .profile-page { padding: 1rem 0.75rem; }
    .display-name { font-size: 1.5rem; }
  }
</style>
