<script lang="ts">
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

  import { getPathData, getAreaPathData, generatePointCoordinates } from '$lib/utils/visualizationEngine';

  let maxVal = $derived(Math.max(...historicalData, ...predictedData) * 1.1);
  let predictedCombined = $derived([historicalData[historicalData.length-1], ...predictedData.slice(1)]);
</script>

<div class="forecast-chart glass">
  <div class="header">
    <h3>{title}</h3>
    <div class="legend">
      <span class="legend-item"><span class="swatch historical"></span> Historical</span>
      <span class="legend-item"><span class="swatch predicted"></span> Predicted</span>
    </div>
  </div>

  <div class="chart-container" role="img" aria-label="Line chart showing historical and predicted contribution trends over 6 weeks">
    <!-- SVG viewBox size provides a normalized coordinate system -->
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" class="chart-svg">
      <!-- Grid lines -->
      <line x1="0" y1="50" x2="400" y2="50" class="grid-line" />
      <line x1="0" y1="100" x2="400" y2="100" class="grid-line" />
      <line x1="0" y1="150" x2="400" y2="150" class="grid-line" />
      <line x1="0" y1="200" x2="400" y2="200" class="grid-line" />

      <!-- Historical Data Area and Line -->
      <path d={getAreaPathData(historicalData, maxVal, 400, 200)} class="area-historical" />
      <path d={getPathData(historicalData, maxVal, 400, 200)} class="line-historical" />

      <!-- Predicted Data Area and Line -->
      <!-- We offset the start to connect with the end of historical data for visual flow -->
      <path d={getAreaPathData(predictedCombined, maxVal, 400, 200)} class="area-predicted" />
      <path d={getPathData(predictedCombined, maxVal, 400, 200)} class="line-predicted" />
      
      <!-- Interactive Points -->
      {#each generatePointCoordinates(historicalData, maxVal, 400, 200) as { cx, cy }, i}
        <circle {cx} {cy} r="4" class="point-historical">
          <title>{labels[i]}: {historicalData[i]} contributions</title>
        </circle>
      {/each}

      {#each generatePointCoordinates(predictedCombined, maxVal, 400, 200).slice(1) as { cx, cy }, i}
        <circle {cx} {cy} r="4" class="point-predicted">
          <title>{labels[i+1]} (Predicted): {predictedData[i+1]} contributions</title>
        </circle>
      {/each}
    </svg>

    <div class="x-axis">
      {#each labels as label}
        <span>{label}</span>
      {/each}
    </div>
  </div>
</div>

<style>
  .forecast-chart {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
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

  .legend {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }

  .swatch.historical { background: rgba(99, 102, 241, 0.8); }
  .swatch.predicted { background: rgba(139, 92, 246, 0.8); }

  .chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 200px;
  }

  .chart-svg {
    width: 100%;
    height: 100%;
    flex: 1;
    overflow: visible;
  }

  .grid-line {
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 1;
    stroke-dasharray: 4;
  }

  .line-historical {
    fill: none;
    stroke: var(--primary);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .area-historical {
    fill: rgba(99, 102, 241, 0.1);
  }

  .line-predicted {
    fill: none;
    stroke: #8b5cf6;
    stroke-width: 3;
    stroke-dasharray: 6 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: dash 20s linear infinite;
  }

  .area-predicted {
    fill: rgba(139, 92, 246, 0.1);
  }

  @keyframes dash {
    to {
      stroke-dashoffset: -100;
    }
  }

  .point-historical {
    fill: var(--bg-primary);
    stroke: var(--primary);
    stroke-width: 2;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .point-predicted {
    fill: var(--bg-primary);
    stroke: #8b5cf6;
    stroke-width: 2;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .point-historical:hover, .point-predicted:hover {
    transform: scale(1.5);
  }

  .x-axis {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 0.75rem;
  }
</style>
