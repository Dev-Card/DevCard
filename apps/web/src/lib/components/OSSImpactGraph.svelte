<script lang="ts">
  let {
    data = [
      { label: 'Jan', value: 45 },
      { label: 'Feb', value: 72 },
      { label: 'Mar', value: 58 },
      { label: 'Apr', value: 89 },
      { label: 'May', value: 114 },
      { label: 'Jun', value: 92 }
    ],
    title = 'OSS Impact (Commits/PRs)',
    maxExpected = 150
  } = $props<{
    data?: { label: string, value: number }[];
    title?: string;
    maxExpected?: number;
  }>();

  let maxVal = $derived(Math.max(...data.map(d => d.value), maxExpected));
</script>

<div class="impact-graph glass">
  <div class="graph-header">
    <h3>{title}</h3>
  </div>

  <div class="graph-container">
    <div class="y-axis">
      <span>{maxVal}</span>
      <span>{Math.round(maxVal / 2)}</span>
      <span>0</span>
    </div>
    
    <div class="bars-area">
      {#each data as item}
        <div class="bar-group">
          <div 
            class="bar" 
            style="height: {(item.value / maxVal) * 100}%"
            title="{item.value} contributions in {item.label}"
            role="button"
            aria-label="{item.value} contributions in {item.label}"
            tabindex="0"
          >
            <div class="bar-fill"></div>
          </div>
          <span class="x-label">{item.label}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .impact-graph {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }

  .graph-header h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .graph-container {
    display: flex;
    flex: 1;
    gap: 1rem;
    min-height: 200px;
  }

  .y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: var(--text-muted);
    font-size: 0.75rem;
    padding-bottom: 24px; /* Space for x-labels */
    text-align: right;
  }

  .bars-area {
    display: flex;
    flex: 1;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 24px; /* Space for x-labels */
    position: relative;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .bar-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: flex-end;
    position: relative;
    width: 32px;
  }

  .bar {
    width: 100%;
    background: rgba(99, 102, 241, 0.15);
    border-radius: 4px 4px 0 0;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .bar-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: linear-gradient(to top, rgba(99, 102, 241, 0.6), var(--primary));
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .bar:hover, .bar:focus-visible {
    transform: translateY(-2px);
    background: rgba(99, 102, 241, 0.25);
  }

  .bar:hover .bar-fill, .bar:focus-visible .bar-fill {
    opacity: 1;
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
  }

  .bar:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 4px;
  }

  .x-label {
    position: absolute;
    bottom: -24px;
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>
