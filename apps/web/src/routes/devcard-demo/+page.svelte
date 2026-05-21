<svelte:head>
  <title>DevCard Demo</title>
</svelte:head>

<div class="page-wrapper">
  <!-- Return Home button - normal flow mein, overlap nahi hoga -->
  <div class="top-bar">
    <a href="/" class="home-btn">← Return Home</a>
  </div>

  <!-- Main Content -->
  <main class="main-content">
    <h1>DevCard Demo</h1>
    <p>This is the demo page for DevCard.</p>
  </main>
</div>

<style>
  .page-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background:#0f1222; 
  }
  .top-bar {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .home-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: #f8fafc;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
    transition: background 0.2s ease;
  }

  .home-btn:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .main-content {
    flex: 1;
    padding: 2rem 1.5rem;
  }

  /* Responsive breakpoints */
  @media (max-width: 1024px) {
    .main-content {
      padding: 1.5rem 1.25rem;
    }
  }

  @media (max-width: 768px) {
    .top-bar {
      padding: 0.75rem 1rem;
    }
    .main-content {
      padding: 1.25rem 1rem;
    }
  }

  @media (max-width: 480px) {
    .home-btn {
      font-size: 0.8rem;
      padding: 0.4rem 0.75rem;
    }
    .main-content {
      padding: 1rem 0.75rem;
    }
  }
</style>