<script>
  let apiKeys = [
    {
      name: 'API Key Management',
      description: 'Create, revoke, and rotate machine API keys for DevCard public API access.',
    },
  ];
</script>

<svelte:head>
  <title>DevCard Settings</title>
</svelte:head>

<section class="settings-page">
  <h1>Settings</h1>
  <div class="settings-panel">
    <h2>API Key Management</h2>
    <p>
      Manage your DevCard API keys here. You can create new keys for automated workflows and revoke
      keys that should no longer have access.
    </p>
    <div class="stub-card">
      <p>This is a stub UI for API key management. The public API docs are available at:</p>
      <a href="/api/v1/docs" target="_blank">/api/v1/docs</a>
    </div>
    <div class="details-grid">
      {#each apiKeys as apiKey}
        <article class="detail-card">
          <h3>{apiKey.name}</h3>
          <p>{apiKey.description}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .settings-page {
    max-width: 900px;
    margin: 4rem auto;
    padding: 0 1.5rem;
  }

  .settings-panel {
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
  }

  .stub-card {
    margin-top: 1rem;
    padding: 1.5rem;
    background: #f8fafc;
    border-radius: 0.75rem;
    border: 1px dashed rgba(15, 23, 42, 0.18);
  }

  .stub-card a {
    color: #2563eb;
    text-decoration: underline;
  }

  .details-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .detail-card {
    padding: 1.25rem;
    border-radius: 0.75rem;
    background: white;
    border: 1px solid rgba(15, 23, 42, 0.08);
  }
</style>
