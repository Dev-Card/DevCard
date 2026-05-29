<script>
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <meta name="theme-color" content="#0f0f1a" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><text y=%2224%22 font-size=%2224%22>⚡</text></svg>" />
</svelte:head>

<!-- WCAG 2.4.1 Bypass Blocks: skip link visible only on keyboard focus -->
<a href="#main-content" class="skip-link">Skip to main content</a>

{@render children()}

<style>
  /* ── Global skip link (WCAG 2.4.1) ──────────────────────────────────── */
  .skip-link {
    position: fixed;
    top: -100%;
    left: 1rem;
    z-index: 10000;
    padding: 0.75rem 1.25rem;
    background: #6366f1;
    color: #ffffff;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    border-radius: 8px;
    text-decoration: none;
    transition: top 0.2s ease;
    /* Ensure it's always accessible even when off-screen */
    outline: none;
  }

  .skip-link:focus {
    top: 1rem;
    outline: 3px solid #ffffff;
    outline-offset: 2px;
  }
</style>
