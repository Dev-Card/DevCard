<script lang="ts">
  import { getPathData, getAreaPathData, generatePointCoordinates, calculateYAxisGrid } from '$lib/utils/visualizationEngine';
  import { formatMetric } from '$lib/utils/analyticsHelpers';

  let {
    title = 'Chart',
    historicalData = [],
    predictedData = [],
    labels = [],
    maxVal = 0,
    accentColor1 = 'var(--primary)',
    accentColor2 = '#8b5cf6',
    fillColor1 = 'rgba(99, 102, 241, 0.1)',
    fillColor2 = 'rgba(139, 92, 246, 0.1)',
    unit = '',
    formatType = 'number',
    ariaLabel = ''
  } = $props<{
    title?: string;
    historicalData: number[];
    predictedData?: number[];
    labels?: string[];
    maxVal?: number;
    accentColor1?: string;
    accentColor2?: string;
    fillColor1?: string;
    fillColor2?: string;
    unit?: string;
    formatType?: 'currency' | 'number' | 'percent' | 'compact';
    ariaLabel?: string;
  }>();

  // Dynamically compute max value if not provided
  let computedMax = $derived(
    maxVal > 0 
      ? maxVal 
      : Math.max(...historicalData, ...(predictedData || []), 1) * 1.15
  );

  let gridLines = $derived(calculateYAxisGrid(historicalData.concat(predictedData || []), 4));
  let maxValue = $derived(gridLines[gridLines.length - 1]);

  let predictedCombined = $derived(
    predictedData && predictedData.length > 0
      ? [historicalData[historicalData.length - 1], ...predictedData.slice(1)]
      : []
  );

  function handleKeydown(event: KeyboardEvent, val: number, label: string, isPredicted: boolean = false) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      alert(`${label}${isPredicted ? ' (Predicted)' : ''}: ${formatValue(val)}`);
    }
  }

  function formatValue(val: number) {
    const formatted = formatMetric(val, formatType);
    return unit ? `${formatted} ${unit}` : formatted;
  }
</script>

<div class="forecast-chart glass">
  <div class="header">
    <h3>{title}</h3>
    {#if predictedData && predictedData.length > 0}
      <div class="legend">
        <span class="legend-item">
          <span class="swatch" style="background-color: {accentColor1};"></span> 
          Historical
        </span>
        <span class="legend-item">
          <span class="swatch predicted" style="border: 2px dashed {accentColor2};"></span> 
          Predicted
        </span>
      </div>
    {/if}
  </div>

  <div class="chart-container" role="img" aria-label={ariaLabel || `${title} chart`}>
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" class="chart-svg">
      <!-- Grid lines -->
      {#each [50, 100, 150, 200] as yVal}
        <line x1="0" y1={yVal} x2="400" y2={yVal} class="grid-line" />
      {/each}

      <!-- Historical Data Area and Line -->
      <path 
        d={getAreaPathData(historicalData, maxValue, 400, 200)} 
        fill={fillColor1} 
      />
      <path 
        d={getPathData(historicalData, maxValue, 400, 200)} 
        class="line-historical" 
        style="stroke: {accentColor1};"
      />

      <!-- Predicted Data Area and Line -->
      {#if predictedCombined.length > 0}
        <path 
          d={getAreaPathData(predictedCombined, maxValue, 400, 200)} 
          fill={fillColor2} 
        />
        <path 
          d={getPathData(predictedCombined, maxValue, 400, 200)} 
          class="line-predicted" 
          style="stroke: {accentColor2};"
        />
      {/if}
      
      <!-- Historical Points -->
      {#each generatePointCoordinates(historicalData, maxValue, 400, 200) as { cx, cy }, i}
        <circle 
          {cx} {cy} r="4" 
          class="point-historical" 
          style="stroke: {accentColor1};"
          role="button"
          tabindex="0"
          aria-label="{labels[i] || `Point ${i + 1}`}: {formatValue(historicalData[i])}"
          onkeydown={(e) => handleKeydown(e, historicalData[i], labels[i] || `Point ${i + 1}`)}
        >
          <title>{labels[i] || `Point ${i + 1}`}: {formatValue(historicalData[i])}</title>
        </circle>
      {/each}

      <!-- Predicted Points -->
      {#if predictedCombined.length > 0}
        {#each generatePointCoordinates(predictedCombined, maxValue, 400, 200).slice(1) as { cx, cy }, i}
          {@const val = predictedData[i + 1]}
          <circle 
            {cx} {cy} r="4" 
            class="point-predicted" 
            style="stroke: {accentColor2};"
            role="button"
            tabindex="0"
            aria-label="{labels[i + historicalData.length] || `Point ${i + 1}`}: {formatValue(val)} (Predicted)"
            onkeydown={(e) => handleKeydown(e, val, labels[i + historicalData.length] || `Point ${i + 1}`, true)}
          >
            <title>{labels[i + historicalData.length] || `Point ${i + 1}`} (Predicted): {formatValue(val)}</title>
          </circle>
        {/each}
      {/if}
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
    width: 100%;
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

  .swatch.predicted {
    background: transparent !important;
  }

  .chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 150px;
    width: 100%;
  }

  .chart-svg {
    width: 100%;
    height: 100%;
    flex: 1;
    overflow: visible;
  }

  .grid-line {
    stroke: rgba(255, 255, 255, 0.04);
    stroke-width: 1;
    stroke-dasharray: 4;
  }

  .line-historical {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .line-predicted {
    fill: none;
    stroke-width: 3;
    stroke-dasharray: 6 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    animation: dash 20s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: -100;
    }
  }

  .point-historical {
    fill: var(--bg-primary);
    stroke-width: 2.5;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .point-predicted {
    fill: var(--bg-primary);
    stroke-width: 2.5;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .point-historical:hover, .point-historical:focus-visible,
  .point-predicted:hover, .point-predicted:focus-visible {
    transform: scale(1.5);
    outline: none;
  }

  .x-axis {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 500;
  }
</style>
