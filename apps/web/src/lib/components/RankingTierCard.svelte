<script lang="ts">
  let {
    tier = 'Diamond',
    rank = 142,
    percentile = 1.5,
    points = 9540,
    nextTierPoints = 12000
  } = $props<{
    tier?: string;
    rank?: number;
    percentile?: number;
    points?: number;
    nextTierPoints?: number;
  }>();

  let progress = $derived((points / nextTierPoints) * 100);
  let circumference = $derived(2 * Math.PI * 54);
  let strokeDashoffset = $derived(circumference - (progress / 100) * circumference);
</script>

<div class="ranking-tier-card glass">
  <div class="header">
    <h3>Current Tier</h3>
    <span class="badge">Top {percentile}%</span>
  </div>

  <div class="tier-display">
    <div class="progress-ring-container">
      <svg class="progress-ring" viewBox="0 0 120 120">
        <circle class="ring-bg" cx="60" cy="60" r="54" />
        <circle 
          class="ring-progress" 
          cx="60" cy="60" r="54" 
          style="stroke-dasharray: {circumference}; stroke-dashoffset: {strokeDashoffset};"
        />
      </svg>
      <div class="tier-content">
        <span class="tier-name {tier.toLowerCase()}">{tier}</span>
        <span class="rank-number">#{rank}</span>
      </div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <span class="stat-label">Total Points</span>
      <span class="stat-value">{points.toLocaleString()}</span>
    </div>
    <div class="stat-box">
      <span class="stat-label">Next Tier</span>
      <span class="stat-value">{nextTierPoints.toLocaleString()}</span>
    </div>
  </div>

  <div class="progress-text">
    {nextTierPoints - points} points to reach <strong>Master Tier</strong>
  </div>
</div>

<style>
  .ranking-tier-card {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
    align-items: center;
    justify-content: center;
  }

  .header {
    width: 100%;
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
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }

  .tier-display {
    position: relative;
    width: 160px;
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1rem 0;
  }

  .progress-ring-container {
    position: relative;
    width: 120px;
    height: 120px;
  }

  .progress-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 6;
  }

  .ring-progress {
    fill: none;
    stroke: #38bdf8;
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s ease-out;
  }

  .tier-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  .tier-name {
    font-size: 1.25rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .tier-name.diamond {
    background: linear-gradient(135deg, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .rank-number {
    font-size: 1rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .stats-grid {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .stat-box {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: var(--radius);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-align: center;
  }
</style>
