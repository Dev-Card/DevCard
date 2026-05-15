<script lang="ts">
  import type { Snippet } from 'svelte';

  let { icon, title, description }: { 
    icon: string; 
    title: string; 
    description: string;
  } = $props();
</script>

<article class="feature-card">
  <div class="feature-icon" aria-hidden="true">{icon}</div>
  <h3>{title}</h3>
  <p>{description}</p>
</article>

<style>
  .feature-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 2rem;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease;
  }

  .feature-card:hover {
    transform: translateY(-4px);
    border-color: var(--primary);
  }

  .feature-icon {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .feature-card p {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
  }

  @media (max-width: 600px) {
    .feature-card {
      padding: 1.5rem;
    }
  }
</style>
