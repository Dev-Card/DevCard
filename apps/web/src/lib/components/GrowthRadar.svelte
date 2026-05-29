<script lang="ts">
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

  // Radar chart math identical to ContributionRadar but heavily optimized
  let center = $derived(size / 2);
  let radius = $derived(center * 0.65); // Give labels a bit more breathing room
  let sides = $derived(data.length);
  let angle = $derived((Math.PI * 2) / sides);

  function getCoordinates(value: number, index: number) {
    const r = (value / 100) * radius;
    const theta = index * angle - Math.PI / 2;
    return {
      x: center + r * Math.cos(theta),
      y: center + r * Math.sin(theta)
    };
  }

  let dataPoints = $derived(
    data.map((d, i) => `${getCoordinates(d.value, i).x},${getCoordinates(d.value, i).y}`).join(' ')
  );

  let gridLevels = [25, 50, 75, 100];
  
  function getGridPolygon(level: number) {
    return Array.from({ length: sides }).map((_, i) => {
      const { x, y } = getCoordinates(level, i);
      return `${x},${y}`;
    }).join(' ');
  }
</script>

<div class="radar-container glass">
  <h3>Growth Analytics Radar</h3>
  
  <div class="svg-wrapper">
    <svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="Radar chart showing multi-dimensional growth metrics">
      <!-- Grid polygons -->
      {#each gridLevels as level}
        <polygon points={getGridPolygon(level)} class="grid-polygon" />
      {/each}

      <!-- Axes lines -->
      {#each data as _, i}
        {@const { x, y } = getCoordinates(100, i)}
        <line x1={center} y1={center} x2={x} y2={y} class="axis-line" />
      {/each}

      <!-- Data Polygon -->
      <polygon points={dataPoints} class="data-polygon" />

      <!-- Data Points -->
      {#each data as d, i}
        {@const { x, y } = getCoordinates(d.value, i)}
        <circle cx={x} cy={y} r="5" class="data-point" role="button" tabindex="0">
          <title>{d.label}: {d.value}%</title>
        </circle>
      {/each}

      <!-- Labels -->
      {#each data as d, i}
        {@const { x, y } = getCoordinates(125, i)}
        <text 
          x={x} y={y} 
          class="radar-label"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {d.label}
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
    align-items: center;
    gap: 1rem;
    height: 100%;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
    align-self: flex-start;
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
    stroke-dasharray: 4;
  }

  .data-polygon {
    fill: rgba(139, 92, 246, 0.25);
    stroke: #8b5cf6;
    stroke-width: 2;
    stroke-linejoin: round;
    transition: all 0.3s ease;
  }

  .data-polygon:hover {
    fill: rgba(139, 92, 246, 0.4);
  }

  .data-point {
    fill: var(--bg-primary);
    stroke: #8b5cf6;
    stroke-width: 2;
    cursor: pointer;
    transition: transform 0.2s ease, stroke-width 0.2s ease;
  }

  .data-point:hover, .data-point:focus-visible {
    transform: scale(1.5);
    stroke-width: 3;
    outline: none;
  }

  .radar-label {
    fill: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
</style>
