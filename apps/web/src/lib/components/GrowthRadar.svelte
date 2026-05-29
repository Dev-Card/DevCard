<script lang="ts">
  import BaseRadarChart from './BaseRadarChart.svelte';

  let {
    data = [
      { label: 'Consistency', value: 90 },
      { label: 'Reach', value: 65 },
      { label: 'Engagement', value: 80 },
      { label: 'Visibility', value: 70 },
      { label: 'Velocity', value: 85 }
    ],
    size = 240
  } = $props<{
    data?: { label: string, value: number }[];
    size?: number;
  }>();
</script>

<BaseRadarChart
  title="Growth Analytics Radar"
  {data}
  {size}
  accentColor="#8b5cf6"
  fillColor="rgba(139, 92, 246, 0.25)"
  ariaLabel="Radar chart showing multi-dimensional developer growth metrics"
/>
