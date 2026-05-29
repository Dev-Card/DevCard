<script lang="ts">
  import AnalyticsWidget from '$lib/components/AnalyticsWidget.svelte';
  import ActivityHeatmap from '$lib/components/ActivityHeatmap.svelte';
  import ReputationScoreCard from '$lib/components/ReputationScoreCard.svelte';
  import OSSImpactGraph from '$lib/components/OSSImpactGraph.svelte';
  import ContributionRadar from '$lib/components/ContributionRadar.svelte';
  import VelocityScoreCard from '$lib/components/VelocityScoreCard.svelte';
  import ContributionForecastChart from '$lib/components/ContributionForecastChart.svelte';
  import MomentumInsights from '$lib/components/MomentumInsights.svelte';
  import GrowthRadar from '$lib/components/GrowthRadar.svelte';

  // Sample data for the dashboard
  const stats = [
    { title: 'Total Contributions', value: '1,429', trend: '12%', isPositive: true, icon: '🔥' },
    { title: 'Merge Success Rate', value: '98.5%', trend: '2.1%', isPositive: true, icon: '✅' },
    { title: 'Avg PR Review Time', value: '2.4h', trend: '1.2h', isPositive: false, icon: '⏱️' },
    { title: 'Global Rank (GSSOC)', value: '#42', trend: '15', isPositive: true, icon: '🏆' }
  ];
</script>

<svelte:head>
  <title>Analytics Command Center | DevCard</title>
</svelte:head>

<div class="dashboard-layout">
  <header class="dashboard-header">
    <div class="title-group">
      <h1 class="gradient-text">GitHub Analytics Command Center</h1>
      <p class="subtitle">Realtime insights into contributor intelligence and repository health.</p>
    </div>
    <div class="actions">
      <button class="btn-secondary">Export Report</button>
      <button class="btn-primary">Sync GitHub</button>
    </div>
  </header>

  <main class="dashboard-content">
    <section class="kpi-grid">
      {#each stats as stat}
        <AnalyticsWidget 
          title={stat.title} 
          value={stat.value} 
          trend={stat.trend} 
          isPositive={stat.isPositive} 
          icon={stat.icon} 
        />
      {/each}
    </section>

    <section class="main-widgets">
      <div class="heatmap-section">
        <ActivityHeatmap />
      </div>
      
      <div class="ai-insights glass">
        <div class="insights-header">
          <h3>🤖 AI Contribution Insights</h3>
        </div>
        <ul class="insights-list">
          <li class="insight-item positive">
            <span class="bullet"></span>
            <p><strong>High merge probability</strong> detected for your recent frontend PRs based on historical maintainer behavior.</p>
          </li>
          <li class="insight-item warning">
            <span class="bullet"></span>
            <p>Your PR review time is slightly above average today. Consider smaller, isolated commits.</p>
          </li>
          <li class="insight-item neutral">
            <span class="bullet"></span>
            <p>Found 3 open issues matching your <strong>React/Next.js</strong> skillset with "critical" priority.</p>
          </li>
        </ul>
        <button class="btn-secondary view-all">View All Insights</button>
      </div>
    </section>

    <div class="section-title">
      <h2>AI Reputation & Impact</h2>
    </div>

    <section class="reputation-widgets">
      <div class="rep-card">
        <ReputationScoreCard />
      </div>
      <div class="rep-graph">
        <OSSImpactGraph />
      </div>
      <div class="rep-radar">
        <ContributionRadar />
      </div>
    </section>

    <div class="section-title">
      <h2>Contribution Velocity Predictor</h2>
    </div>

    <section class="velocity-widgets">
      <div class="velocity-card-wrapper">
        <VelocityScoreCard />
        <MomentumInsights />
      </div>
      <div class="velocity-graph">
        <ContributionForecastChart />
      </div>
      <div class="velocity-radar">
        <GrowthRadar />
      </div>
    </section>
  </main>
</div>

<style>
  .dashboard-layout {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .title-group h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 1.125rem;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 1rem;
  }

  .dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .main-widgets {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 1024px) {
    .main-widgets {
      grid-template-columns: 1fr;
    }
  }

  .ai-insights {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .insights-header h3 {
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .insights-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    flex-grow: 1;
  }

  .insight-item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .bullet {
    min-width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 0.4rem;
  }

  .insight-item.positive .bullet { background-color: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.4); }
  .insight-item.warning .bullet { background-color: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.4); }
  .insight-item.neutral .bullet { background-color: var(--primary); box-shadow: 0 0 8px rgba(99,102,241,0.4); }

  .insight-item p strong {
    color: var(--text-primary);
  }

  .view-all {
    width: 100%;
    margin-top: auto;
  }

  .section-title {
    margin-top: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .section-title h2 {
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .reputation-widgets {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .reputation-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .rep-graph {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .reputation-widgets {
      grid-template-columns: 1fr;
    }
    .rep-graph {
      grid-column: span 1;
    }
  }

  .velocity-widgets {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 1.5rem;
  }

  .velocity-card-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .velocity-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .velocity-graph {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .velocity-widgets {
      grid-template-columns: 1fr;
    }
    .velocity-graph {
      grid-column: span 1;
    }
  }
</style>
