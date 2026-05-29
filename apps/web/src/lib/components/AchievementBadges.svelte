<script lang="ts">
  let {
    badges = [
      { id: 1, title: 'First PR', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', locked: false, color: '#3b82f6' },
      { id: 2, title: 'Hackathon Winner', icon: 'M12 15l-8.5-8.5 1.5-1.5L12 12l7-7 1.5 1.5L12 15z', locked: false, color: '#eab308' },
      { id: 3, title: '100 Commits', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14', locked: true, color: '#a8a29e' },
      { id: 4, title: 'Diamond Tier', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', locked: true, color: '#a8a29e' }
    ]
  } = $props<{
    badges?: { id: number, title: string, icon: string, locked: boolean, color: string }[];
  }>();
</script>

<div class="achievement-badges glass">
  <div class="header">
    <h3>Achievements</h3>
  </div>

  <div class="badges-grid">
    {#each badges as badge}
      <div class="badge-item {badge.locked ? 'locked' : ''}">
        <div class="icon-container" style="color: {badge.color}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d={badge.icon} />
          </svg>
        </div>
        <span class="badge-title">{badge.title}</span>
        {#if badge.locked}
          <div class="lock-overlay">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .achievement-badges {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }

  .header h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .badges-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 1rem;
    flex: 1;
  }

  .badge-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 0.5rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    position: relative;
    transition: transform 0.2s;
  }

  .badge-item:not(.locked):hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .icon-container {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 50%;
    padding: 0.75rem;
  }

  .badge-title {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-align: center;
    font-weight: 500;
  }

  .locked {
    opacity: 0.5;
    filter: grayscale(1);
  }

  .lock-overlay {
    position: absolute;
    top: 5px;
    right: 5px;
    color: var(--text-muted);
  }
</style>
