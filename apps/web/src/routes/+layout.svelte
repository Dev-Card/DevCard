<script>
  import '../app.css';
  import { fade } from 'svelte/transition';
  let { children } = $props();
</script>

<svelte:head>
  <meta name="theme-color" content="#030712" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><text y=%2224%22 font-size=%2224%22>⚡</text></svg>" />
</svelte:head>

<div class="relative min-h-screen selection:bg-primary/30 selection:text-primary">
  <div class="mesh-bg"></div>
  
  <main transition:fade>
    {@render children()}
  </main>
</div>
