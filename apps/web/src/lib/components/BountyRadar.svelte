<script lang="ts">
  import BaseRadarChart from './BaseRadarChart.svelte';

  let {
    data = [
      { label: 'Smart Contracts', value: 40 },
      { label: 'Frontend', value: 90 },
      { label: 'Backend APIs', value: 65 },
      { label: 'DevOps', value: 30 },
      { label: 'Documentation', value: 85 }
    ],
    size = 280
  } = $props<{
    data?: { label: string, value: number }[];
    size?: number;
  }>();
</script>

<BaseRadarChart
  title="Bounty Success by Sector"
  {data}
  {size}
  accentColor="#10b981"
  fillColor="rgba(16, 185, 129, 0.2)"
  ariaLabel="Radar chart showing bounty success rate across development sectors"
/>
