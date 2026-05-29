<script lang="ts">
  let { 
    scansPerHour = 142,
    totalConnections = 1845,
    status = 'Trending',
    activeUsers = 28
  } = $props<{
    scansPerHour?: number;
    totalConnections?: number;
    status?: string;
    activeUsers?: number;
  }>();

  // Pulse animation controlled by CSS
</script>

<div class="pulse-card glass">
  <div class="header">
    <div class="title-group">
      <h3>Networking Pulse</h3>
      <span class="live-badge">
        <span class="dot"></span> Live
      </span>
    </div>
    <div class="status">
      {status}
    </div>
  </div>

  <div class="metrics-grid">
    <div class="metric">
      <div class="value-group">
        <span class="number">{scansPerHour}</span>
        <span class="unit">/hr</span>
      </div>
      <span class="label">QR Scan Velocity</span>
    </div>
    
    <div class="divider"></div>

    <div class="metric">
      <div class="value-group">
        <span class="number">{totalConnections}</span>
      </div>
      <span class="label">Total Connections</span>
    </div>
  </div>

  <div class="footer">
    <div class="active-users">
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <strong>{activeUsers}</strong> connections active nearby
    </div>
  </div>
</div>

<style>
  .pulse-card {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .dot {
    width: 6px;
    height: 6px;
    background-color: #ef4444;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    animation: live-pulse 1.5s infinite;
  }

  @keyframes live-pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }

  .status {
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(14, 165, 233, 0.15);
    color: #38bdf8;
  }

  .metrics-grid {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius);
    padding: 1.5rem;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .value-group {
    display: flex;
    align-items: baseline;
    gap: 0.15rem;
  }

  .number {
    font-size: 2.25rem;
    font-weight: 800;
    font-family: 'Outfit', sans-serif;
    color: var(--text-primary);
  }

  .unit {
    font-size: 1rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .divider {
    width: 1px;
    height: 40px;
    background: rgba(255, 255, 255, 0.1);
  }

  .footer {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .active-users {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .icon {
    width: 1.25rem;
    height: 1.25rem;
    color: #38bdf8;
  }

  .active-users strong {
    color: var(--text-primary);
  }
</style>
