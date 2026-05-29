<script lang="ts">
  import BaseForecastChart from './BaseForecastChart.svelte';

  let {
    historicalData = [30, 45, 40, 60, 75, 70],
    predictedData = [70, 85, 95, 110, 105, 120],
    labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    title = '30-Day Contribution Forecast'
  } = $props<{
    historicalData?: number[];
    predictedData?: number[];
    labels?: string[];
    title?: string;
  }>();
</script>

<BaseForecastChart
  {title}
  {historicalData}
  {predictedData}
  {labels}
  accentColor1="var(--primary)"
  accentColor2="#8b5cf6"
  fillColor1="rgba(99, 102, 241, 0.1)"
  fillColor2="rgba(139, 92, 246, 0.1)"
  unit="contributions"
  ariaLabel="Line chart showing historical and predicted contribution trends over 6 weeks"
/>
