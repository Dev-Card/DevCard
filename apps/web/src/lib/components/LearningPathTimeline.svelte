<script lang="ts">
  let {
    paths = [
      { id: 1, title: 'Master Advanced TypeScript', status: 'completed', duration: '2 weeks' },
      { id: 2, title: 'Build a Distributed Cache', status: 'in-progress', duration: '3 weeks' },
      { id: 3, title: 'Contribute to Redis Core', status: 'upcoming', duration: '1 month' },
      { id: 4, title: 'System Design Interview Prep', status: 'upcoming', duration: '2 weeks' }
    ]
  } = $props<{
    paths?: { id: number, title: string, status: 'completed' | 'in-progress' | 'upcoming', duration: string }[];
  }>();
</script>

<div class="learning-path glass">
  <div class="header">
    <h3>Learning Roadmap</h3>
    <span class="badge">AI Generated</span>
  </div>

  <div class="timeline">
    {#each paths as path, i}
      <div class="path-node {path.status}">
        <div class="marker-col">
          <div class="marker">
            {#if path.status === 'completed'}
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            {:else if path.status === 'in-progress'}
              <div class="pulse"></div>
            {/if}
          </div>
          {#if i < paths.length - 1}
            <div class="connector"></div>
          {/if}
        </div>
        
        <div class="content-col">
          <h4 class="title">{path.title}</h4>
          <span class="duration">{path.duration}</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .learning-path {
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

  .badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    text-transform: uppercase;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .path-node {
    display: flex;
    gap: 1rem;
    min-height: 70px;
  }

  .marker-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 24px;
  }

  .marker {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  .completed .marker {
    background: #10b981;
    border-color: #10b981;
  }

  .in-progress .marker {
    background: transparent;
    border-color: #38bdf8;
  }

  .pulse {
    width: 10px;
    height: 10px;
    background: #38bdf8;
    border-radius: 50%;
    box-shadow: 0 0 10px #38bdf8;
  }

  .connector {
    width: 2px;
    flex: 1;
    background: rgba(255, 255, 255, 0.1);
    margin: 4px 0;
  }

  .completed .connector {
    background: rgba(16, 185, 129, 0.5);
  }

  .content-col {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-bottom: 1.5rem;
  }

  .title {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .completed .title { color: var(--text-muted); text-decoration: line-through; }
  .in-progress .title { color: var(--text-primary); }

  .duration {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>
