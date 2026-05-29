<script lang="ts">
  let {
    title = 'Insights',
    items = [],
    variant = 'default',
    accentColor = '#8b5cf6'
  } = $props<{
    title?: string;
    items?: { type: 'positive' | 'warning' | 'neutral', text: string }[];
    variant?: 'default' | 'ai';
    accentColor?: string;
  }>();
</script>

<div class="insight-feed glass">
  <div class="header">
    <h3 style="--accent: {accentColor}">
      {#if variant === 'ai'}🤖 {/if}
      {title}
    </h3>
  </div>
  
  <ul class="insights-list">
    {#each items as item}
      <li class="insight-item {item.type}">
        <span class="indicator"></span>
        <!-- Safe rendering: text interpolation instead of @html -->
        <p class="insight-text">{item.text}</p>
      </li>
    {/each}
  </ul>
</div>

<style>
  .insight-feed {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    height: 100%;
  }

  .header h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .insights-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0;
    margin: 0;
    flex: 1;
  }

  .insight-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    padding: 1rem;
    border-radius: var(--radius);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .insight-item:hover {
    transform: translateX(4px);
    background: rgba(255, 255, 255, 0.04);
  }

  .indicator {
    min-width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 0.4rem;
  }

  .insight-item.positive .indicator { background-color: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.4); }
  .insight-item.warning .indicator { background-color: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.4); }
  .insight-item.neutral .indicator { background-color: var(--primary); box-shadow: 0 0 8px rgba(99,102,241,0.4); }

  .insight-text {
    font-size: 0.875rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
  }
</style>
