<script lang="ts">
  // Creates a grid representing hourly engagement over an event (e.g., 2 days, 12 hours each)
  let {
    hoursPerDay = 12,
    days = 2,
    data = [] // Array of intensity 0-4
  } = $props<{
    hoursPerDay?: number;
    days?: number;
    data?: number[];
  }>();

  // Generate mock data if none provided
  let heatmapData = $derived(
    data.length ? data : Array.from({ length: hoursPerDay * days }, () => Math.floor(Math.random() * 5))
  );

  function getColorClass(intensity: number) {
    if (intensity === 0) return 'empty';
    if (intensity === 1) return 'low';
    if (intensity === 2) return 'medium';
    if (intensity === 3) return 'high';
    return 'peak';
  }
</script>

<div class="event-heatmap glass">
  <div class="header">
    <h3>Event Interaction Heatmap</h3>
  </div>

  <div class="heatmap-grid" style="--cols: {hoursPerDay}">
    {#each heatmapData as intensity, i}
      <div 
        class="heat-cell {getColorClass(intensity)}"
        role="button"
        tabindex="0"
        title="Hour {i % hoursPerDay + 1}, Day {Math.floor(i / hoursPerDay) + 1}: Intensity {intensity}"
        aria-label="Event interaction intensity {intensity}"
      ></div>
    {/each}
  </div>

  <div class="legend">
    <span class="legend-label">Quiet</span>
    <div class="legend-cells">
      <div class="heat-cell empty"></div>
      <div class="heat-cell low"></div>
      <div class="heat-cell medium"></div>
      <div class="heat-cell high"></div>
      <div class="heat-cell peak"></div>
    </div>
    <span class="legend-label">Peak</span>
  </div>
</div>

<style>
  .event-heatmap {
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

  .heatmap-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 6px;
    flex: 1;
  }

  .heat-cell {
    aspect-ratio: 1;
    border-radius: 4px;
    transition: transform 0.1s ease, border-color 0.1s ease;
    border: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
  }

  .heat-cell:hover, .heat-cell:focus-visible {
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.5);
    outline: none;
    z-index: 10;
  }

  .heat-cell.empty { background-color: rgba(255, 255, 255, 0.05); }
  .heat-cell.low { background-color: rgba(236, 72, 153, 0.25); } /* Pink scale for events */
  .heat-cell.medium { background-color: rgba(236, 72, 153, 0.5); }
  .heat-cell.high { background-color: rgba(236, 72, 153, 0.75); }
  .heat-cell.peak { background-color: rgba(236, 72, 153, 1); box-shadow: 0 0 8px rgba(236, 72, 153, 0.5); }

  .legend {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    align-self: flex-end;
  }

  .legend-cells {
    display: flex;
    gap: 4px;
  }

  .legend-cells .heat-cell {
    width: 12px;
    height: 12px;
    cursor: default;
  }
  .legend-cells .heat-cell:hover {
    transform: none;
    border-color: rgba(255, 255, 255, 0.05);
  }
</style>
