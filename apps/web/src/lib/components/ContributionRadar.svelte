<script lang="ts">
  import BaseRadarChart from './BaseRadarChart.svelte';

  let {
    data = [
      { label: 'Frontend', value: 85 },
      { label: 'Backend', value: 60 },
      { label: 'DevOps', value: 40 },
      { label: 'Community', value: 75 },
      { label: 'Architecture', value: 50 }
    ],
    size = 240
  } = $props<{
    data?: { label: string, value: number }[];
    size?: number;
  }>();
</script>

<BaseRadarChart
  title="Contribution Radar"
  {data}
  {size}
  accentColor="var(--primary)"
  fillColor="rgba(99, 102, 241, 0.3)"
  ariaLabel="Radar chart showing multi-dimensional developer contribution alignment"
/>
