<script lang="ts">
  import { onMount } from 'svelte';
  import { BarChart3, TrendingUp, Users, MousePointer2, Globe, ArrowRight, Zap } from 'lucide-svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let isMounted = $state(false);
  onMount(() => {
    isMounted = true;
  });

  const stats = [
    { label: 'Total Views', value: '12.4K', icon: Users, color: 'text-blue-500' },
    { label: 'Click Rate', value: '24.2%', icon: MousePointer2, color: 'text-green-500' },
    { label: 'Global Reach', value: '42', icon: Globe, color: 'text-purple-500' },
    { label: 'Conversion', value: '8.4%', icon: TrendingUp, color: 'text-orange-500' }
  ];
</script>

<svelte:head>
  <title>Analytics — DevCard AI</title>
</svelte:head>

<Navbar />

<main class="min-h-screen pt-40 pb-20 overflow-hidden relative">
  <div class="mesh-bg opacity-10"></div>

  <div class="container mx-auto px-6 relative z-10">
    <div class="text-center max-w-3xl mx-auto mb-20">
      <div class="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.3em] mb-6 border border-primary/20 backdrop-blur-xl">
        Identity Analytics
      </div>
      <h1 class="text-fluid-h2 font-black mb-8 leading-tight">
        Track your <br />
        <span class="text-gradient italic">Digital Influence.</span>
      </h1>
      <p class="text-xl text-(--text-muted) font-medium">
        Deep insights into how your identity is performing across the global developer ecosystem.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
      {#each stats as stat, i}
        <div class="card-cinematic p-8 group">
          <div class="w-12 h-12 rounded-2xl glass flex items-center justify-center {stat.color} mb-6 group-hover:scale-110 transition-transform">
             <stat.icon size={24} />
          </div>
          <p class="text-xs font-black uppercase tracking-widest text-(--text-muted) mb-2">{stat.label}</p>
          <p class="text-4xl font-black italic">{stat.value}</p>
        </div>
      {/each}
    </div>

    <div class="card-cinematic min-h-[400px] flex items-center justify-center p-12 text-center bg-primary/5">
       <div class="max-w-md">
          <div class="w-20 h-20 rounded-full glass flex items-center justify-center text-primary mx-auto mb-8 animate-pulse-glow">
             <BarChart3 size={32} />
          </div>
          <h2 class="text-2xl font-black mb-4 italic">Interactive Charts <span class="text-primary">Loading...</span></h2>
          <p class="text-(--text-muted) font-medium mb-8">
            Connect your production accounts to unlock real-time time-series data and audience demographic analysis.
          </p>
          <button class="btn-premium-primary px-10 py-4 flex items-center gap-3 mx-auto">
             <Zap size={20} class="fill-white" />
             <span>Unlock Premium Insights</span>
          </button>
       </div>
    </div>
  </div>
</main>

<Footer />
