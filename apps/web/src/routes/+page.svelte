<script>
  import { onMount } from 'svelte';

  let theme = 'light';

  onMount(() => {
    const saved = localStorage.getItem('devcard-theme');
    if (saved) {
      theme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
  });

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('devcard-theme', theme);
  }
</script>

<svelte:head>
  <title>DevCard — One Tap. Every Profile. Every Platform.</title>
  <meta
    name="description"
    content="Open source developer profile exchange platform. Share all your developer profiles with one QR code."
  />
</svelte:head>

<div class="bg-glow"></div>

<main class="landing">
  <nav class="glass">
    <div class="nav-content">
      <div class="logo">⚡ <span class="gradient-text">DevCard</span></div>
      <button
        id="theme-toggle"
        class="theme-toggle"
        on:click={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-badge">GSSoC'26 Edition</div>
    <h1 class="gradient-text">One Tap. Every Profile.<br/>Every Platform.</h1>
    <p class="description">
      The open-source standard for developer networking. Put all your profiles—GitHub, LinkedIn, LeetCode, and more—into a single, high-impact digital card.
    </p>
    <div class="cta-group">
      <a
        href="https://github.com/Dev-Card/DevCard"
        class="btn-primary"
        target="_blank"
        rel="noopener"
      >
        ⭐ Star on GitHub
      </a>
      <a href="/u/devcard-demo" class="btn-secondary">View Demo Profile →</a>
    </div>
  </section>

  <section id="features" class="features">
    <div class="feature-card glass">
      <div class="feature-icon">🔗</div>
      <h3>Unified Identity</h3>
      <p>Combine your fragmented online presence into a cohesive professional identity.</p>
    </div>
    <div class="feature-card glass">
      <div class="feature-icon">⚡</div>
      <h3>Instant Follow</h3>
      <p>Integrated APIs allow followers to connect with you instantly across platforms.</p>
    </div>
    <div class="feature-card glass">
      <div class="feature-icon">🔒</div>
      <h3>Private by Design</h3>
      <p>No tracking, no data selling. Your information stays where it belongs: with you.</p>
    </div>
  </section>

  <footer class="footer">
    <p>© 2026 DevCard • Built for the Developer Community</p>
  </footer>
</main>

<style>
  .bg-glow {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, var(--primary-glow), transparent 40%),
                radial-gradient(circle at 0% 100%, var(--accent-glow), transparent 30%);
    pointer-events: none;
    z-index: -1;
  }

  nav {
    position: sticky;
    top: 1rem;
    margin: 1rem auto;
    width: calc(100% - 2rem);
    max-width: 1100px;
    border-radius: var(--radius-lg);
    z-index: 100;
    padding: 0.75rem 1.5rem;
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .theme-toggle {
    background: transparent;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: transform 0.3s ease;
  }

  .theme-toggle:hover {
    transform: scale(1.1) rotate(10deg);
  }

  .landing {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .hero {
    text-align: center;
    padding: 8rem 0 6rem;
  }

  .hero-badge {
    display: inline-block;
    padding: 0.4rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 100px;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 2rem;
    color: var(--primary);
  }

  h1 {
    font-size: 4.5rem;
    font-weight: 900;
    letter-spacing: -3px;
    margin-bottom: 1.5rem;
  }

  .description {
    font-size: 1.25rem;
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto 3rem;
    line-height: 1.6;
  }

  .cta-group {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
  }

  .btn-secondary {
    padding: 0.8rem 1.6rem;
    border-radius: var(--radius);
    font-weight: 600;
    border: 1px solid var(--border);
    background: var(--bg-card);
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: var(--bg-secondary);
    border-color: var(--primary);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    padding: 4rem 0;
  }

  .feature-card {
    padding: 2.5rem;
    border-radius: var(--radius-xl);
    transition: transform 0.3s ease;
  }

  .feature-card:hover {
    transform: translateY(-10px);
  }

  .feature-icon {
    font-size: 2.5rem;
    margin-bottom: 1.5rem;
  }

  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .feature-card p {
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .footer {
    text-align: center;
    padding: 6rem 0 3rem;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
  }

  @media (max-width: 768px) {
    h1 { font-size: 3rem; letter-spacing: -1px; }
    .hero { padding: 4rem 0 3rem; }
    .cta-group { flex-direction: column; align-items: stretch; }
  }
</style>
