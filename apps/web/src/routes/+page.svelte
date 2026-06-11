<script lang="ts">
  const highlights = [
    { title: 'One QR', text: 'Share GitHub, LinkedIn, X, portfolio, and more from one public profile.' },
    { title: 'Live Links', text: 'Update your dashboard once and every scan opens the latest profile links.' },
    { title: 'Mobile Ready', text: 'Clean public pages are built for conference floors, meetups, and quick intros.' },
  ];
</script>

<svelte:head>
  <title>DevCard | Share every developer profile with one QR</title>
  <meta
    name="description"
    content="Create a DevCard account, add your developer links, and share one QR code."
  />
</svelte:head>

<div class="bg-glow"></div>

<nav class="glass" aria-label="Primary navigation">
  <div class="nav-content">
    <a class="logo" href="/">DevCard</a>
    <div class="nav-actions">
      <a href="/login" class="btn-secondary">Log in</a>
      <a href="/signup" class="btn-primary">Create card</a>
    </div>
  </div>
</nav>

<main class="landing">
  <section class="hero">
    <div class="hero-badge">Developer profile sharing</div>
    <h1>One QR for every profile you want people to find.</h1>
    <p class="description">
      DevCard turns your developer links into a single public page that is quick to update,
      easy to scan, and ready for real-world conversations.
    </p>
    <div class="cta-group">
      <a href="/signup" class="btn-primary">Build your DevCard</a>
      <a href="/u/devcard-demo" class="btn-secondary">View demo profile</a>
    </div>
  </section>

  <section class="features" aria-label="DevCard features">
    {#each highlights as item}
      <article class="feature-card">
        <h3>{item.title}</h3>
        <p>{item.text}</p>
      </article>
    {/each}
  </section>
</main>

<footer class="footer">
  <p>Open source developer profile exchange platform.</p>
</footer>

<style>
  .bg-glow {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.22), transparent 50%),
                radial-gradient(circle at 0% 100%, rgba(168, 85, 247, 0.15), transparent 40%),
                radial-gradient(circle at 100% 50%, rgba(99, 102, 241, 0.10), transparent 35%);
    pointer-events: none;
    z-index: -1;
    will-change: transform, opacity;
    transform: translateZ(0);
  }

  nav {
    margin: 1.25rem auto 0;
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

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
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
    background: var(--bg-glass);
    border: 1px solid var(--border-glass);
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
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.3);
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

  .feature-card {
    padding: 2.4rem;
    min-height: 140px;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    background: var(--bg-card);
    border: 1px solid var(--border);
    transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
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
    border-top: 1px solid var(--border);
    color: var(--text-muted);
  }

  @media (max-width: 860px) {
    nav {
      margin-top: 0.9rem;
      padding: 0.85rem 1.1rem;
    }

    .hero {
      padding: clamp(3rem, 9vw, 5rem) 0 3rem;
    }
  }

  @media (max-width: 640px) {
    .nav-content {
      align-items: stretch;
      flex-direction: column;
    }

    .nav-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    h1 {
      font-size: 2.6rem;
    }

    .cta-group {
      flex-direction: column;
      align-items: stretch;
    }

    .features {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 2rem 1rem;
    }

    .feature-card {
      padding: 1.8rem;
      margin-bottom: 0;
    }

    .footer {
      padding: 2rem 0 1.25rem;
    }

    .bg-glow {
      opacity: 0.6;
    }
  }
</style>
