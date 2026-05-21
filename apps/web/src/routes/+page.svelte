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
    top: 1.25rem;
    margin: 0 auto;
    width: min(1100px, calc(100% - 2rem));
    max-width: 1100px;
    border-radius: var(--radius-xl);
    z-index: 100;
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

  .theme-toggle {
    width: 46px;
    height: 46px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    transition: transform 0.24s ease, background-color 0.24s ease, border-color 0.24s ease;
  }

  .theme-toggle:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.14);
  }

  .theme-toggle:focus-visible {
    outline: 3px solid rgba(99, 102, 241, 0.24);
    outline-offset: 3px;
  }

  .landing {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.25rem;
  }

  .hero {
    text-align: center;
    padding: clamp(4rem, 8vw, 6rem) 0 4rem;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.45rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 700;
    margin-bottom: 1.75rem;
    color: var(--primary);
  }

  h1 {
    font-size: clamp(3rem, 5.8vw, 4.5rem);
    font-weight: 900;
    letter-spacing: -1px;
    margin: 0 auto 1.5rem;
    max-width: 760px;
  }

  .description {
    font-size: clamp(1rem, 1.1vw, 1.2rem);
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto 2.5rem;
    line-height: 1.7;
  }

  .cta-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-secondary {
    padding: 0.92rem 1.75rem;
    border-radius: calc(var(--radius) * 1.15);
    font-weight: 700;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(99, 102, 241, 0.45);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.75rem;
    padding: 4rem 0 5rem;
  }

  @media (max-width: 640px) {
  .features {
    display: grid;
    grid-template-columns: 1fr; /* single column */
    gap: 16px;
    padding: 0 12px;
  }
}

  .feature-card {
    padding: 2.4rem;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.5));
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
  }

  .feature-card {
  min-height: 140px;
  padding: 16px;
}
@media (max-width: 640px) {
  .feature-card {
    margin-bottom: 12px;
  }
}

  .feature-card:hover {
    transform: translateY(-8px);
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 26px 50px -18px rgba(0, 0, 0, 0.35);
  }

  .feature-icon {
    font-size: 2.3rem;
    margin-bottom: 1.4rem;
  }

  h3 {
    font-size: 1.4rem;
    margin-bottom: 0.9rem;
  }

  .feature-card p {
    color: var(--text-secondary);
    line-height: 1.7;
  }

  .footer {
    text-align: center;
    padding: 3rem 0 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
  }

  @media (max-width: 860px) {
    nav {
      top: 0.9rem;
      padding: 0.85rem 1.1rem;
    }

    .hero {
      padding: clamp(3rem, 9vw, 5rem) 0 3rem;
    }
  }

  @media (max-width: 640px) {
    h1 {
      font-size: 2.6rem;
    }

    .cta-group {
      flex-direction: column;
      align-items: stretch;
    }

    .feature-card {
      padding: 1.8rem;
    }

    .features {
      gap: 1.2rem;
    }

    .footer {
      padding: 2rem 0 1.25rem;
    }
  }
</style>
