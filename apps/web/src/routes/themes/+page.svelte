<script lang="ts">
  import { onMount } from 'svelte';
  import { Box, Palette, Layout, Sparkles, ShoppingBag, ArrowRight } from 'lucide-svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let isMounted = $state(false);
  onMount(() => {
    isMounted = true;
  });

  const themes = [
    { name: 'Cyberpunk Neon', description: 'High-contrast neon glow with glitched textures.', price: 'Free', color: 'from-fuchsia-500 to-cyan-500' },
    { name: 'Apple Glass', description: 'Minimalist frosted glass with subtle ambient shadows.', price: 'Free', color: 'from-gray-200 to-gray-400' },
    { name: 'Minimal Elite', description: 'Pure black & white aesthetic for the purist developer.', price: 'Free', color: 'from-black to-zinc-800' },
    { name: 'Matrix Rain', description: 'Classic green digital rain for the terminal obsessed.', price: 'Free', color: 'from-green-500 to-emerald-900' }
  ];
</script>

<svelte:head>
  <title>Marketplace — DevCard AI</title>
</svelte:head>

<Navbar />

<main class="min-h-screen pt-40 pb-20 overflow-hidden relative">
  <div class="mesh-bg opacity-10"></div>

  <div class="container mx-auto px-6 relative z-10">
    <div class="text-center max-w-3xl mx-auto mb-20">
      <div class="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-black uppercase tracking-[0.3em] mb-6 border border-secondary/20 backdrop-blur-xl">
        Theme Marketplace
      </div>
      <h1 class="text-fluid-h2 font-black mb-8 leading-tight">
        Personalize your <br />
        <span class="text-gradient italic">Digital Presence.</span>
      </h1>
      <p class="text-xl text-(--text-muted) font-medium">
        Choose from a curated collection of premium themes designed to make your identity stand out.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {#each themes as theme, i}
        <div class="card-cinematic p-8 flex flex-col group hover:border-primary/50 transition-all duration-500">
          <div class="aspect-square rounded-3xl bg-linear-to-br {theme.color} mb-8 shadow-2xl group-hover:scale-105 transition-transform duration-500 overflow-hidden relative">
             <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Palette size={48} class="text-white" />
             </div>
          </div>
          <h3 class="text-2xl font-black mb-2">{theme.name}</h3>
          <p class="text-sm text-(--text-muted) font-medium mb-6 flex-1">
            {theme.description}
          </p>
          <div class="flex items-center justify-between">
            <span class="text-lg font-black italic text-primary">{theme.price}</span>
            <button class="w-10 h-10 rounded-full glass flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all">
              <ShoppingBag size={18} />
            </button>
          </div>
        </div>
      {/each}
    </div>

    <!-- Custom Theme CTA -->
    <div class="mt-20 glass rounded-3xl p-12 text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-r from-primary/5 to-secondary/5"></div>
      <div class="relative z-10">
        <h2 class="text-3xl font-black mb-6 italic">Want something <span class="text-primary">unique?</span></h2>
        <p class="text-(--text-muted) font-medium mb-10 max-w-xl mx-auto">
          Our AI can generate a custom theme based on your brand colors and personality.
        </p>
        <button class="btn-premium-secondary px-10 py-4 flex items-center gap-3 mx-auto">
          <Sparkles size={20} />
          <span>Generate AI Theme</span>
        </button>
      </div>
    </div>
  </div>
</main>

<Footer />
