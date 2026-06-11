<script lang="ts">
  import { goto } from '$app/navigation';
  import { signup } from '$lib/auth';

  let displayName = $state('');
  let username    = $state('');
  let email       = $state('');
  let password    = $state('');
  let error       = $state('');
  let loading     = $state(false);

  // Track whether user has touched each field (to show hints only after interaction)
  let touchedUsername = $state(false);
  let touchedPassword = $state(false);

  // ── Derived validation (independent of loading) ──────────────────────────
  const usernameOk = $derived(/^[A-Za-z0-9_-]{3,50}$/.test(username.trim()));
  const passwordOk = $derived(password.length >= 8);
  const emailOk    = $derived(email.includes('@') && email.includes('.'));

  const formValid  = $derived(
    displayName.trim().length > 0 &&
    usernameOk &&
    emailOk &&
    passwordOk
  );

  // Password strength 0-3
  const strength = $derived(
    password.length === 0 ? 0 :
    password.length < 6   ? 1 :
    password.length < 10  ? 2 : 3
  );
  const strengthLabel = $derived(['', 'Weak',  'Fair',   'Strong' ][strength]);
  const strengthColor = $derived(['', '#ef4444','#f59e0b','#22c55e'][strength]);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit() {
    // Always show hints on submit attempt
    touchedUsername = true;
    touchedPassword = true;
    error = '';

    // Validate before touching loading state
    if (!formValid) {
      if (!displayName.trim())  { error = 'Display name is required.'; return; }
      if (!usernameOk)          { error = 'Username: 3–50 chars, letters/numbers/_ /- only (no spaces).'; return; }
      if (!emailOk)             { error = 'Please enter a valid email address.'; return; }
      if (!passwordOk)          { error = 'Password must be at least 8 characters.'; return; }
      return;
    }

    loading = true;
    try {
      await signup({
        displayName: displayName.trim(),
        username:    username.trim(),
        email:       email.trim(),
        password,
      });
      await goto('/dashboard');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to create your account. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Create account | DevCard</title>
  <meta name="description" content="Sign up for DevCard — share all your developer profiles through one QR code." />
</svelte:head>

<main class="auth-page">
  <section class="auth-panel glass">
    <a href="/" class="brand">⚡ DevCard</a>
    <h1>Create your DevCard</h1>
    <p class="lede">Add your links, get one QR, share everywhere.</p>

    <form onsubmit={(e) => { e.preventDefault(); void submit(); }} novalidate>

      <!-- Display name -->
      <label>
        <span>Display name <span class="req">*</span></span>
        <input
          id="signup-displayname"
          bind:value={displayName}
          autocomplete="name"
          maxlength="100"
          placeholder="Ada Lovelace"
        />
      </label>

      <!-- Username -->
      <label>
        <span>Username <span class="req">*</span></span>
        <input
          id="signup-username"
          bind:value={username}
          autocomplete="username"
          maxlength="50"
          placeholder="ada_dev"
          class:field-error={touchedUsername && !usernameOk}
          class:field-ok={touchedUsername && usernameOk}
          onblur={() => (touchedUsername = true)}
        />
        {#if touchedUsername && !usernameOk && username.length > 0}
          <span class="hint hint-error">3–50 characters · letters, numbers, _ and - only · no spaces</span>
        {:else}
          <span class="hint">Letters, numbers, _ and - · no spaces</span>
        {/if}
      </label>

      <!-- Email -->
      <label>
        <span>Email <span class="req">*</span></span>
        <input
          id="signup-email"
          bind:value={email}
          type="email"
          autocomplete="email"
          placeholder="ada@example.com"
        />
      </label>

      <!-- Password -->
      <label>
        <span>Password <span class="req">*</span></span>
        <input
          id="signup-password"
          bind:value={password}
          type="password"
          autocomplete="new-password"
          placeholder="Minimum 8 characters"
          class:field-error={touchedPassword && !passwordOk}
          class:field-ok={touchedPassword && passwordOk}
          onblur={() => (touchedPassword = true)}
        />
        {#if password.length > 0}
          <div class="strength-bar" role="progressbar" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={3}>
            <div class="strength-fill" style="width:{strength * 33.33}%; background:{strengthColor}"></div>
          </div>
          <span class="hint" style="color:{strengthColor}">{strengthLabel}</span>
        {:else}
          <span class="hint">Minimum 8 characters</span>
        {/if}
      </label>

      <!-- Error banner -->
      {#if error}
        <p class="form-error" role="alert">⚠ {error}</p>
      {/if}

      <!-- Submit -->
      <button
        id="signup-submit"
        class="btn-primary"
        type="submit"
        disabled={loading}
        aria-busy={loading}
      >
        {#if loading}
          <span class="spinner" aria-hidden="true"></span> Creating account…
        {:else}
          Create account
        {/if}
      </button>
    </form>

    <p class="switch">Already have an account? <a href="/login">Log in</a></p>
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
    width: min(100%, 460px);
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
    margin-bottom: 0;
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

  .req { color: #ef4444; }

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

  input.field-error {
    border-color: #ef4444;
    outline: 3px solid rgba(239, 68, 68, 0.12);
  }

  input.field-ok {
    border-color: #22c55e;
  }

  .hint {
    font-size: 0.76rem;
    font-weight: 500;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .hint-error { color: #ef4444 !important; }

  /* Password strength */
  .strength-bar {
    height: 4px;
    border-radius: 99px;
    background: var(--border);
    overflow: hidden;
  }

  .strength-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.3s ease, background 0.3s ease;
  }

  /* Error banner */
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

  /* Submit button */
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

  /* Spinner */
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
