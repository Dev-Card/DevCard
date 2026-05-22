<script lang="ts">
  import { apiFetch } from '$lib/api';
  import { onMount } from 'svelte';

  let username = $state('');
  let loading = $state(false);
  let errorMessage = $state('');
  let successMessage = $state('');
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });

  async function handleBypassLogin(e: SubmitEvent) {
    e.preventDefault();
    if (!username.trim()) {
      errorMessage = 'Please provide a username to begin.';
      return;
    }

    loading = true;
    errorMessage = '';
    successMessage = '';

    try {
      const res = await apiFetch('/auth/bypass', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim() }),
      });
      successMessage = `Welcome back, ${res.user.displayName}! Redirecting to studio...`;
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err: any) {
      errorMessage = err.message || 'Authentication failed. Please verify the backend is running.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login | DevCard Studio ⚡</title>
</svelte:head>

<div class="bg-glow"></div>

<main class="login-container {mounted ? 'loaded' : ''}">
  <div class="login-card glass">
    <header class="login-header">
      <div class="logo">⚡ <span class="gradient-text">DevCard</span></div>
      <h1>Creator Studio</h1>
      <p class="tagline">Manage your digital developer identity in real time.</p>
    </header>

    <form onsubmit={handleBypassLogin} class="login-form">
      <div class="form-group">
        <label for="username">Local Developer Bypass</label>
        <div class="input-wrapper">
          <span class="at-prefix">@</span>
          <input
            type="text"
            id="username"
            placeholder="e.g. janesmith"
            bind:value={username}
            disabled={loading}
            required
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none"
          />
        </div>
        <p class="field-hint">Enter any username to create or log into a local profile instantly.</p>
      </div>

      {#if errorMessage}
        <div class="alert alert-error">
          <span class="icon">⚠️</span> {errorMessage}
        </div>
      {/if}

      {#if successMessage}
        <div class="alert alert-success">
          <span class="icon">✨</span> {successMessage}
        </div>
      {/if}

      <button type="submit" class="btn-primary" disabled={loading}>
        {#if loading}
          <span class="spinner"></span> Logging you in...
        {:else}
          Enter Creator Studio ⚡
        {/if}
      </button>
    </form>
    
    <div class="oauth-section">
      <div class="divider">
        <span>Local Development Mode</span>
      </div>
      <p class="oauth-hint">External Google & GitHub OAuth secrets are bypassable in localhost environments for seamless setup.</p>
    </div>
  </div>
</main>

<style>
  .bg-glow {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 30%, var(--primary-glow), transparent 45%),
                radial-gradient(circle at 10% 80%, var(--accent-glow), transparent 35%);
    pointer-events: none;
    z-index: -1;
    background-color: var(--bg-page);
  }

  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.5s ease-out, transform 0.5s ease-out;
  }

  .login-container.loaded {
    opacity: 1;
    transform: translateY(0);
  }

  .login-card {
    width: 100%;
    max-width: 440px;
    border-radius: var(--radius-xl);
    padding: 2.5rem 2.25rem;
    box-shadow: var(--shadow-lg);
    background: var(--bg-glass);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--border-glass);
    text-align: center;
  }

  .login-header {
    margin-bottom: 2.25rem;
  }

  .logo {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  h1 {
    font-size: 1.85rem;
    font-weight: 800;
    margin-bottom: 0.4rem;
    color: var(--text-primary);
  }

  .tagline {
    color: var(--text-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    text-align: left;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  label {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .at-prefix {
    position: absolute;
    left: 1.1rem;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 1.05rem;
    pointer-events: none;
  }

  input {
    width: 100%;
    padding: 0.85rem 1rem 0.85rem 2.2rem;
    border-radius: var(--radius);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    font: inherit;
    transition: all 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: var(--primary);
    background: var(--bg-primary);
    box-shadow: 0 0 0 3px var(--primary-glow);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .field-hint {
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .alert {
    padding: 0.85rem 1rem;
    border-radius: var(--radius);
    font-size: 0.85rem;
    line-height: 1.45;
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .alert-error {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
  }

  .alert-success {
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  .btn-primary {
    width: 100%;
    padding: 0.9rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px -10px #6366f1;
  }

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .oauth-section {
    margin-top: 2rem;
  }

  .divider {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .divider span {
    padding: 0 0.75rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }

  .oauth-hint {
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
