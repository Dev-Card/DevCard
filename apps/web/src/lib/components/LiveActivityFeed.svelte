<script lang="ts">
  import InsightFeed from '$lib/components/InsightFeed.svelte';

  let {
    activities = [
      { type: 'positive', text: '<strong>Alex Chen</strong> just checked in at the Open Source Hackathon!' },
      { type: 'neutral', text: 'Registration for <em>Svelte Summit 2026</em> opens in 2 hours.' },
      { type: 'warning', text: 'Your RSVP for the Local Dev Meetup is pending confirmation.' }
    ]
  } = $props<{
    activities?: { type: 'positive' | 'warning' | 'neutral', text: string }[];
  }>();
</script>

<InsightFeed 
  title="Live Activity Feed" 
  items={activities} 
  accentColor="#ec4899"
/>
