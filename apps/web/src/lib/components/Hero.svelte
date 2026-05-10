<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, QrCode, Smartphone, Zap, Sparkles, Brain, Target, Search } from 'lucide-svelte';
  import BrandIcon from './BrandIcon.svelte';
  import { fade, fly, scale } from 'svelte/transition';

  let mouseX = $state(0);
  let mouseY = $state(0);
  let isMounted = $state(false);

  onMount(() => {
    isMounted = true;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  });
</script>

<section class="relative pt-40 pb-32 overflow-hidden min-h-screen flex items-center">
  <!-- Mesh Background -->
  <div class="mesh-bg opacity-30"></div>

  <!-- Mouse Spotlight -->
  <div 
    class="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300 opacity-20"
    style="background: radial-gradient(800px at {mouseX}px {mouseY}px, var(--primary-glow), transparent 80%);"
  ></div>

  <div class="container mx-auto px-6 relative z-20">
    <div class="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">
      <!-- Content -->
      <div class="flex-1 text-center lg:text-left">
        {#if isMounted}
          <div transition:fade={{ duration: 800, delay: 200 }}>
            <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs font-black tracking-[0.2em] uppercase mb-10 border border-primary/20 backdrop-blur-xl">
              <Sparkles size={14} class="animate-pulse" />
              The AI Identity Revolution
            </span>
          </div>

          <h1 
            transition:fly={{ y: 30, duration: 800, delay: 400 }}
            class="text-fluid-h1 font-black leading-[0.95] mb-10 tracking-tight"
          >
            DevCard <span class="text-gradient italic">AI.</span> <br />
            <span class="opacity-50">Intelligent</span> <br />
            Identity.
          </h1>

          <p 
            transition:fly={{ y: 30, duration: 800, delay: 600 }}
            class="text-fluid-p text-(--text-muted) mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium"
          >
            Aggregate your entire professional existence. Use AI to generate recruiter-ready bios, extract technical skills from code, and optimize your visibility for the future of work.
          </p>

          <div 
            transition:fly={{ y: 30, duration: 800, delay: 800 }}
            class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6"
          >
            <a href="/studio" class="w-full sm:w-auto btn-premium-primary flex items-center justify-center gap-3 group text-xl px-12 py-6">
              <span>Launch AI Studio</span>
              <ArrowRight size={24} class="group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#how-it-works" class="w-full sm:w-auto btn-premium-secondary flex items-center justify-center gap-3 text-xl px-12 py-6">
              <Brain size={24} />
              <span>How it Works</span>
            </a>
          </div>

          <div 
            transition:fade={{ duration: 1000, delay: 1000 }}
            class="mt-20 flex flex-wrap items-center justify-center lg:justify-start gap-12 text-(--text-muted)"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl glass flex items-center justify-center text-primary shadow-lg">
                <Target size={24} />
              </div>
              <div class="flex flex-col">
                <span class="text-xl font-black text-(--text-main)">95%</span>
                <span class="text-[10px] uppercase tracking-[0.2em] font-bold">Hiring Match</span>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl glass flex items-center justify-center text-secondary shadow-lg">
                <Search size={24} />
              </div>
              <div class="flex flex-col">
                <span class="text-xl font-black text-(--text-main)">AI</span>
                <span class="text-[10px] uppercase tracking-[0.2em] font-bold">Optimization</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Cinematic Profile Card -->
      <div class="flex-1 relative flex justify-center lg:justify-end">
        {#if isMounted}
          <div 
            transition:scale={{ duration: 1000, delay: 500, start: 0.8 }}
            class="relative z-20 animate-float"
          >
            <!-- Premium Glass Card -->
            <div class="w-[340px] md:w-[460px] aspect-1/1.5 glass-morphic rounded-[4rem] p-12 relative overflow-hidden group border-2 border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
              <!-- Internal Mesh Glow -->
              <div class="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
              
              <div class="flex flex-col h-full relative z-10">
                <div class="flex justify-between items-start mb-12">
                  <div class="w-16 h-16 bg-linear-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white font-black shadow-2xl text-2xl animate-pulse-glow">AI</div>
                  <div class="text-right">
                    <p class="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Identity Score</p>
                    <p class="text-3xl font-black italic">98.4</p>
                  </div>
                </div>

                <div class="text-center mb-12">
                  <div class="w-32 h-32 bg-linear-to-br from-white/10 to-white/5 rounded-full mx-auto mb-8 border-2 border-primary/30 p-2 flex items-center justify-center overflow-hidden shadow-2xl relative">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" class="w-full h-full rounded-full" />
                    <div class="absolute inset-0 bg-linear-to-t from-primary/20 to-transparent"></div>
                  </div>
                  <h3 class="text-3xl font-black mb-2 tracking-tight">John Developer</h3>
                  <div class="flex items-center justify-center gap-2">
                    <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                    <p class="text-xs text-green-500 font-black uppercase tracking-widest">Optimized by AI</p>
                  </div>
                </div>

                <div class="space-y-4 mb-12">
                  <div class="glass p-4 rounded-2xl flex items-center justify-between group/item hover:bg-white/5 transition-colors">
                    <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Sparkles size={18} />
                      </div>
                      <p class="text-sm font-bold">Smart Bio Generated</p>
                    </div>
                    <div class="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                      <Zap size={10} fill="currentColor" />
                    </div>
                  </div>
                  <div class="glass p-4 rounded-2xl flex items-center justify-between group/item hover:bg-white/5 transition-colors">
                    <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                        <Brain size={18} />
                      </div>
                      <p class="text-sm font-bold">Skills Extracted (12)</p>
                    </div>
                    <div class="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                      <Zap size={10} fill="currentColor" />
                    </div>
                  </div>
                </div>

                <div class="mt-auto flex flex-col items-center">
                  <div class="p-8 glass-morphic rounded-3xl mb-8 bg-white/5 shadow-2xl group-hover:scale-105 transition-transform duration-700 relative overflow-hidden">
                    <div class="absolute inset-0 bg-linear-to-br from-primary/5 to-secondary/5"></div>
                    <QrCode size={160} class="text-white relative z-10 opacity-90" />
                  </div>
                  <p class="text-[12px] font-black text-primary uppercase tracking-[0.4em] animate-pulse">Handshake Active</p>
                </div>
              </div>
            </div>

            <!-- Floating AI Tags -->
            <div class="absolute -top-10 -right-10 glass p-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border-2 border-white/10" style="animation-duration: 5s">
              <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Target size={16} />
              </div>
              <p class="text-xs font-black">Top 1% Talent</p>
            </div>
          </div>

          <!-- Master Glow -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-primary/20 rounded-full blur-[160px] -z-10 animate-pulse-glow"></div>
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
  .container {
    max-width: 1300px;
  }
</style>
