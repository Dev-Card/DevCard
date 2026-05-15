<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowUp } from 'lucide-svelte';

  let visible = $state(false);

  function handleScroll() {
    visible = window.scrollY > 400;
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

{#if visible}
  <button
    class="scroll-to-top"
    onclick={scrollToTop}
    aria-label="Scroll to top"
    title="Scroll to top"
  >
    <ArrowUp size={24} />
  </button>
{/if}

<style>
  .scroll-to-top {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: var(--bg-card);
    color: var(--primary);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 3.5rem;
    height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 50;
    transition: all 0.3s ease;
  }

  .scroll-to-top:hover {
    transform: translateY(-4px);
    background: var(--primary);
    color: white;
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
  }

  @media (max-width: 600px) {
    .scroll-to-top {
      bottom: 1.5rem;
      right: 1.5rem;
      width: 3rem;
      height: 3rem;
    }
  }
</style>
