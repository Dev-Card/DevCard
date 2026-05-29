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
  import NetworkingPulseCard from '$lib/components/NetworkingPulseCard.svelte';
  import RealtimeConnectionStream from '$lib/components/RealtimeConnectionStream.svelte';
  import NetworkingGrowthForecast from '$lib/components/NetworkingGrowthForecast.svelte';
  import EventInteractionHeatmap from '$lib/components/EventInteractionHeatmap.svelte';
  import AIEngagementInsights from '$lib/components/AIEngagementInsights.svelte';
  import DeveloperMatchCard from '$lib/components/DeveloperMatchCard.svelte';
  import CompatibilityRadar from '$lib/components/CompatibilityRadar.svelte';
  import AISkillMatcher from '$lib/components/AISkillMatcher.svelte';
  import NetworkingRecommendationPanel from '$lib/components/NetworkingRecommendationPanel.svelte';
  import EventTimeline from '$lib/components/EventTimeline.svelte';
  import EventRadar from '$lib/components/EventRadar.svelte';
  import LiveActivityFeed from '$lib/components/LiveActivityFeed.svelte';
  import RSVPTracker from '$lib/components/RSVPTracker.svelte';
  import GlobalLeaderboard from '$lib/components/GlobalLeaderboard.svelte';
  import RankingTierCard from '$lib/components/RankingTierCard.svelte';
  import TopContributorsFeed from '$lib/components/TopContributorsFeed.svelte';
  import AchievementBadges from '$lib/components/AchievementBadges.svelte';
  import BountyBoard from '$lib/components/BountyBoard.svelte';
  import SponsorshipGraph from '$lib/components/SponsorshipGraph.svelte';
  import BountyEarningsChart from '$lib/components/BountyEarningsChart.svelte';
  import BountyRadar from '$lib/components/BountyRadar.svelte';
  import PortfolioThemeSelector from '$lib/components/PortfolioThemeSelector.svelte';
  import WidgetCustomizer from '$lib/components/WidgetCustomizer.svelte';
  import LivePreviewPane from '$lib/components/LivePreviewPane.svelte';
  import EmbedCodeGenerator from '$lib/components/EmbedCodeGenerator.svelte';
  import SkillGapAnalyzer from '$lib/components/SkillGapAnalyzer.svelte';
  import LearningPathTimeline from '$lib/components/LearningPathTimeline.svelte';
  import CodeReviewInsights from '$lib/components/CodeReviewInsights.svelte';
  import MentorshipMatch from '$lib/components/MentorshipMatch.svelte';
  import Web3WalletConnect from '$lib/components/Web3WalletConnect.svelte';
  import VerifiableCredentials from '$lib/components/VerifiableCredentials.svelte';
  import NFTBadgeShowcase from '$lib/components/NFTBadgeShowcase.svelte';
  import DecentralizedReputation from '$lib/components/DecentralizedReputation.svelte';
  import TeamCompatibilityMatrix from '$lib/components/TeamCompatibilityMatrix.svelte';
  import ActiveWorkloadDistribution from '$lib/components/ActiveWorkloadDistribution.svelte';
  import OrgHierarchyTree from '$lib/components/OrgHierarchyTree.svelte';
  import PeerReviewFeedback from '$lib/components/PeerReviewFeedback.svelte';

  let portfolioTheme = $state('glassmorphism');

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

    <div class="section-title">
      <h2>Networking & Event Intelligence</h2>
    </div>

    <section class="networking-widgets">
      <div class="network-sidebar">
        <NetworkingPulseCard />
        <RealtimeConnectionStream />
      </div>
      <div class="network-main">
        <EventInteractionHeatmap />
        <NetworkingGrowthForecast />
      </div>
      <div class="network-insights">
        <AIEngagementInsights />
      </div>
    </section>

    <div class="section-title">
      <h2>AI Smart Developer Match Engine</h2>
    </div>

    <section class="match-widgets">
      <div class="match-card-wrapper">
        <DeveloperMatchCard />
      </div>
      <div class="match-radar-wrapper">
        <CompatibilityRadar />
      </div>
      <div class="match-insights-wrapper">
        <NetworkingRecommendationPanel />
        <AISkillMatcher />
      </div>
    </section>

    <div class="section-title">
      <h2>Event Intelligence Command Center</h2>
    </div>

    <section class="event-widgets">
      <div class="event-timeline-wrapper">
        <EventTimeline />
      </div>
      <div class="event-radar-wrapper">
        <EventRadar />
      </div>
      <div class="event-activity-wrapper">
        <RSVPTracker />
        <LiveActivityFeed />
      </div>
    </section>

    <div class="section-title">
      <h2>Global Rankings & Achievements</h2>
    </div>

    <section class="ranking-widgets">
      <div class="ranking-leaderboard-wrapper">
        <GlobalLeaderboard />
      </div>
      <div class="ranking-tier-wrapper">
        <RankingTierCard />
        <AchievementBadges />
      </div>
      <div class="ranking-feed-wrapper">
        <TopContributorsFeed />
      </div>
    </section>

    <div class="section-title">
      <h2>Monetization & Bounties</h2>
    </div>

    <section class="monetization-widgets">
      <div class="bounty-board-wrapper">
        <BountyBoard />
      </div>
      <div class="bounty-charts-wrapper">
        <BountyEarningsChart />
        <SponsorshipGraph />
      </div>
      <div class="bounty-radar-wrapper">
        <BountyRadar />
      </div>
    </section>

    <div class="section-title">
      <h2>AI Mentor & Career Growth</h2>
    </div>

    <section class="mentor-widgets">
      <div class="skill-gap-wrapper">
        <SkillGapAnalyzer />
      </div>
      <div class="learning-timeline-wrapper">
        <LearningPathTimeline />
      </div>
      <div class="mentor-match-wrapper">
        <MentorshipMatch />
        <div style="height: 1.5rem;"></div>
        <CodeReviewInsights />
      </div>
    </section>

    <div class="section-title">
      <h2>Team & Organization Dynamics</h2>
    </div>

    <section class="team-widgets">
      <div class="team-matrix-wrapper">
        <TeamCompatibilityMatrix />
      </div>
      <div class="team-workload-wrapper">
        <ActiveWorkloadDistribution />
      </div>
      <div class="team-hierarchy-wrapper">
        <OrgHierarchyTree />
      </div>
      <div class="peer-feedback-wrapper">
        <PeerReviewFeedback />
      </div>
    </section>

    <div class="section-title">
      <h2>Web3 & Decentralized Identity</h2>
    </div>

    <section class="web3-widgets">
      <div class="wallet-connect-wrapper">
        <Web3WalletConnect />
      </div>
      <div class="verifiable-credentials-wrapper">
        <VerifiableCredentials />
      </div>
      <div class="nft-showcase-wrapper">
        <NFTBadgeShowcase />
      </div>
      <div class="decentralized-reputation-wrapper">
        <DecentralizedReputation />
      </div>
    </section>

    <div class="section-title">
      <h2>Export & Portfolio</h2>
    </div>

    <section class="export-widgets">
      <div class="export-config-wrapper">
        <PortfolioThemeSelector 
          activeTheme={portfolioTheme} 
          onThemeSelect={(t) => portfolioTheme = t} 
        />
        <WidgetCustomizer />
      </div>
      <div class="export-preview-wrapper">
        <LivePreviewPane theme={portfolioTheme} />
      </div>
      <div class="export-code-wrapper">
        <EmbedCodeGenerator theme={portfolioTheme} />
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

  .networking-widgets {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 1.5rem;
  }

  .network-sidebar, .network-main, .network-insights {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .networking-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .network-main {
      grid-column: span 2;
      order: -1; /* Bring heatmap and forecast up */
    }
  }

  @media (max-width: 768px) {
    .networking-widgets {
      grid-template-columns: 1fr;
    }
    .network-main {
      grid-column: span 1;
    }
  }

  .match-widgets {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 1.5rem;
  }

  .match-card-wrapper, .match-radar-wrapper, .match-insights-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .match-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .match-radar-wrapper {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .match-widgets {
      grid-template-columns: 1fr;
    }
    .match-radar-wrapper {
      grid-column: span 1;
    }
  }

  .event-widgets {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 1.5rem;
  }

  .event-timeline-wrapper, .event-radar-wrapper, .event-activity-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .event-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .event-radar-wrapper {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .event-widgets {
      grid-template-columns: 1fr;
    }
    .event-radar-wrapper {
      grid-column: span 1;
    }
  }

  .ranking-widgets {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 1.5rem;
  }

  .ranking-leaderboard-wrapper, .ranking-tier-wrapper, .ranking-feed-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .ranking-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .ranking-leaderboard-wrapper {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .ranking-widgets {
      grid-template-columns: 1fr;
    }
    .ranking-leaderboard-wrapper {
      grid-column: span 1;
    }
  }

  .monetization-widgets {
    display: grid;
    grid-template-columns: 1fr 1.5fr 1fr;
    gap: 1.5rem;
  }

  .bounty-board-wrapper, .bounty-charts-wrapper, .bounty-radar-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .monetization-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .bounty-radar-wrapper {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .monetization-widgets {
      grid-template-columns: 1fr;
    }
    .bounty-radar-wrapper {
      grid-column: span 1;
    }
  }

  .mentor-widgets {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1.5fr;
    gap: 1.5rem;
  }

  .skill-gap-wrapper, .learning-timeline-wrapper, .mentor-match-wrapper {
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 1200px) {
    .mentor-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .mentor-match-wrapper {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .mentor-widgets {
      grid-template-columns: 1fr;
    }
    .mentor-match-wrapper {
      grid-column: span 1;
    }
  }

  .export-widgets {
    display: grid;
    grid-template-columns: 1fr 1fr 1.5fr;
    gap: 1.5rem;
  }

  .export-config-wrapper, .export-preview-wrapper, .export-code-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (max-width: 1200px) {
    .export-widgets {
      grid-template-columns: 1fr 1fr;
    }
    .export-code-wrapper {
      grid-column: span 2;
    }
  }

  @media (max-width: 768px) {
    .export-widgets {
      grid-template-columns: 1fr;
    }
    .export-code-wrapper {
      grid-column: span 1;
    }
  }

  .web3-widgets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  .wallet-connect-wrapper,
  .verifiable-credentials-wrapper,
  .nft-showcase-wrapper,
  .decentralized-reputation-wrapper {
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 1200px) {
    .web3-widgets {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .web3-widgets {
      grid-template-columns: 1fr;
    }
  }

  .team-widgets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }

  .team-matrix-wrapper,
  .team-workload-wrapper,
  .team-hierarchy-wrapper,
  .peer-feedback-wrapper {
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 1200px) {
    .team-widgets {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .team-widgets {
      grid-template-columns: 1fr;
    }
  }
</style>
