<script lang="ts">
  import { 
    getRadarCoordinates, 
    generateRadarPoints, 
    getGridPolygon, 
    generateLabelCoordinates 
  } from '$lib/utils/chartMath';

  let {
    title = 'Radar Chart',
    data = [],
    compareData = [], // Optional second series for comparison
    size = 240,
    gridLevels = [20, 40, 60, 80, 100],
    accentColor = 'var(--primary)',
    fillColor = 'rgba(99, 102, 241, 0.3)',
    compareAccentColor = '#22c55e',
    compareFillColor = 'rgba(34, 197, 94, 0.25)',
    ariaLabel = '',
    showLegend = false,
    legendLabel1 = 'You',
    legendLabel2 = 'Match'
  } = $props<{
    title?: string;
    data: { label: string, value: number }[];
    compareData?: { label: string, value: number }[];
    size?: number;
    gridLevels?: number[];
    accentColor?: string;
    fillColor?: string;
    compareAccentColor?: string;
    compareFillColor?: string;
    ariaLabel?: string;
    showLegend?: boolean;
    legendLabel1?: string;
    legendLabel2?: string;
  }>();

  let center = $derived(size / 2);
  let radius = $derived(center * 0.7); // Leave room for labels
  let sides = $derived(data.length);

  let dataValues = $derived(data.map((d: { value: number }) => d.value));
  let dataPoints = $derived(generateRadarPoints(dataValues, center, radius));
  
  let compareValues = $derived(compareData.map((d: { value: number }) => d.value));
  let comparePoints = $derived(compareData.length > 0 ? generateRadarPoints(compareValues, center, radius) : '');
  
  let labels = $derived(generateLabelCoordinates(data, center, radius, 120));

  function handleKeydown(event: KeyboardEvent, item: { label: string, value: number }, isCompare: boolean = false) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      alert(`${isCompare ? legendLabel2 : legendLabel1} ${item.label}: ${item.value}%`);
    }
  }
</script>

<div class="radar-container glass">
  <div class="header">
    <h3>{title}</h3>
    {#if showLegend || compareData.length > 0}
      <div class="legend">
        <span class="legend-item">
          <span class="swatch" style="background-color: {accentColor};"></span> 
          {legendLabel1}
        </span>
        {#if compareData.length > 0}
          <span class="legend-item">
            <span class="swatch" style="background-color: {compareAccentColor};"></span> 
            {legendLabel2}
          </span>
        {/if}
      </div>
    {/if}
  </div>
  
  <div class="svg-wrapper">
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 {size} {size}"
      aria-label={ariaLabel || `${title} chart`}
      role="img"
    >
      <!-- Grid polygons -->
      {#each gridLevels as level}
        <polygon 
          points={getGridPolygon(level, sides, center, radius)} 
          class="grid-polygon" 
        />
      {/each}

      <!-- Axes lines -->
      {#each data as _, i}
        {@const { x, y } = getRadarCoordinates(100, i, sides, center, radius)}
        <line 
          x1={center} y1={center} 
          x2={x} y2={y} 
          class="axis-line" 
        />
      {/each}

      <!-- Compare Data Polygon -->
      {#if comparePoints}
        <polygon 
          points={comparePoints} 
          class="data-polygon" 
          style="fill: {compareFillColor}; stroke: {compareAccentColor};"
        />
      {/if}

      <!-- Data Polygon -->
      <polygon 
        points={dataPoints} 
        class="data-polygon" 
        style="fill: {fillColor}; stroke: {accentColor};"
      />

      <!-- Compare Data Points -->
      {#if compareData.length > 0}
        {#each compareData as d, i}
          {@const { x, y } = getRadarCoordinates(d.value, i, sides, center, radius)}
          <circle 
            cx={x} cy={y} r="4" 
            class="data-point" 
            style="stroke: {compareAccentColor};"
            role="button"
            aria-label="{legendLabel2} {d.label}: {d.value}%"
            tabindex="0"
            onkeydown={(e) => handleKeydown(e, d, true)}
          >
            <title>{legendLabel2} {d.label}: {d.value}%</title>
          </circle>
        {/each}
      {/if}

      <!-- Data Points -->
      {#each data as d, i}
        {@const { x, y } = getRadarCoordinates(d.value, i, sides, center, radius)}
        <circle 
          cx={x} cy={y} r="4" 
          class="data-point" 
          style="stroke: {accentColor};"
          role="button"
          aria-label="{legendLabel1} {d.label}: {d.value}%"
          tabindex="0"
          onkeydown={(e) => handleKeydown(e, d, false)}
        >
          <title>{legendLabel1} {d.label}: {d.value}%</title>
        </circle>
      {/each}

      <!-- Labels -->
      {#each labels as label}
        <text 
          x={label.x} y={label.y} 
          class="radar-label"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {label.text}
        </text>
      {/each}
    </svg>
  </div>
</div>

<style>
  .radar-container {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
    width: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: flex-start;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .legend {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.72rem;
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

  .svg-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .grid-polygon {
    fill: rgba(255, 255, 255, 0.02);
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 1;
  }

  .axis-line {
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 1;
  }

  .data-polygon {
    stroke-width: 2.5;
    stroke-linejoin: round;
    transition: all 0.3s ease;
  }

  .data-polygon:hover {
    filter: brightness(1.1);
  }

  .data-point {
    fill: var(--bg-primary);
    stroke-width: 2.5;
    cursor: pointer;
    transition: transform 0.2s ease, stroke-width 0.2s ease;
  }

  .data-point:hover, .data-point:focus-visible {
    transform: scale(1.5);
    stroke-width: 3.5;
    outline: none;
  }

  .radar-label {
    fill: var(--text-secondary);
    font-size: 0.72rem;
    font-weight: 600;
  }
</style>
