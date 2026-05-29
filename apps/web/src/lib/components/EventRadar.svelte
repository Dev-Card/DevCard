<script lang="ts">
  import BaseRadarChart from './BaseRadarChart.svelte';

  let {
    data = [
      { label: 'Web3', value: 85 },
      { label: 'AI', value: 95 },
      { label: 'Open Source', value: 100 },
      { label: 'Networking', value: 70 },
      { label: 'Cloud', value: 60 }
    ],
    size = 280
  } = $props<{
    data?: { label: string, value: number }[];
    size?: number;
  }>();
</script>

<BaseRadarChart
  title="Event Dominance"
  {data}
  {size}
  accentColor="#ec4899"
  fillColor="rgba(236, 72, 153, 0.2)"
  ariaLabel="Radar chart showing dominance across event categories"
/>
