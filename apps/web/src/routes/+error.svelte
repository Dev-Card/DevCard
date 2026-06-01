<script>
  import { page } from '$app/stores';

  function handleRefresh() {
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Error | DevCard</title>
</svelte:head>

<div class="error-container">
  <div class="error-card glass">
    <div class="error-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    
    <h1 class="gradient-text">Oops! Something went wrong</h1>
    
    <p class="error-message">
      We encountered an unexpected error while loading this developer card.
      <br>
      {#if $page.error?.message}
        <span class="error-detail">{$page.status}: {$page.error.message}</span>
      {/if}
    </p>

    <div class="action-buttons">
      <button class="btn-primary" onclick={handleRefresh}>
        Try Again
      </button>
      <a href="/" class="btn-secondary">
        Go Home
      </a>
    </div>
  </div>
</div>

<style>
  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1.5rem;
    background: var(--bg-page);
  }

  .error-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 550px;
    width: 100%;
    padding: 3rem 2rem;
    border-radius: var(--radius-lg);
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .error-icon {
    color: #ef4444;
    margin-bottom: 1.5rem;
    background: rgba(239, 68, 68, 0.1);
    padding: 1.25rem;
    border-radius: 50%;
    box-shadow: 0 4px 14px -6px rgba(239, 68, 68, 0.4);
  }

  h1 {
    font-size: 2.25rem;
    margin-bottom: 1rem;
  }

  .error-message {
    color: var(--text-secondary);
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 2.5rem;
  }

  .error-detail {
    display: inline-block;
    margin-top: 1rem;
    font-size: 0.9rem;
    padding: 0.75rem 1rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-muted);
    font-family: monospace;
    word-break: break-word;
  }

  .action-buttons {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .error-card {
      padding: 2.5rem 1.5rem;
    }
    
    h1 {
      font-size: 1.75rem;
    }
    
    .action-buttons {
      width: 100%;
      flex-direction: column;
      gap: 1rem;
    }
    
    .action-buttons > * {
      width: 100%;
    }
  }
</style>
