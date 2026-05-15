<script lang="ts">
  import { Inbox } from 'lucide-svelte';

  let { title, message }: { title: string; message: string } = $props();
</script>

<div class="empty-state">
  <div class="empty-icon" aria-hidden="true">
    <Inbox size={48} />
  </div>
  <h3>{title}</h3>
  <p>{message}</p>
  <slot />
</div>

<style>
  .empty-state {
    text-align: center;
    padding: 3rem 1.5rem;
    background: var(--bg-elevated);
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);
    margin: 1rem 0;
  }

  .empty-icon {
    color: var(--text-muted);
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
  }

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
</style>
