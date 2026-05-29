<script lang="ts">
  import { onMount } from 'svelte';

  // Generate some dummy data for the heatmap
  // 52 weeks * 7 days
  const weeks = 52;
  const daysPerWeek = 7;
  
  let heatmapData = $state<{ intensity: number, date: Date }[][]>([]);
  
  onMount(() => {
    const today = new Date();
    const generatedData = [];
    for (let w = 0; w < weeks; w++) {
      let weekData = [];
      for (let d = 0; d < daysPerWeek; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - ((weeks - 1 - w) * 7 + (6 - d)));
        const random = Math.random();
        let intensity = 0;
        if (random > 0.85) intensity = 4;
        else if (random > 0.7) intensity = 3;
        else if (random > 0.5) intensity = 2;
        else if (random > 0.3) intensity = 1;
        
        weekData.push({ intensity, date });
      }
      generatedData.push(weekData);
    }
    heatmapData = generatedData;
  });

  function getIntensityColor(intensity: number): string {
    switch(intensity) {
      case 1: return 'var(--color-level-1)';
      case 2: return 'var(--color-level-2)';
      case 3: return 'var(--color-level-3)';
      case 4: return 'var(--color-level-4)';
      default: return 'var(--color-level-0)';
    }
  }

  function handleKeydown(event: KeyboardEvent, day: { intensity: number, date: Date }) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      alert(`${day.date.toDateString()}: ${day.intensity * 3} contributions`);
    }
  }
</script>

<div class="heatmap-container glass">
  <div class="heatmap-header">
    <h3>Realtime Contributor Activity</h3>
    <span class="pulse-indicator">
      <span class="pulse-dot"></span> Live
    </span>
  </div>
  
  <div class="heatmap-scroll-wrapper">
    <div class="heatmap-grid">
      {#each heatmapData as week, wIndex}
        <div class="week">
          {#each week as day, dIndex}
            <div 
              class="day" 
              role="button"
              aria-label="Contribution activity on {day.date.toDateString()}"
              tabindex="0"
              style="background-color: {getIntensityColor(day.intensity)};"
              title="{day.date.toDateString()}: {day.intensity * 3} contributions"
              onkeydown={(e) => handleKeydown(e, day)}
            ></div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
  
  <div class="heatmap-legend">
    <span class="legend-text">Less</span>
    <div class="day" role="button" aria-label="Contribution activity" style="background-color: var(--color-level-0);"></div>
    <div class="day" role="button" aria-label="Contribution activity" style="background-color: var(--color-level-1);"></div>
    <div class="day" role="button" aria-label="Contribution activity" style="background-color: var(--color-level-2);"></div>
    <div class="day" role="button" aria-label="Contribution activity" style="background-color: var(--color-level-3);"></div>
    <div class="day" role="button" aria-label="Contribution activity" style="background-color: var(--color-level-4);"></div>
    <span class="legend-text">More</span>
  </div>
</div>

<style>
  .heatmap-container {
    --color-level-0: rgba(100, 116, 139, 0.1);
    --color-level-1: rgba(99, 102, 241, 0.4);
    --color-level-2: rgba(99, 102, 241, 0.6);
    --color-level-3: rgba(99, 102, 241, 0.8);
    --color-level-4: var(--primary);
    
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .heatmap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .heatmap-header h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
  }

  .pulse-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background-color: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  .heatmap-scroll-wrapper {
    overflow-x: auto;
    padding-bottom: 0.5rem;
  }

  /* Custom scrollbar for heatmap */
  .heatmap-scroll-wrapper::-webkit-scrollbar {
    height: 6px;
  }
  .heatmap-scroll-wrapper::-webkit-scrollbar-track {
    background: var(--bg-secondary);
    border-radius: 999px;
  }
  .heatmap-scroll-wrapper::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 999px;
  }

  .heatmap-grid {
    display: flex;
    gap: 4px;
    min-width: max-content;
  }

  .week {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .day {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
  }

  .day:hover {
    transform: scale(1.2);
    box-shadow: 0 0 8px var(--primary-glow);
    z-index: 10;
  }

  .heatmap-legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    align-self: flex-end;
    font-size: 0.75rem;
    color: var(--text-muted);
  }
  
  .legend-text {
    margin: 0 0.25rem;
  }
</style>
