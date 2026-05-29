<script lang="ts">
  import { getPathData, getAreaPathData, calculateYAxisGrid } from '$lib/utils/visualizationEngine';

  let {
    data = [
      { label: 'Jan', value: 200 },
      { label: 'Feb', value: 450 },
      { label: 'Mar', value: 450 },
      { label: 'Apr', value: 800 },
      { label: 'May', value: 1300 },
      { label: 'Jun', value: 2100 }
    ],
    width = 400,
    height = 200
  } = $props<{
    data?: { label: string, value: number }[];
    width?: number;
    height?: number;
  }>();

  let padding = { top: 20, right: 20, bottom: 30, left: 40 };
  let chartWidth = $derived(width - padding.left - padding.right);
  let chartHeight = $derived(height - padding.top - padding.bottom);

  let values = $derived(data.map(d => d.value));
  let gridLines = $derived(calculateYAxisGrid(values, 4));
  let maxValue = $derived(gridLines[gridLines.length - 1]);

  let points = $derived(data.map((d, i) => ({
    x: padding.left + (i * (chartWidth / (data.length - 1))),
    y: padding.top + chartHeight - ((d.value / maxValue) * chartHeight)
  })));

  let linePath = $derived(getPathData(values, maxValue, chartWidth, chartHeight));
  let areaPath = $derived(getAreaPathData(values, maxValue, chartWidth, chartHeight));
</script>

<div class="bounty-earnings glass">
  <div class="header">
    <h3>Cumulative Earnings</h3>
    <span class="total">${values[values.length - 1].toLocaleString()}</span>
  </div>

  <div class="chart-container">
    <svg {width} {height} viewBox="0 0 {width} {height}">
      <defs>
        <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(16, 185, 129, 0.4)" />
          <stop offset="100%" stop-color="rgba(16, 185, 129, 0.0)" />
        </linearGradient>
      </defs>

      <!-- Y-Axis Grid & Labels -->
      {#each gridLines as line}
        {@const y = padding.top + chartHeight - ((line / maxValue) * chartHeight)}
        <line 
          x1={padding.left} y1={y} 
          x2={width - padding.right} y2={y} 
          class="grid-line" 
        />
        <text x={padding.left - 10} y={y + 4} class="axis-label" text-anchor="end">
          ${line >= 1000 ? (line/1000) + 'k' : line}
        </text>
      {/each}

      <!-- X-Axis Labels -->
      {#each points as point, i}
        <text 
          x={point.x} y={height - 5} 
          class="axis-label" 
          text-anchor="middle"
        >
          {data[i].label}
        </text>
      {/each}

      <g transform={`translate(${padding.left}, ${padding.top})`}>
        <!-- Data Paths -->
        <path d={areaPath} fill="url(#earningsGradient)" />
        <path d={linePath} class="line-path" />
      </g>

      <!-- Data Points -->
      {#each points as point, i}
        <circle 
          cx={point.x} cy={point.y} 
          r="4" 
          class="data-point" 
        >
          <title>{data[i].label}: ${data[i].value}</title>
        </circle>
      {/each}
    </svg>
  </div>
</div>

<style>
  .bounty-earnings {
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

  .total {
    font-size: 1.25rem;
    font-weight: 800;
    color: #10b981;
  }

  .chart-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .grid-line {
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 1;
  }

  .axis-label {
    fill: var(--text-muted);
    font-size: 0.7rem;
    font-family: inherit;
  }

  .line-path {
    fill: none;
    stroke: #10b981;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .data-point {
    fill: var(--bg-primary);
    stroke: #10b981;
    stroke-width: 2;
    transition: transform 0.2s, r 0.2s;
  }

  .data-point:hover {
    r: 6;
    fill: #10b981;
    cursor: pointer;
  }
</style>
