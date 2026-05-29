<script lang="ts">
  let {
    events = [
      { id: 1, title: 'Open Source Hackathon', date: 'Oct 15, 2026', status: 'upcoming', type: 'hackathon' },
      { id: 2, title: 'Svelte Summit', date: 'Sep 22, 2026', status: 'past', type: 'conference' },
      { id: 3, title: 'Local Dev Meetup', date: 'Aug 10, 2026', status: 'past', type: 'meetup' }
    ]
  } = $props<{
    events?: { id: number, title: string, date: string, status: 'upcoming' | 'past', type: string }[];
  }>();
</script>

<div class="event-timeline glass">
  <div class="header">
    <h3>Event Timeline</h3>
  </div>

  <div class="timeline-container">
    {#each events as event, i}
      <div class="timeline-item {event.status}">
        <div class="timeline-marker">
          <div class="marker-dot"></div>
          {#if i < events.length - 1}
            <div class="marker-line"></div>
          {/if}
        </div>
        <div class="timeline-content">
          <div class="event-meta">
            <span class="date">{event.date}</span>
            <span class="badge {event.type}">{event.type}</span>
          </div>
          <h4>{event.title}</h4>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .event-timeline {
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

  .timeline-container {
    display: flex;
    flex-direction: column;
    padding-left: 0.5rem;
  }

  .timeline-item {
    display: flex;
    gap: 1.25rem;
    position: relative;
    padding-bottom: 1.5rem;
  }

  .timeline-item:last-child {
    padding-bottom: 0;
  }

  .timeline-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 12px;
  }

  .marker-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--bg-secondary);
    border: 2px solid var(--text-muted);
    z-index: 2;
    transition: all 0.3s ease;
  }

  .upcoming .marker-dot {
    border-color: var(--primary);
    background: var(--primary);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
  }

  .marker-line {
    width: 2px;
    flex: 1;
    background: rgba(255, 255, 255, 0.1);
    margin-top: 4px;
    margin-bottom: 4px;
  }

  .timeline-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: -4px; /* Align text with dot */
  }

  .event-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .date {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .badge {
    font-size: 0.65rem;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  .badge.hackathon { background: rgba(236, 72, 153, 0.15); color: #ec4899; }
  .badge.conference { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
  .badge.meetup { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

  h4 {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  .upcoming h4 {
    color: var(--text-primary);
  }
</style>
