<script>
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <meta name="theme-color" content="#6366f1" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><text y=%2224%22 font-size=%2224%22>⚡</text></svg>" />
  
  <!-- Global Open Graph -->
  <meta property="og:site_name" content="DevCard" />
  <meta property="og:type" content="website" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@DevCard" />
</svelte:head>

{@render children()}
