<script lang="ts">
  import BaseForecastChart from './BaseForecastChart.svelte';

  let {
    data = [
      { label: 'Jan', value: 200 },
      { label: 'Feb', value: 450 },
      { label: 'Mar', value: 450 },
      { label: 'Apr', value: 800 },
      { label: 'May', value: 1300 },
      { label: 'Jun', value: 2100 }
    ]
  } = $props<{
    data?: { label: string, value: number }[];
  }>();

  let values = $derived(data.map((d: { value: number }) => d.value));
  let labels = $derived(data.map((d: { label: string }) => d.label));
  let total = $derived(values[values.length - 1] || 0);
</script>

<div class="bounty-earnings glass">
  <div class="header">
    <h3>Cumulative Earnings</h3>
    <span class="total">${total.toLocaleString()}</span>
  </div>

  <div class="chart-wrapper">
    <BaseForecastChart
      title=""
      historicalData={values}
      {labels}
      accentColor1="#10b981"
      fillColor1="rgba(16, 185, 129, 0.1)"
      formatType="currency"
      ariaLabel="Line chart showing cumulative developer bounty earnings"
    />
  </div>
</div>

<style>
  .bounty-earnings {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .total {
    font-size: 1.25rem;
    font-weight: 800;
    color: #10b981;
  }

  .chart-wrapper {
    flex: 1;
    width: 100%;
  }

  :global(.bounty-earnings .forecast-chart) {
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
</style>
