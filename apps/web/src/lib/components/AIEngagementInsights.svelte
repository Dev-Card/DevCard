<script lang="ts">
  import InsightFeed from '$lib/components/InsightFeed.svelte';

  let {
    insights = [
      { type: 'positive', text: 'Peak engagement detected! You just connected with 5 senior engineers in the last hour.' },
      { type: 'warning', text: 'Your event visibility is dropping. Scan 2 more QR codes to stay on the leaderboard.' },
      { type: 'neutral', text: 'You have a 60% skill overlap with the current hackathon attendees.' }
    ]
  } = $props<{
    insights?: { type: 'positive' | 'warning' | 'neutral', text: string }[];
  }>();
</script>

<InsightFeed title="Engagement Intelligence" items={insights} variant="ai" />
