<script lang="ts">
  import BaseForecastChart from './BaseForecastChart.svelte';

  let {
    historicalData = [10, 15, 25, 45, 80, 120, 180],
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    title = 'Connection Velocity'
  } = $props<{
    historicalData?: number[];
    labels?: string[];
    title?: string;
  }>();
</script>

<BaseForecastChart
  {title}
  {historicalData}
  {labels}
  accentColor1="#38bdf8"
  fillColor1="rgba(56, 189, 248, 0.15)"
  unit="connections"
  ariaLabel="Line chart showing networking connection velocity over the week"
/>
