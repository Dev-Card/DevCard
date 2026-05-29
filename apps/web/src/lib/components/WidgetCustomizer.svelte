<script lang="ts">
  let {
    widgets = [
      { id: 'reputation', label: 'Reputation Score', enabled: true },
      { id: 'github_stats', label: 'GitHub Analytics', enabled: true },
      { id: 'networking', label: 'Networking Radar', enabled: false },
      { id: 'bounties', label: 'Bounty Earnings', enabled: true },
      { id: 'leaderboard', label: 'Global Ranking', enabled: true }
    ],
    onToggle = () => {}
  } = $props<{
    widgets?: { id: string, label: string, enabled: boolean }[];
    onToggle?: (id: string, enabled: boolean) => void;
  }>();

  function toggle(widget: any) {
    widget.enabled = !widget.enabled;
    onToggle(widget.id, widget.enabled);
  }
</script>

<div class="widget-customizer glass">
  <div class="header">
    <h3>Include Widgets</h3>
  </div>

  <div class="widgets-list">
    {#each widgets as widget}
      <button 
        class="toggle-row"
        onclick={() => toggle(widget)}
        role="switch"
        aria-checked={widget.enabled}
      >
        <span class="widget-label">{widget.label}</span>
        <div class="toggle-switch {widget.enabled ? 'on' : 'off'}">
          <div class="toggle-knob"></div>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .widget-customizer {
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

  .widgets-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .toggle-row:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .widget-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .toggle-switch {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    position: relative;
    transition: background 0.3s;
  }

  .toggle-switch.on {
    background: var(--primary);
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
  }

  .toggle-switch.on .toggle-knob {
    transform: translateX(20px);
  }
</style>
