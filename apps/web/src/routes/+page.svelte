<svelte:head>
  <title>DevCard — One Tap. Every Profile. Every Platform.</title>
  <meta name="description" content="Open source developer profile exchange platform. Share all your developer profiles with one QR code." />
</svelte:head>

<main class="landing">
  <section class="hero">
    <div class="logo">⚡</div>
    <h1>DevCard</h1>
    <p class="tagline">One Tap. Every Profile. Every Platform.</p>
    <p class="description">
      Stop sharing LinkedIn, GitHub, and Twitter one by one.<br />
      DevCard puts every profile in one shareable QR code.
    </p>
    <div class="cta-group">
      <a href="https://github.com/your-org/devcard" class="btn btn-primary" target="_blank" rel="noopener">
        ⭐ Star on GitHub
      </a>
      <a href="#features" class="btn btn-secondary">Learn More ↓</a>
    </div>
  </section>

  <section id="features" class="features">
    <div class="feature-card">
      <div class="feature-icon">🔗</div>
      <h3>One Card, All Profiles</h3>
      <p>GitHub, LinkedIn, Twitter/X, Devfolio, GitLab, LeetCode, and 10+ more — all in one card.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">⚡</div>
      <h3>Hybrid Follow Engine</h3>
      <p>Follow on GitHub silently via API. Connect on LinkedIn with one tap in WebView. No app switching.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">💳</div>
      <h3>Context Cards</h3>
      <p>Share your "Professional" card at conferences and "Hackathon" card at hack events. Same profiles, different contexts.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">📱</div>
      <h3>QR + AirDrop</h3>
      <p>Generate a QR code or share via AirDrop-style link. Works even if the receiver doesn't have the app.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🔒</div>
      <h3>Privacy First</h3>
      <p>No data monetization. No tracking. Apache 2.0 licensed. You own your data.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon">🌍</div>
      <h3>Open Source</h3>
      <p>Community-driven development. Contribute, self-host, or extend with your own platforms.</p>
    </div>
  </section>

  <footer class="footer">
    <p>DevCard — Open Source Developer Profile Exchange</p>
    <p>Apache 2.0 License • <a href="https://github.com/your-org/devcard" target="_blank" rel="noopener">GitHub</a></p>
  </footer>
</main>

<style>
  .landing {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem;
  }

  .hero {
    text-align: center;
    padding: 6rem 0 4rem;
  }

  .logo {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  h1 {
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -2px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .tagline {
    font-size: 1.25rem;
    color: var(--text-secondary);
    margin-top: 0.5rem;
  }

  .description {
    font-size: 1.1rem;
    color: var(--text-muted);
    margin-top: 1.5rem;
    line-height: 1.7;
  }

  .cta-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2.5rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  }

  .btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-1px);
    color: white;
  }

  .btn-secondary {
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .btn-secondary:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    padding: 3rem 0;
  }

  .feature-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    border-color: var(--primary);
  }

  .feature-icon {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .feature-card p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .footer {
    text-align: center;
    padding: 3rem 0 2rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .footer p + p {
    margin-top: 0.5rem;
  }

  @media (max-width: 600px) {
    h1 { font-size: 2.5rem; }
    .hero { padding: 3rem 0 2rem; }
    .cta-group { flex-direction: column; align-items: center; }
  }
</style>
