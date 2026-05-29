<script lang="ts">
  let {
    event = {
      name: 'Open Source Hackathon',
      date: 'Oct 15, 2026',
      status: 'Confirmed',
      progress: 75,
      checklist: [
        { label: 'Register Ticket', done: true },
        { label: 'Form Team', done: true },
        { label: 'Review API Docs', done: true },
        { label: 'Setup Repo', done: false }
      ]
    }
  } = $props<{
    event?: {
      name: string;
      date: string;
      status: string;
      progress: number;
      checklist: { label: string, done: boolean }[];
    }
  }>();
</script>

<div class="rsvp-tracker glass">
  <div class="header">
    <div class="title-group">
      <h3>{event.name}</h3>
      <span class="date">{event.date}</span>
    </div>
    <span class="status-badge">{event.status}</span>
  </div>

  <div class="progress-section">
    <div class="progress-header">
      <span class="label">Preparation Progress</span>
      <span class="percentage">{event.progress}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {event.progress}%"></div>
    </div>
  </div>

  <ul class="checklist">
    {#each event.checklist as item}
      <li class="check-item {item.done ? 'done' : ''}">
        <div class="checkbox">
          {#if item.done}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          {/if}
        </div>
        <span>{item.label}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .rsvp-tracker {
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

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--text-primary);
  }

  .date {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .status-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    text-transform: uppercase;
  }

  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
  }

  .label {
    color: var(--text-secondary);
  }

  .percentage {
    color: var(--text-primary);
    font-weight: 600;
  }

  .progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), #ec4899);
    border-radius: 4px;
    transition: width 0.5s ease-out;
  }

  .checklist {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .check-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: var(--text-muted);
    transition: color 0.2s;
  }

  .check-item.done {
    color: var(--text-secondary);
  }

  .checkbox {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .check-item.done .checkbox {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
</style>
