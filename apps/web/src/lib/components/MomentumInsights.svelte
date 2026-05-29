<script lang="ts">
  import InsightFeed from '$lib/components/InsightFeed.svelte';

  let {
    insights = [
      { type: 'positive', text: 'You are on a 14-day contribution streak! Predicted to hit 21 days based on velocity.' },
      { type: 'warning', text: 'Your networking reach has decreased by 5% this week. Engage with 3 new issues to recover momentum.' },
      { type: 'neutral', text: 'OSS Engagement is stable. Your next major tier milestone is 150 points away.' }
    ]
  } = $props<{
    insights?: { type: 'positive' | 'warning' | 'neutral', text: string }[];
  }>();
</script>

<InsightFeed title="⚡ Momentum Insights" items={insights} />
