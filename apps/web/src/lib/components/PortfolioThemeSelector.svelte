<script lang="ts">
  let {
    activeTheme = 'glassmorphism',
    onThemeSelect = () => {}
  } = $props<{
    activeTheme?: string;
    onThemeSelect?: (theme: string) => void;
  }>();

  const themes = [
    { id: 'glassmorphism', name: 'Glassmorphic', color1: '#6366f1', color2: '#ec4899', isDark: true },
    { id: 'cyberpunk', name: 'Cyberpunk', color1: '#facc15', color2: '#06b6d4', isDark: true },
    { id: 'minimal-light', name: 'Minimal Light', color1: '#f8fafc', color2: '#e2e8f0', isDark: false },
    { id: 'terminal', name: 'Terminal', color1: '#22c55e', color2: '#000000', isDark: true }
  ];
</script>

<div class="theme-selector glass">
  <div class="header">
    <h3>Portfolio Theme</h3>
  </div>

  <div class="themes-grid">
    {#each themes as theme}
      <button 
        class="theme-btn {activeTheme === theme.id ? 'active' : ''} {theme.isDark ? 'dark' : 'light'}"
        onclick={() => onThemeSelect(theme.id)}
      >
        <div class="preview-colors">
          <div class="color-swatch" style="background: {theme.color1}"></div>
          <div class="color-swatch" style="background: {theme.color2}"></div>
        </div>
        <span class="theme-name">{theme.name}</span>
        
        {#if activeTheme === theme.id}
          <div class="active-indicator">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .theme-selector {
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

  .themes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    flex: 1;
  }

  .theme-btn {
    position: relative;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .theme-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .theme-btn.active {
    background: rgba(99, 102, 241, 0.1);
    border-color: var(--primary);
  }

  .preview-colors {
    display: flex;
    height: 40px;
    border-radius: 6px;
    overflow: hidden;
  }

  .color-swatch {
    flex: 1;
  }

  .theme-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .theme-btn.active .theme-name {
    color: var(--primary);
  }

  .active-indicator {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--primary);
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
  }
</style>
