<script lang="ts">
  let {
    theme = 'glassmorphism'
  } = $props<{
    theme?: string;
  }>();

  let themeStyles = $derived.by(() => {
    switch(theme) {
      case 'cyberpunk': return 'background: #0f172a; border-color: #06b6d4; box-shadow: 0 0 20px rgba(6,182,212,0.2);';
      case 'minimal-light': return 'background: #f8fafc; border-color: #e2e8f0; color: #334155;';
      case 'terminal': return 'background: #000; border-color: #22c55e; color: #22c55e; font-family: monospace;';
      case 'glassmorphism': 
      default: 
        return 'background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border-color: rgba(255,255,255,0.1);';
    }
  });

  let textPrimary = $derived.by(() => {
    if (theme === 'minimal-light') return '#0f172a';
    if (theme === 'terminal') return '#22c55e';
    return '#f8fafc';
  });

  let textSecondary = $derived.by(() => {
    if (theme === 'minimal-light') return '#475569';
    if (theme === 'terminal') return '#16a34a';
    return '#94a3b8';
  });
</script>

<div class="live-preview-pane glass">
  <div class="header">
    <h3>Live Preview</h3>
  </div>

  <div class="preview-container">
    <div class="mock-card" style="{themeStyles}">
      <div class="mock-header">
        <div class="mock-avatar"></div>
        <div class="mock-info">
          <div class="mock-name" style="color: {textPrimary}">Sarah Chen</div>
          <div class="mock-title" style="color: {textSecondary}">Full Stack Developer</div>
        </div>
      </div>
      <div class="mock-stats">
        <div class="mock-stat-box" style="border-color: {textSecondary}">
          <div class="stat-val" style="color: {textPrimary}">A+</div>
          <div class="stat-lbl" style="color: {textSecondary}">Reputation</div>
        </div>
        <div class="mock-stat-box" style="border-color: {textSecondary}">
          <div class="stat-val" style="color: {textPrimary}">14.5k</div>
          <div class="stat-lbl" style="color: {textSecondary}">Global Rank</div>
        </div>
      </div>
      <div class="mock-radar" style="border-color: {textSecondary}">
        <!-- Mock SVG radar -->
        <svg viewBox="0 0 100 100" width="100%" height="100%" style="opacity: 0.5;">
          <polygon points="50,10 90,40 75,90 25,90 10,40" fill="currentColor" color="{textPrimary}" opacity="0.2" stroke="{textPrimary}" stroke-width="1"/>
        </svg>
      </div>
    </div>
  </div>
</div>

<style>
  .live-preview-pane {
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

  .preview-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: url('data:image/svg+xml;utf8,<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.05)"/></svg>');
    border-radius: var(--radius);
    padding: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .mock-card {
    width: 100%;
    max-width: 300px;
    border: 1px solid;
    border-radius: 1rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    transition: all 0.3s ease;
  }

  .mock-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .mock-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.2;
  }

  .mock-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mock-name {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .mock-title {
    font-size: 0.75rem;
  }

  .mock-stats {
    display: flex;
    gap: 0.5rem;
  }

  .mock-stat-box {
    flex: 1;
    border: 1px solid;
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0.6;
  }

  .stat-val {
    font-size: 1.1rem;
    font-weight: 800;
  }

  .stat-lbl {
    font-size: 0.6rem;
    text-transform: uppercase;
  }

  .mock-radar {
    border: 1px solid;
    border-radius: 0.5rem;
    height: 120px;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
  }
</style>
