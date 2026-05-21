<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });
</script>

<svelte:head>
  <title>Sign In | DevCard</title>
  <meta name="description" content="Sign in to DevCard with your Google or GitHub account." />
</svelte:head>

<div class="bg-glow"></div>

<main class="login-page">
  <nav class="glass">
    <div class="nav-content">
      <a href="/" class="logo">⚡ <span class="gradient-text">DevCard</span></a>
    </div>
  </nav>

  <section class="login-card {mounted ? 'loaded' : ''}">
    <div class="card-header">
      <h1 class="gradient-text">Welcome Back</h1>
      <p class="subtitle">Sign in to manage your DevCard profile</p>
    </div>

    <div class="oauth-buttons">
      <a href="{data.backendUrl}/auth/google" class="oauth-btn google-btn">
        <svg class="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </a>

      <a href="{data.backendUrl}/auth/github" class="oauth-btn github-btn">
        <svg class="oauth-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        Sign in with GitHub
      </a>
    </div>

    {#if data.user}
      <p class="signed-in-msg">You are already signed in. <a href="/dashboard">Go to Dashboard →</a></p>
    {:else}
      <p class="info-text">By signing in, you agree to share your profile information.</p>
    {/if}
  </section>

  <footer class="footer">
    <p>© 2026 DevCard • Built for the Developer Community</p>
  </footer>
</main>

<style>
  .bg-glow {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 50% 0%, var(--primary-glow), transparent 40%),
                radial-gradient(circle at 0% 100%, var(--accent-glow), transparent 30%);
    pointer-events: none;
    z-index: -1;
  }

  .login-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.25rem;
  }

  nav {
    margin: 0 auto;
    width: min(1100px, calc(100% - 2rem));
    max-width: 1100px;
    border-radius: var(--radius-xl);
    z-index: 100;
    padding: 1rem 1.5rem;
    margin-top: 1.25rem;
  }

  .nav-content {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .logo {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1.35rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .login-card {
    max-width: 440px;
    margin: clamp(3rem, 6vw, 5rem) auto;
    text-align: center;
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.65s ease, transform 0.65s ease;
  }

  .login-card.loaded {
    opacity: 1;
    transform: translateY(0);
  }

  .card-header {
    margin-bottom: 2.5rem;
  }

  h1 {
    font-size: clamp(2rem, 4vw, 2.8rem);
    font-weight: 900;
    letter-spacing: -0.5px;
    margin-bottom: 0.75rem;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 1.05rem;
  }

  .oauth-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .oauth-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: var(--radius);
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.24s ease, box-shadow 0.24s ease, background-color 0.24s ease, border-color 0.24s ease;
    text-decoration: none;
  }

  .oauth-btn:hover {
    transform: translateY(-2px);
  }

  .oauth-btn:focus-visible {
    outline: 3px solid rgba(99, 102, 241, 0.35);
    outline-offset: 3px;
  }

  .google-btn {
    background: var(--bg-card);
    color: var(--text-primary);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
  }

  .google-btn:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-color: rgba(99, 102, 241, 0.45);
  }

  .github-btn {
    background: #24292e;
    color: #ffffff;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .github-btn:hover {
    background: #1b1f23;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }

  .oauth-icon {
    flex-shrink: 0;
  }

  .signed-in-msg {
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .signed-in-msg a {
    color: var(--primary);
    font-weight: 700;
  }

  .signed-in-msg a:hover {
    text-decoration: underline;
  }

  .info-text {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .footer {
    text-align: center;
    padding: 3rem 0 2rem;
    color: var(--text-muted);
    font-size: 0.9rem;
  }
</style>
