<script lang="ts">
  import { goto } from '$app/navigation';
  import { login } from '$lib/auth';

  let email    = $state('');
  let password = $state('');
  let error    = $state('');
  let loading  = $state(false);

  async function submit() {
    error = '';

    if (!email.trim() || !password) {
      error = 'Please enter your email and password.';
      return;
    }

    loading = true;
    try {
      await login({ email: email.trim(), password });
      await goto('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      error =
        msg.toLowerCase().includes('invalid') || msg === 'Unauthorized'
          ? 'Email or password is incorrect. Please try again.'
          : msg || 'Unable to log in. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Log in | DevCard</title>
  <meta name="description" content="Log in to your DevCard account to manage your developer profile links and QR code." />
</svelte:head>

<main class="auth-page">
  <section class="auth-panel glass">
    <a href="/" class="brand">⚡ DevCard</a>
    <h1>Welcome back</h1>
    <p class="lede">Log in to manage your links and QR code.</p>

    <form onsubmit={(e) => { e.preventDefault(); void submit(); }} novalidate>

      <label>
        <span>Email</span>
        <input
          id="login-email"
          bind:value={email}
          type="email"
          autocomplete="email"
          placeholder="ada@example.com"
        />
      </label>

      <label>
        <span>Password</span>
        <input
          id="login-password"
          bind:value={password}
          type="password"
          autocomplete="current-password"
          placeholder="Your password"
        />
      </label>

      {#if error}
        <p class="form-error" role="alert">⚠ {error}</p>
      {/if}

      <button
        id="login-submit"
        class="btn-primary"
        type="submit"
        disabled={loading}
        aria-busy={loading}
      >
        {#if loading}
          <span class="spinner" aria-hidden="true"></span> Logging in…
        {:else}
          Log in
        {/if}
      </button>
    </form>

    <p class="switch">New to DevCard? <a href="/signup">Create an account</a></p>
  </section>
</main>

<style>
  .auth-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
  }

  .auth-panel {
    width: min(100%, 440px);
    border-radius: var(--radius);
    padding: 2.25rem 2rem;
    background: rgba(255, 255, 255, 0.82);
  }

  :global(html.dark) .auth-panel {
    background: rgba(15, 23, 42, 0.88);
  }

  .brand {
    display: inline-flex;
    font-family: 'Outfit', sans-serif;
    font-size: 1.1rem;
    font-weight: 800;
    margin-bottom: 1.75rem;
    color: var(--primary);
    text-decoration: none;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 0.4rem;
    line-height: 1.2;
  }

  .lede {
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: 0.95rem;
  }

  form {
    display: grid;
    gap: 1.1rem;
    margin-top: 1.75rem;
  }

  label {
    display: grid;
    gap: 0.4rem;
    color: var(--text-secondary);
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  input {
    width: 100%;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    background: var(--bg-card);
    color: var(--text-primary);
    font: inherit;
    font-size: 1rem;
    padding: 0.85rem 1rem;
    transition: border-color 0.18s ease, outline 0.18s ease;
    box-sizing: border-box;
  }

  input::placeholder { color: var(--text-muted); opacity: 0.7; }

  input:focus {
    border-color: var(--primary);
    outline: 3px solid rgba(99, 102, 241, 0.18);
    outline-offset: 0;
  }

  .form-error {
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.09);
    border: 1px solid rgba(239, 68, 68, 0.28);
    color: #b91c1c;
    padding: 0.85rem 1rem;
    font-size: 0.88rem;
    line-height: 1.55;
    margin: 0;
  }

  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.7;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .switch {
    margin-top: 1.5rem;
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .switch a {
    color: var(--primary);
    font-weight: 800;
    text-decoration: none;
  }

  .switch a:hover { text-decoration: underline; }

  @media (max-width: 520px) {
    .auth-panel { padding: 1.75rem 1.25rem; }
  }
</style>
