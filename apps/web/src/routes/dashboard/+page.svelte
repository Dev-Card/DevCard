<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();
  const user = data.user;

  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });

  async function logout() {
    const res = await fetch(`${data.backendUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (res.ok) {
      window.location.href = '/';
    }
  }
</script>

<svelte:head>
  <title>Dashboard | DevCard</title>
</svelte:head>

<div class="bg-gradient" style="--accent: {user.accentColor || '#6366f1'}"></div>

<main class="dashboard {mounted ? 'loaded' : ''}">
  <nav class="glass">
    <div class="nav-content">
      <a href="/" class="logo">⚡ <span class="gradient-text">DevCard</span></a>
      <div class="nav-actions">
        <a href="/u/{user.username}" class="btn-secondary nav-btn">View Profile</a>
        <button onclick={logout} class="logout-btn">Sign Out</button>
      </div>
    </div>
  </nav>

  <section class="welcome-card glass">
    <div class="avatar-wrapper">
      {#if user.avatarUrl}
        <img src={user.avatarUrl} alt={user.displayName} class="avatar" />
      {:else}
        <div class="avatar avatar-placeholder" style="background: {user.accentColor || '#6366f1'}">
          {user.displayName?.charAt(0).toUpperCase() || '?'}
        </div>
      {/if}
    </div>
    <h1>Welcome, {user.displayName}!</h1>
    {#if user.role}
      <p class="role">{user.role}{user.company ? ` @ ${user.company}` : ''}</p>
    {/if}
    <p class="username">@{user.username}</p>
  </section>

  <section class="quick-links">
    <a href="/u/{user.username}" class="quick-link-card glass">
      <div class="ql-icon">👤</div>
      <div class="ql-text">
        <h3>Your Profile</h3>
        <p>View and share your DevCard</p>
      </div>
      <span class="ql-arrow">→</span>
    </a>
    <a href="/" class="quick-link-card glass">
      <div class="ql-icon">🏠</div>
      <div class="ql-text">
        <h3>Home</h3>
        <p>Learn more about DevCard</p>
      </div>
      <span class="ql-arrow">→</span>
    </a>
  </section>
</main>

<style>
  .bg-gradient {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 50% 0%, var(--accent), transparent 50%), #020617;
    opacity: 0.18;
    z-index: -1;
  }

  .dashboard {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.25rem;
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.65s ease, transform 0.65s ease;
  }

  .dashboard.loaded {
    opacity: 1;
    transform: translateY(0);
  }

  nav {
    margin: 1.25rem auto;
    width: min(1100px, calc(100% - 2rem));
    border-radius: var(--radius-xl);
    padding: 1rem 1.5rem;
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .logo {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1.35rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .nav-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .nav-btn {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
    border-radius: var(--radius);
  }

  .logout-btn {
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius);
    font-weight: 700;
    font-size: 0.9rem;
    border: 1px solid rgba(239, 68, 68, 0.4);
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .logout-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: translateY(-1px);
  }

  .logout-btn:focus-visible {
    outline: 3px solid rgba(239, 68, 68, 0.35);
    outline-offset: 3px;
  }

  .welcome-card {
    max-width: 540px;
    margin: 2rem auto;
    text-align: center;
    padding: 3rem 2rem;
    border-radius: var(--radius-xl);
    box-shadow: 0 26px 60px -20px rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(15,23,42,0.96);
  }

  .avatar-wrapper {
    width: 96px;
    height: 96px;
    margin: 0 auto 1.5rem;
  }

  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid rgba(255,255,255,0.18);
  }

  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 800;
    color: white;
    border-radius: 50%;
  }

  h1 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
  }

  .role {
    color: var(--text-secondary);
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
  }

  .username {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .quick-links {
    max-width: 540px;
    margin: 0 auto 3rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .quick-link-card {
    display: flex;
    align-items: center;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(15,23,42,0.96);
    box-shadow: 0 12px 30px -18px rgba(0,0,0,0.35);
    transition: transform 0.25s ease, border-color 0.25s ease;
    text-decoration: none;
  }

  .quick-link-card:hover {
    transform: translateY(-2px);
    border-color: rgba(99,102,241,0.35);
  }

  .ql-icon {
    font-size: 1.8rem;
    margin-right: 1rem;
  }

  .ql-text {
    flex: 1;
  }

  .ql-text h3 {
    font-size: 1.05rem;
    margin-bottom: 0.15rem;
  }

  .ql-text p {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .ql-arrow {
    color: var(--text-muted);
    font-size: 1.2rem;
    transition: transform 0.2s ease;
  }

  .quick-link-card:hover .ql-arrow {
    transform: translateX(4px);
  }
</style>
