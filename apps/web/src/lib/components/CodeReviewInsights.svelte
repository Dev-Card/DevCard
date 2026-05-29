<script lang="ts">
  let {
    insights = [
      { id: 1, type: 'positive', message: 'Consistent use of early returns improves readability.', file: 'authController.ts' },
      { id: 2, type: 'improvement', message: 'Consider extracting inline styles to CSS modules.', file: 'DashboardLayout.svelte' },
      { id: 3, type: 'critical', message: 'Missing error boundary in data fetching hook.', file: 'useProfile.ts' }
    ]
  } = $props<{
    insights?: { id: number, type: 'positive' | 'improvement' | 'critical', message: string, file: string }[];
  }>();

  function getIconColor(type: string) {
    if (type === 'positive') return '#10b981';
    if (type === 'improvement') return '#f59e0b';
    return '#ef4444';
  }
</script>

<div class="code-review-insights glass">
  <div class="header">
    <h3>AI Code Review Trends</h3>
    <button class="btn-analyze">Analyze Recent PRs</button>
  </div>

  <div class="insights-list">
    {#each insights as insight}
      <div class="insight-card {insight.type}">
        <div class="insight-icon" style="background: {getIconColor(insight.type)}20; color: {getIconColor(insight.type)}">
          {#if insight.type === 'positive'}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          {:else if insight.type === 'improvement'}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          {/if}
        </div>
        <div class="insight-content">
          <p class="message">{insight.message}</p>
          <span class="file">{insight.file}</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .code-review-insights {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .btn-analyze {
    background: rgba(99, 102, 241, 0.1);
    color: var(--primary);
    border: 1px solid rgba(99, 102, 241, 0.2);
    padding: 0.4rem 0.75rem;
    border-radius: var(--radius);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-analyze:hover {
    background: rgba(99, 102, 241, 0.2);
  }

  .insights-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
    overflow-y: auto;
  }

  .insight-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    transition: transform 0.2s;
  }

  .insight-card:hover {
    transform: translateX(4px);
    background: rgba(255, 255, 255, 0.04);
  }

  .insight-card.positive { border-left: 3px solid #10b981; }
  .insight-card.improvement { border-left: 3px solid #f59e0b; }
  .insight-card.critical { border-left: 3px solid #ef4444; }

  .insight-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .insight-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .message {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .file {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: monospace;
  }
</style>
