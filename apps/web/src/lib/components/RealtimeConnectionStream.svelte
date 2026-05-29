<script lang="ts">
  let {
    stream = [
      { id: 1, user: '@sarah_dev', action: 'scanned your QR code', time: 'Just now', type: 'scan' },
      { id: 2, user: '@alex_code', action: 'viewed your GitHub profile', time: '2m ago', type: 'view' },
      { id: 3, user: '@mike_sys', action: 'connected with you', time: '15m ago', type: 'connect' },
      { id: 4, user: '@jenn_ui', action: 'scanned your QR code', time: '1h ago', type: 'scan' }
    ]
  } = $props<{
    stream?: { id: number, user: string, action: string, time: string, type: 'scan' | 'view' | 'connect' }[];
  }>();
</script>

<div class="stream-container glass">
  <div class="header">
    <h3>Live Activity Stream</h3>
  </div>
  
  <div class="stream-list">
    {#each stream as item (item.id)}
      <div class="stream-item">
        <div class="icon-wrapper {item.type}">
          {#if item.type === 'scan'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            </svg>
          {:else if item.type === 'view'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          {/if}
        </div>
        <div class="content">
          <p class="action-text"><strong>{item.user}</strong> {item.action}</p>
          <span class="time">{item.time}</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .stream-container {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    height: 100%;
  }

  .header h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .stream-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    overflow-y: auto;
  }

  .stream-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem;
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .stream-item:hover {
    transform: translateX(4px);
    background: rgba(255, 255, 255, 0.04);
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .icon-wrapper svg {
    width: 18px;
    height: 18px;
  }

  .icon-wrapper.scan { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
  .icon-wrapper.view { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
  .icon-wrapper.connect { background: rgba(34, 197, 94, 0.15); color: #22c55e; }

  .content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .action-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .action-text strong {
    color: var(--text-primary);
  }

  .time {
    font-size: 0.75rem;
    color: var(--text-muted);
  }
</style>
