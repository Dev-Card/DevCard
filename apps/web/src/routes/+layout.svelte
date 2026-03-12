<script>
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <meta name="theme-color" content="#0f0f1a" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><text y=%2224%22 font-size=%2224%22>⚡</text></svg>" />
</svelte:head>

{@render children()}
