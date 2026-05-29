<script lang="ts">
  import { getRadarCoordinates, generateLabelCoordinates } from '$lib/utils/chartMath';

  let {
    skills = [
      { name: 'React', current: 85, target: 90 },
      { name: 'TypeScript', current: 75, target: 85 },
      { name: 'Node.js', current: 60, target: 80 },
      { name: 'System Design', current: 40, target: 70 },
      { name: 'Testing', current: 55, target: 75 }
    ],
    size = 300
  } = $props<{
    skills?: { name: string, current: number, target: number }[];
    size?: number;
  }>();

  let center = $derived(size / 2);
  let radius = $derived(center * 0.65);
  let sides = $derived(skills.length);

  // Helper to generate polygon string
  function getPolygon(dataKey: 'current' | 'target') {
    return skills.map((s, i) => {
      const { x, y } = getRadarCoordinates(s[dataKey], i, sides, center, radius);
      return `${x},${y}`;
    }).join(' ');
  }

  let currentPolygon = $derived(getPolygon('current'));
  let targetPolygon = $derived(getPolygon('target'));
  
  let gridLevels = [25, 50, 75, 100];
  
  // Custom label generation
  let labels = $derived(skills.map((s, i) => {
    return getRadarCoordinates(125, i, sides, center, radius);
  }));
</script>

<div class="skill-gap-analyzer glass">
  <div class="header">
    <h3>Skill Gap Analysis</h3>
    <span class="role-badge">Target: Senior Full Stack</span>
  </div>

  <div class="radar-container">
    <svg width={size} height={size} viewBox="0 0 {size} {size}">
      <!-- Grid Circles -->
      {#each gridLevels as level}
        <circle cx={center} cy={center} r={(level / 100) * radius} class="grid-circle" />
      {/each}

      <!-- Axes -->
      {#each skills as _, i}
        {@const { x, y } = getRadarCoordinates(100, i, sides, center, radius)}
        <line x1={center} y1={center} x2={x} y2={y} class="axis-line" />
      {/each}

      <!-- Target Polygon -->
      <polygon points={targetPolygon} class="target-poly" />
      
      <!-- Current Polygon -->
      <polygon points={currentPolygon} class="current-poly" />

      <!-- Labels -->
      {#each skills as skill, i}
        <text 
          x={labels[i].x} 
          y={labels[i].y} 
          class="skill-label"
          text-anchor="middle"
          dominant-baseline="middle"
        >
          {skill.name}
        </text>
      {/each}
    </svg>
  </div>

  <div class="legend">
    <div class="legend-item">
      <div class="swatch current"></div>
      <span>Current Level</span>
    </div>
    <div class="legend-item">
      <div class="swatch target"></div>
      <span>Industry Standard</span>
    </div>
  </div>
</div>

<style>
  .skill-gap-analyzer {
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

  .role-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }

  .radar-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .grid-circle {
    fill: none;
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 1;
  }

  .axis-line {
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 1;
    stroke-dasharray: 4;
  }

  .target-poly {
    fill: rgba(139, 92, 246, 0.1);
    stroke: rgba(139, 92, 246, 0.5);
    stroke-width: 2;
    stroke-dasharray: 4;
  }

  .current-poly {
    fill: rgba(56, 189, 248, 0.2);
    stroke: #38bdf8;
    stroke-width: 2;
  }

  .skill-label {
    fill: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .legend {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .swatch.current { background: #38bdf8; }
  .swatch.target { background: rgba(139, 92, 246, 0.5); }
</style>
