<script lang="ts">
  let {
    theme = 'glassmorphism'
  } = $props<{
    theme?: string;
  }>();

  let embedCode = $derived(`<iframe 
  src="https://devcard.app/embed/sarah_codes?theme=${theme}" 
  width="100%" 
  height="450" 
  frameborder="0" 
  scrolling="no"
></iframe>`);

  let copied = $state(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(embedCode);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<div class="embed-code-generator glass">
  <div class="header">
    <h3>Embed Code</h3>
    <button class="btn-copy" onclick={copyToClipboard} aria-label="Copy code">
      {#if copied}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span style="color: #22c55e">Copied</span>
      {:else}
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
      {/if}
    </button>
  </div>

  <div class="code-container">
    <div class="code-header">
      <div class="dots">
        <div class="dot red"></div>
        <div class="dot yellow"></div>
        <div class="dot green"></div>
      </div>
      <span class="lang">HTML</span>
    </div>
    <pre><code>{embedCode}</code></pre>
  </div>
</div>

<style>
  .embed-code-generator {
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

  .btn-copy {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-secondary);
    padding: 0.4rem 0.75rem;
    border-radius: var(--radius);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-copy:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }

  .code-container {
    background: #0f172a;
    border-radius: var(--radius);
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .code-header {
    background: rgba(0, 0, 0, 0.2);
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .red { background: #ef4444; }
  .yellow { background: #f59e0b; }
  .green { background: #10b981; }

  .lang {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  pre {
    margin: 0;
    padding: 1.25rem;
    overflow-x: auto;
    font-family: 'Fira Code', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #38bdf8;
    flex: 1;
  }
</style>
