<script lang="ts">
  let {
    events = [
      { id: 1, name: 'Svelte Summit 2026', type: 'Conference', date: 'Next Week', matchScore: 98 },
      { id: 2, name: 'Open Source Hackathon', type: 'Hackathon', date: 'In 2 days', matchScore: 94 },
      { id: 3, name: 'Local Dev Meetup', type: 'Networking', date: 'Tomorrow', matchScore: 85 }
    ]
  } = $props<{
    events?: { id: number, name: string, type: string, date: string, matchScore: number }[];
  }>();
</script>

<div class="recommendations-panel glass">
  <div class="header">
    <h3>Recommended Events</h3>
    <button class="btn-icon" aria-label="Refresh recommendations">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>
    </button>
  </div>

  <div class="event-list">
    {#each events as event (event.id)}
      <div class="event-card">
        <div class="event-info">
          <h4>{event.name}</h4>
          <div class="meta">
            <span class="type">{event.type}</span>
            <span class="dot">•</span>
            <span class="date">{event.date}</span>
          </div>
        </div>
        <div class="match-score">
          <svg class="flame-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2c0 0-4 4-4 9a4 4 0 0 0 8 0c0-5-4-9-4-9z" />
          </svg>
          {event.matchScore}% Match
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .recommendations-panel {
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

  .btn-icon {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-icon:hover {
    color: var(--text-primary);
  }

  .event-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    overflow-y: auto;
  }

  .event-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    transition: transform 0.2s ease, border-color 0.2s;
    cursor: pointer;
  }

  .event-card:hover {
    transform: translateY(-2px);
    border-color: rgba(34, 197, 94, 0.3);
  }

  .event-info h4 {
    margin: 0 0 0.25rem 0;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .type {
    color: var(--primary);
  }

  .dot {
    color: var(--text-muted);
  }

  .match-score {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.875rem;
    font-weight: 700;
    color: #22c55e;
    background: rgba(34, 197, 94, 0.15);
    padding: 0.35rem 0.6rem;
    border-radius: 6px;
  }

  .flame-icon {
    width: 14px;
    height: 14px;
    fill: #22c55e;
  }
</style>
