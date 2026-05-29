<script lang="ts">
  import InsightFeed from '$lib/components/InsightFeed.svelte';

  let {
    updates = [
      { type: 'positive', text: '<strong>Sarah Chen</strong> merged 4 PRs to <em>sveltejs/svelte</em> this week.' },
      { type: 'neutral', text: 'New bounties posted in <strong>vercel/next.js</strong>. High point rewards available!' },
      { type: 'positive', text: '<strong>David Kim</strong> reached Master Tier.' }
    ]
  } = $props<{
    updates?: { type: 'positive' | 'warning' | 'neutral', text: string }[];
  }>();
</script>

<InsightFeed 
  title="Top Contributors Feed" 
  items={updates} 
  accentColor="#fbbf24"
/>
