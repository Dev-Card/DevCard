<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { ArrowLeft, ArrowRight, Zap, CheckCircle2 } from 'lucide-svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let { data } = $props();
  const feature = $derived(data.feature);
  const Icon = $derived(feature.icon);

  let isMounted = $state(false);
  onMount(() => {
    isMounted = true;
    window.scrollTo(0, 0);
  });
</script>

<svelte:head>
  <title>{feature.title} — DevCard Features</title>
  <meta name="description" content={feature.tagline} />
</svelte:head>

<Navbar />

<main class="min-h-screen pt-32 pb-20 overflow-hidden relative">
  <!-- Dynamic Background Glow -->
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none -z-10 opacity-30">
    <div class="absolute inset-0 bg-linear-to-b from-primary/20 via-transparent to-transparent"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-linear-to-br {feature.color} rounded-full blur-[160px] animate-pulse-slow"></div>
  </div>

  <div class="container mx-auto px-6">
    <!-- Breadcrumb -->
    <a href="/#features" class="inline-flex items-center gap-2 text-(--text-muted) hover:text-primary transition-colors font-bold text-sm mb-12 group">
      <ArrowLeft size={16} class="group-hover:-translate-x-1 transition-transform" />
      Back to All Features
    </a>

    <div class="flex flex-col lg:flex-row gap-20 items-center mb-32">
      <!-- Feature Content -->
      <div class="flex-1 text-center lg:text-left">
        {#if isMounted}
          <div transition:fly={{ y: 20, duration: 600 }} class="inline-block px-4 py-1.5 rounded-full bg-linear-to-r {feature.color} text-white text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-lg shadow-black/10">
            Core Capability
          </div>
          
          <h1 transition:fly={{ y: 20, duration: 600, delay: 100 }} class="text-5xl md:text-7xl font-black mb-8 leading-tight">
            {feature.title}
          </h1>
          
          <p transition:fly={{ y: 20, duration: 600, delay: 200 }} class="text-2xl text-primary font-bold italic mb-8">
            "{feature.tagline}"
          </p>
          
          <p transition:fly={{ y: 20, duration: 600, delay: 300 }} class="text-xl text-(--text-muted) leading-relaxed font-medium mb-12 max-w-2xl">
            {feature.description}
          </p>
          
          <div transition:fly={{ y: 20, duration: 600, delay: 400 }} class="flex flex-wrap justify-center lg:justify-start gap-4">
            <a href="/login" class="btn-premium-primary text-lg px-10 py-5">
              Experience it Now
            </a>
            <a href="https://github.com/bhuvaneshwaran/DevCard" class="btn-premium-secondary text-lg px-10 py-5">
              View on GitHub
            </a>
          </div>
        {/if}
      </div>

      <!-- Feature Visual -->
      <div class="flex-1 relative">
        {#if isMounted}
          <div transition:scale={{ duration: 1000, start: 0.9 }} class="relative z-10 glass p-4 rounded-3xl shadow-2xl rotate-2 hover:rotate-0 transition-all duration-700">
            <div class="w-full aspect-square bg-linear-to-br {feature.color} rounded-[2.5rem] flex items-center justify-center text-white p-20">
              <Icon size={240} strokeWidth={1.5} class="drop-shadow-2xl animate-float" />
            </div>
            
            <!-- Floating Stats -->
            <div class="absolute -top-10 -right-10 glass p-6 rounded-3xl shadow-2xl animate-bounce-slow">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <Zap size={20} fill="currentColor" />
                </div>
                <div>
                  <p class="text-[10px] font-black uppercase tracking-widest text-(--text-muted)">Performance</p>
                  <p class="text-xl font-black">99.9%</p>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
      {#each feature.stats as stat, i}
        <div class="card-premium p-10 text-center" style="transition-delay: {i * 100}ms">
          <p class="text-xs font-black uppercase tracking-[0.3em] text-(--text-muted) mb-4">{stat.label}</p>
          <p class="text-5xl font-black text-primary italic">{stat.value}</p>
        </div>
      {/each}
    </div>

    <!-- Highlights -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center py-20 border-t border-(--border-main)">
      <div class="space-y-12">
        <h2 class="text-4xl font-black italic">How it actually <span class="text-primary">Works</span>.</h2>
        {#each feature.highlights as highlight}
          <div class="flex gap-6 group">
            <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
              <highlight.icon size={28} />
            </div>
            <div>
              <h3 class="text-2xl font-black mb-3">{highlight.title}</h3>
              <p class="text-(--text-muted) font-medium leading-relaxed">{highlight.text}</p>
            </div>
          </div>
        {/each}
      </div>

      <div class="glass p-12 rounded-3xl relative overflow-hidden group">
        <div class="absolute -inset-px bg-linear-to-br {feature.color} opacity-5 group-hover:opacity-10 transition-opacity"></div>
        <div class="relative z-10 space-y-8">
          <div class="flex items-center gap-4 text-green-500">
            <CheckCircle2 size={32} />
            <h4 class="text-2xl font-black">Enterprise Ready</h4>
          </div>
          <p class="text-lg text-(--text-muted) font-medium italic">
            "DevCard provides the level of polish and performance expected by modern engineering teams. It's not just a tool; it's your professional handshake."
          </p>
          <div class="pt-8 border-t border-(--border-main) flex items-center gap-4">
            <div class="w-12 h-12 bg-linear-to-br from-gray-200 to-gray-400 rounded-full"></div>
            <div>
              <p class="font-black">Product Team</p>
              <p class="text-xs text-(--text-muted) font-medium">DevCard Lead Architects</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Final CTA -->
    <section class="py-32">
      <div class="glass rounded-[4rem] p-20 text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-linear-to-br {feature.color} opacity-5"></div>
        <div class="relative z-10 max-w-2xl mx-auto">
          <h2 class="text-4xl md:text-5xl font-black mb-8">Ready to use <span class="text-primary italic">{feature.title}</span>?</h2>
          <p class="text-xl text-(--text-muted) font-medium mb-12">
            Join the elite circle of developers who care about their identity as much as their code.
          </p>
          <a href="/login" class="btn-premium-primary text-xl px-12 py-6">
            Create Your Free Card <ArrowRight size={20} class="inline ml-2" />
          </a>
        </div>
      </div>
    </section>
  </div>
</main>

<Footer />

<style>
  .animate-bounce-slow {
    animation: bounce-slow 4s infinite;
  }
  
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }

  .text-linear {
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
</style>
