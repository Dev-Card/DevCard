<script lang="ts">
  import { 
    getRadarCoordinates, 
    generateRadarPoints, 
    getGridPolygon, 
    generateLabelCoordinates 
  } from '$lib/utils/chartMath';

  let {
    userData = [
      { label: 'Frontend', value: 90 },
      { label: 'Backend', value: 40 },
      { label: 'DevOps', value: 30 },
      { label: 'Database', value: 50 },
      { label: 'Design', value: 80 }
    ],
    matchData = [
      { label: 'Frontend', value: 40 },
      { label: 'Backend', value: 95 },
      { label: 'DevOps', value: 85 },
      { label: 'Database', value: 90 },
      { label: 'Design', value: 20 }
    ],
    size = 280
  } = $props<{
    userData?: { label: string, value: number }[];
    matchData?: { label: string, value: number }[];
    size?: number;
  }>();

  let center = $derived(size / 2);
  let radius = $derived(center * 0.65);
  let sides = $derived(userData.length);

  let userValues = $derived(userData.map(d => d.value));
  let matchValues = $derived(matchData.map(d => d.value));

  let userPolygon = $derived(generateRadarPoints(userValues, center, radius));
  let matchPolygon = $derived(generateRadarPoints(matchValues, center, radius));

  let gridLevels = [25, 50, 75, 100];
  let labels = $derived(generateLabelCoordinates(userData, center, radius, 125));
</script>

<div class="compatibility-radar glass">
  <div class="header">
    <h3>Skill Overlap Radar</h3>
    <div class="legend">
      <span class="legend-item"><span class="swatch user"></span> You</span>
      <span class="legend-item"><span class="swatch match"></span> Match</span>
    </div>
  </div>

  <div class="svg-wrapper">
    <svg width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="Radar chart showing skill compatibility between you and the matched developer">
      <!-- Grid -->
      {#each gridLevels as level}
        <polygon points={getGridPolygon(level, sides, center, radius)} class="grid-polygon" />
      {/each}

      <!-- Axes -->
      {#each userData as _, i}
        {@const { x, y } = getRadarCoordinates(100, i, sides, center, radius)}
        <line x1={center} y1={center} x2={x} y2={y} class="axis-line" />
      {/each}

      <!-- Match Polygon -->
      <polygon points={matchPolygon} class="match-polygon" />
      
      <!-- User Polygon -->
      <polygon points={userPolygon} class="user-polygon" />

      <!-- Interactive Points -->
      {#each matchData as d, i}
        {@const { x, y } = getRadarCoordinates(d.value, i, sides, center, radius)}
        <circle cx={x} cy={y} r="4" class="match-point" role="button" tabindex="0">
          <title>Match {d.label}: {d.value}%</title>
        </circle>
      {/each}

      {#each userData as d, i}
        {@const { x, y } = getRadarCoordinates(d.value, i, sides, center, radius)}
        <circle cx={x} cy={y} r="4" class="user-point" role="button" tabindex="0">
          <title>Your {d.label}: {d.value}%</title>
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
  .compatibility-radar {
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
    gap: 0.5rem;
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

  .swatch.user { background: rgba(99, 102, 241, 0.8); }
  .swatch.match { background: rgba(34, 197, 94, 0.8); }

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

  .user-polygon {
    fill: rgba(99, 102, 241, 0.25);
    stroke: var(--primary);
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .match-polygon {
    fill: rgba(34, 197, 94, 0.25);
    stroke: #22c55e;
    stroke-width: 2;
    stroke-linejoin: round;
  }

  .user-point {
    fill: var(--bg-primary);
    stroke: var(--primary);
    stroke-width: 2;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .match-point {
    fill: var(--bg-primary);
    stroke: #22c55e;
    stroke-width: 2;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .user-point:hover, .user-point:focus-visible,
  .match-point:hover, .match-point:focus-visible {
    transform: scale(1.5);
    outline: none;
  }

  .radar-label {
    fill: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>
