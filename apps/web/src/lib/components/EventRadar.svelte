<script lang="ts">
  import { 
    getRadarCoordinates, 
    generateRadarPoints, 
    getGridPolygon, 
    generateLabelCoordinates 
  } from '$lib/utils/chartMath';

  let {
    data = [
      { label: 'Web3', value: 85 },
      { label: 'AI', value: 95 },
      { label: 'Open Source', value: 100 },
      { label: 'Networking', value: 70 },
      { label: 'Cloud', value: 60 }
    ],
    size = 280
  } = $props<{
    data?: { label: string, value: number }[];
    size?: number;
  }>();

  let center = $derived(size / 2);
  let radius = $derived(center * 0.65);
  let sides = $derived(data.length);

  let dataValues = $derived(data.map(d => d.value));
  let dataPolygon = $derived(generateRadarPoints(dataValues, center, radius));

  let gridLevels = [25, 50, 75, 100];
  let labels = $derived(generateLabelCoordinates(data, center, radius, 125));
</script>

<div class="event-radar glass">
  <div class="header">
    <h3>Event Dominance</h3>
  </div>

  <div class="svg-wrapper">
    <svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="Radar chart showing dominance across event categories">
      <!-- Grid -->
      {#each gridLevels as level}
        <polygon points={getGridPolygon(level, sides, center, radius)} class="grid-polygon" />
      {/each}

      <!-- Axes -->
      {#each data as _, i}
        {@const { x, y } = getRadarCoordinates(100, i, sides, center, radius)}
        <line x1={center} y1={center} x2={x} y2={y} class="axis-line" />
      {/each}
      
      <!-- Data Polygon -->
      <polygon points={dataPolygon} class="data-polygon" />

      <!-- Interactive Points -->
      {#each data as d, i}
        {@const { x, y } = getRadarCoordinates(d.value, i, sides, center, radius)}
        <circle cx={x} cy={y} r="4" class="data-point" role="button" tabindex="0">
          <title>{d.label}: {d.value}%</title>
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
  .event-radar {
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

  .svg-wrapper {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .grid-polygon {
    fill: rgba(255, 255, 255, 0.02);
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 1;
  }

  .axis-line {
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 1;
    stroke-dasharray: 3;
  }

  .data-polygon {
    fill: rgba(236, 72, 153, 0.2);
    stroke: #ec4899;
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .data-point {
    fill: var(--bg-primary);
    stroke: #ec4899;
    stroke-width: 2;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .data-point:hover, .data-point:focus-visible {
    transform: scale(1.5);
    outline: none;
  }

  .radar-label {
    fill: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>
