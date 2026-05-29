<script lang="ts">
  import InsightFeed from '$lib/components/InsightFeed.svelte';

  let {
    predictions = [
      { type: 'positive', text: 'You are highly compatible with <strong>DevCard API V2</strong> contributors based on your recent Fastify commits.' },
      { type: 'neutral', text: 'Consider joining the <em>Open Source Saturday</em> meetup. 12 matching developers will be there.' },
      { type: 'warning', text: 'Your backend skill overlap is high, but your profile lacks recent database contributions.' }
    ]
  } = $props<{
    predictions?: { type: 'positive' | 'warning' | 'neutral', text: string }[];
  }>();
</script>

<InsightFeed 
  title="AI Collaborator Predictions" 
  items={predictions} 
  variant="ai"
  accentColor="#22c55e"
/>
