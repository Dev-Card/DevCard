<script lang="ts">
  let {
    data = [
      { label: 'Frontend', value: 85 },
      { label: 'Backend', value: 60 },
      { label: 'DevOps', value: 40 },
      { label: 'Community', value: 75 },
      { label: 'Architecture', value: 50 }
    ],
    size = 240
  } = $props<{
    data?: { label: string, value: number }[];
    size?: number;
  }>();

  // Radar chart logic
  let center = $derived(size / 2);
  let radius = $derived(center * 0.7); // Leave room for labels
  let sides = $derived(data.length);
  let angle = $derived((Math.PI * 2) / sides);

  // Calculate coordinates for a given value (0-100) at a specific index
  function getCoordinates(value: number, index: number) {
    const r = (value / 100) * radius;
    // -Math.PI/2 to start at the top
    const theta = index * angle - Math.PI / 2;
    return {
      x: center + r * Math.cos(theta),
      y: center + r * Math.sin(theta)
    };
  }

  // Generate the polygon points string for the data
  let dataPoints = $derived(
    data.map((d, i) => {
      const { x, y } = getCoordinates(d.value, i);
      return `${x},${y}`;
    }).join(' ')
  );

  // Generate grid levels (20, 40, 60, 80, 100)
  let gridLevels = [20, 40, 60, 80, 100];
  
  function getGridPolygon(level: number) {
    let points = [];
    for (let i = 0; i < sides; i++) {
      const { x, y } = getCoordinates(level, i);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }

  // Generate label coordinates
  let labels = $derived(
    data.map((d, i) => {
      // Push labels out slightly further than 100%
      const { x, y } = getCoordinates(120, i);
      return { x, y, text: d.label };
    })
  );
</script>

<div class="radar-container glass">
  <h3>Contribution Radar</h3>
  
  <div class="svg-wrapper">
    <svg width={size} height={size} viewBox="0 0 {size} {size}">
      <!-- Grid polygons -->
      {#each gridLevels as level}
        <polygon 
          points={getGridPolygon(level)} 
          class="grid-polygon" 
        />
      {/each}

      <!-- Axes lines -->
      {#each data as _, i}
        {@const { x, y } = getCoordinates(100, i)}
        <line 
          x1={center} y1={center} 
          x2={x} y2={y} 
          class="axis-line" 
        />
      {/each}

      <!-- Data Polygon -->
      <polygon 
        points={dataPoints} 
        class="data-polygon" 
      />

      <!-- Data Points -->
      {#each data as d, i}
        {@const { x, y } = getCoordinates(d.value, i)}
        <circle 
          cx={x} cy={y} r="4" 
          class="data-point" 
          role="button"
          aria-label="{d.label}: {d.value}%"
          tabindex="0"
        >
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
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 1;
  }

  .axis-line {
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 1;
  }

  .data-polygon {
    fill: rgba(99, 102, 241, 0.3);
    stroke: var(--primary);
    stroke-width: 2;
    stroke-linejoin: round;
    transition: all 0.3s ease;
  }

  .data-polygon:hover {
    fill: rgba(99, 102, 241, 0.45);
  }

  .data-point {
    fill: var(--bg-primary);
    stroke: var(--primary);
    stroke-width: 2;
    cursor: pointer;
    transition: transform 0.2s ease, stroke-width 0.2s ease;
  }

  .data-point:hover, .data-point:focus-visible {
    transform: scale(1.5);
    stroke-width: 3;
    outline: none;
  }

  .data-point:focus-visible {
    stroke: #818cf8;
  }

  .radar-label {
    fill: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
  }
</style>
