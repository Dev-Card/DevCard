<script lang="ts">

  let { 
    title, 
    value, 
    trend, 
    isPositive = true, 
    icon = '📊' 
  } = $props<{
    title: string;
    value: string;
    trend: string;
    isPositive?: boolean;
    icon?: string;
  }>();
</script>

<div class="analytics-widget glass">
  <div class="widget-header">
    <div class="icon-wrapper">
      <span class="icon">{icon}</span>
    </div>
    <span class="trend {isPositive ? 'positive' : 'negative'}">
      {isPositive ? '↑' : '↓'} {trend}
    </span>
  </div>
  
  <div class="widget-content">
    <h3 class="title">{title}</h3>
    <div class="value gradient-text">{value}</div>
  </div>
</div>

<style>
  .analytics-widget {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
    cursor: default;
    position: relative;
    overflow: hidden;
  }

  .analytics-widget::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at top right, var(--primary-glow), transparent 70%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .analytics-widget:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .analytics-widget:hover::before {
    opacity: 1;
  }

  .widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .icon-wrapper {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border-glass);
  }
  
  .icon {
    font-size: 1.25rem;
  }

  .trend {
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
  }

  .trend.positive {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .trend.negative {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .widget-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .title {
    font-size: 0.875rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: 'Inter', sans-serif;
  }

  .value {
    font-size: 2.25rem;
    font-weight: 800;
    font-family: 'Outfit', sans-serif;
  }
</style>
