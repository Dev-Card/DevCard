<script lang="ts">
  let {
    mrr = 2450,
    sponsors = 18,
    distribution = [
      { tier: 'Enterprise', amount: 1500, count: 2, color: '#8b5cf6' },
      { tier: 'Pro', amount: 600, count: 6, color: '#3b82f6' },
      { tier: 'Supporter', amount: 350, count: 10, color: '#10b981' }
    ]
  } = $props<{
    mrr?: number;
    sponsors?: number;
    distribution?: { tier: string, amount: number, count: number, color: string }[];
  }>();

  let maxAmount = $derived(Math.max(...distribution.map(d => d.amount)));
</script>

<div class="sponsorship-graph glass">
  <div class="header">
    <h3>Sponsorships</h3>
    <span class="mrr">${mrr.toLocaleString()}/mo</span>
  </div>

  <div class="summary-box">
    <div class="stat">
      <span class="value">{sponsors}</span>
      <span class="label">Active Sponsors</span>
    </div>
    <div class="trend positive">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
      <span>+3 this month</span>
    </div>
  </div>

  <div class="distribution">
    <h4>Funding Distribution</h4>
    <div class="bars">
      {#each distribution as tier}
        <div class="bar-row">
          <div class="bar-info">
            <span class="tier-name">{tier.tier}</span>
            <span class="tier-count">{tier.count} sponsors</span>
          </div>
          <div class="bar-track">
            <div 
              class="bar-fill" 
              style="width: {(tier.amount / mrr) * 100}%; background: {tier.color};"
            ></div>
          </div>
          <span class="bar-value">${tier.amount}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .sponsorship-graph {
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

  .mrr {
    font-size: 1.25rem;
    font-weight: 800;
    color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius);
  }

  .summary-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1rem 1.25rem;
    border-radius: var(--radius);
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .trend.positive { color: #10b981; }

  .distribution {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
  }

  h4 {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .bar-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .bar-info {
    width: 90px;
    display: flex;
    flex-direction: column;
  }

  .tier-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .tier-count {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .bar-track {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 1s ease-out;
  }

  .bar-value {
    width: 50px;
    text-align: right;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }
</style>
