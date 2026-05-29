<script lang="ts">
  let {
    historicalData = [10, 15, 25, 45, 80, 120, 180],
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    title = 'Connection Velocity'
  } = $props<{
    historicalData?: number[];
    labels?: string[];
    title?: string;
  }>();

  let maxVal = $derived(Math.max(...historicalData) * 1.2);
  
  function getPathData(data: number[], width: number, height: number): string {
    if (!data.length) return '';
    const stepX = width / (data.length - 1);
    
    return data.map((val, i) => {
      const x = i * stepX;
      const y = height - (val / maxVal) * height;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }

  function getAreaPathData(data: number[], width: number, height: number): string {
    if (!data.length) return '';
    const linePath = getPathData(data, width, height);
    return `${linePath} L ${width} ${height} L 0 ${height} Z`;
  }
</script>

<div class="forecast-chart glass">
  <div class="header">
    <h3>{title}</h3>
  </div>

  <div class="chart-container" role="img" aria-label="Line chart showing networking connection velocity over the week">
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" class="chart-svg">
      <!-- Grid lines -->
      <line x1="0" y1="50" x2="400" y2="50" class="grid-line" />
      <line x1="0" y1="100" x2="400" y2="100" class="grid-line" />
      <line x1="0" y1="150" x2="400" y2="150" class="grid-line" />
      <line x1="0" y1="200" x2="400" y2="200" class="grid-line" />

      <!-- Data Area and Line -->
      <path d={getAreaPathData(historicalData, 400, 200)} class="area-historical" />
      <path d={getPathData(historicalData, 400, 200)} class="line-historical" />
      
      <!-- Interactive Points -->
      {#each historicalData as val, i}
        <circle cx={(i / (historicalData.length - 1)) * 400} cy={200 - (val / maxVal) * 200} r="4" class="point-historical" role="button" tabindex="0">
          <title>{labels[i]}: {val} connections</title>
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

  .header h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .chart-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 150px;
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
    stroke: #38bdf8;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    /* Drawing animation */
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: draw 2s ease-out forwards;
  }

  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }

  .area-historical {
    fill: rgba(56, 189, 248, 0.15);
  }

  .point-historical {
    fill: var(--bg-primary);
    stroke: #38bdf8;
    stroke-width: 2;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .point-historical:hover, .point-historical:focus-visible {
    transform: scale(1.5);
    outline: none;
  }

  .x-axis {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    color: var(--text-muted);
    font-size: 0.75rem;
  }
</style>
