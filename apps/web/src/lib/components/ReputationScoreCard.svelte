<script lang="ts">
  let { 
    score = 850,
    tier = 'Diamond',
    rank = 42,
    percentile = 'Top 1%',
    trend = '+15'
  } = $props<{
    score?: number;
    tier?: string;
    rank?: number;
    percentile?: string;
    trend?: string;
  }>();

  // Basic animation for score could be added later, static for now
</script>

<div class="reputation-card glass">
  <div class="header">
    <div class="title-group">
      <h3>AI Reputation Score</h3>
      <span class="tier-badge {tier.toLowerCase()}">{tier} Tier</span>
    </div>
    <div class="trend positive">
      ↑ {trend} pts
    </div>
  </div>

  <div class="score-display">
    <svg class="progress-ring" width="120" height="120" viewBox="0 0 120 120">
      <circle class="ring-bg" cx="60" cy="60" r="54" />
      <circle 
        class="ring-progress {tier.toLowerCase()}" 
        cx="60" cy="60" r="54" 
        stroke-dasharray="339.292" 
        stroke-dashoffset="{339.292 - (339.292 * (score / 1000))}" 
      />
    </svg>
    <div class="score-value">
      <span class="number">{score}</span>
      <span class="label">/ 1000</span>
    </div>
  </div>

  <div class="stats-footer">
    <div class="stat">
      <span class="stat-label">Global Rank</span>
      <span class="stat-value">#{rank}</span>
    </div>
    <div class="divider"></div>
    <div class="stat">
      <span class="stat-label">Percentile</span>
      <span class="stat-value">{percentile}</span>
    </div>
  </div>
</div>

<style>
  .reputation-card {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: relative;
    overflow: hidden;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .tier-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    width: max-content;
  }

  .tier-badge.diamond { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); }
  .tier-badge.gold { background: rgba(250, 204, 21, 0.15); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.3); }
  .tier-badge.silver { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }

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

  .score-display {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem 0;
  }

  .progress-ring {
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 8;
  }

  .ring-progress {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s ease-out;
  }

  .ring-progress.diamond { stroke: #818cf8; }
  .ring-progress.gold { stroke: #facc15; }
  .ring-progress.silver { stroke: #94a3b8; }

  .score-value {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .score-value .number {
    font-size: 2.5rem;
    font-weight: 800;
    font-family: 'Outfit', sans-serif;
    color: var(--text-primary);
    line-height: 1;
  }

  .score-value .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .stats-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1.25rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .stat:last-child {
    text-align: right;
  }

  .divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
  }
</style>
