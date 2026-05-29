<script lang="ts">
  let showBreakdown = $state(false);

  const reputationMetrics = [
    { name: 'Smart Contract Deployments', count: 14, pts: 280, icon: '📜', desc: 'Deployments on Ethereum, Polygon, and Arbitrum mainnets.' },
    { name: 'DAO Voting & Governance', count: 22, pts: 220, icon: '🗳️', desc: 'Active voting participation in Uniswap and Gitcoin DAOs.' },
    { name: 'PGP Signed Commits', count: 185, pts: 185, icon: '🔑', desc: 'Cryptographically signed commits verified on GitHub.' },
    { name: 'On-Chain Sponsorships', count: 3, pts: 150, icon: '💎', desc: 'Direct developer support via Gitcoin Grants and Web3 bounties.' }
  ];

  let totalScore = $derived(reputationMetrics.reduce((sum, item) => sum + item.pts, 0));
  let maxScore = 1000;
  let percentile = 'Top 1.8%';
  let reputationTier = 'Ecosystem Legend';
</script>

<div class="decentralized-reputation glass">
  <div class="card-header">
    <span class="header-icon">🧬</span>
    <div class="title-area">
      <h3>Web3 Reputation Score</h3>
      <span class="sub">On-Chain Activity & Trust Metrics</span>
    </div>
  </div>

  <div class="score-display">
    <div class="radial-gauge">
      <svg class="progress-ring" width="130" height="130" viewBox="0 0 130 130">
        <circle class="ring-bg" cx="65" cy="65" r="58" />
        <circle 
          class="ring-progress" 
          cx="65" cy="65" r="58" 
          stroke-dasharray="364.42" 
          stroke-dashoffset="{364.42 - (364.42 * (totalScore / maxScore))}" 
        />
      </svg>
      <div class="gauge-content">
        <span class="score-number gradient-text">{totalScore}</span>
        <span class="score-label">/ {maxScore}</span>
      </div>
    </div>
    
    <div class="tier-details">
      <span class="tier-badge">{reputationTier}</span>
      <span class="percentile-text">Percentile: <strong>{percentile}</strong></span>
    </div>
  </div>

  <div class="metrics-summary">
    <div class="summary-header">
      <span class="label">Trust Factor Breakdown</span>
      <button class="toggle-details" onclick={() => showBreakdown = !showBreakdown}>
        {showBreakdown ? 'Hide Details' : 'Show Details'}
      </button>
    </div>

    <div class="metrics-list {showBreakdown ? 'show-all' : ''}">
      {#each reputationMetrics as metric}
        <div class="metric-row">
          <div class="metric-info">
            <span class="metric-icon">{metric.icon}</span>
            <div class="metric-text-group">
              <span class="metric-name">{metric.name}</span>
              {#if showBreakdown}
                <p class="metric-desc">{metric.desc}</p>
              {:else}
                <span class="metric-sub">{metric.count} verified events</span>
              {/if}
            </div>
          </div>
          <span class="metric-points">+{metric.pts} XP</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .decentralized-reputation {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    height: 100%;
    min-height: 380px;
    justify-content: space-between;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-icon {
    font-size: 1.5rem;
  }

  .title-area {
    display: flex;
    flex-direction: column;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .sub {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .score-display {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0.5rem 0;
    gap: 1rem;
  }

  .radial-gauge {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
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
    stroke: url(#reputationGrad);
    /* Set stroke to gradient or solid cyan/neon-green */
    stroke: #10b981;
    filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.4));
    transition: stroke-dashoffset 1s ease-out;
  }

  .gauge-content {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .score-number {
    font-size: 2.25rem;
    font-weight: 900;
    font-family: 'Outfit', sans-serif;
    line-height: 1;
  }

  .score-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 0.2rem;
    font-weight: 600;
  }

  .tier-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tier-badge {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15));
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 4px 12px -4px rgba(16, 185, 129, 0.25);
  }

  .percentile-text {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .percentile-text strong {
    color: var(--text-primary);
  }

  .metrics-summary {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 0.85rem;
  }

  .summary-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 700;
  }

  .toggle-details {
    background: transparent;
    border: none;
    color: var(--primary);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: color 0.2s;
  }

  .toggle-details:hover {
    color: var(--accent);
  }

  .metrics-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 145px;
    overflow-y: auto;
    padding-right: 4px;
    transition: max-height 0.35s ease;
  }

  .metrics-list.show-all {
    max-height: 220px;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: var(--radius);
    padding: 0.45rem 0.75rem;
    transition: var(--theme-transition);
  }

  .metric-row:hover {
    background: rgba(16, 185, 129, 0.04);
    border-color: rgba(16, 185, 129, 0.15);
  }

  .metric-info {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .metric-icon {
    font-size: 1.1rem;
  }

  .metric-text-group {
    display: flex;
    flex-direction: column;
  }

  .metric-name {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .metric-sub {
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  .metric-desc {
    font-size: 0.7rem;
    color: var(--text-secondary);
    line-height: 1.3;
    margin-top: 0.15rem;
  }

  .metric-points {
    font-size: 0.75rem;
    font-weight: 800;
    color: #10b981;
  }
</style>
