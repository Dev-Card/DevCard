<script lang="ts">
  import { onMount } from 'svelte';
  import { Sparkles, Brain, Cpu, Zap, ArrowRight, Globe, Link as LinkIcon, Save, RefreshCw, CheckCircle2 } from 'lucide-svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let isMounted = $state(false);
  let isProcessing = $state(false);
  let progress = $state(0);
  let currentStep = $state('');

  onMount(() => {
    isMounted = true;
  });

  async function startAIAnalysis() {
    isProcessing = true;
    progress = 0;
    
    const steps = [
      'Scanning connected platforms...',
      'Analyzing GitHub contribution patterns...',
      'Extracting technical skill graph...',
      'Detecting career growth trajectory...',
      'Generating recruiter-optimized bio...',
      'Finalizing AI DevCard enhancements...'
    ];

    for (let i = 0; i < steps.length; i++) {
      currentStep = steps[i];
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      progress = ((i + 1) / steps.length) * 100;
    }

    isProcessing = false;
  }
</script>

<svelte:head>
  <title>AI Studio — DevCard AI</title>
</svelte:head>

<Navbar />

<main class="min-h-screen pt-40 pb-20 overflow-hidden relative">
  <div class="mesh-bg opacity-20"></div>

  <div class="container mx-auto px-6 relative z-10">
    <div class="text-center max-w-3xl mx-auto mb-20">
      <div class="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-[0.3em] mb-6 border border-primary/20 backdrop-blur-xl">
        AI Enhancement Studio
      </div>
      <h1 class="text-fluid-h2 font-black mb-8 leading-tight">
        Optimize your <br />
        <span class="text-gradient italic">Digital DNA.</span>
      </h1>
      <p class="text-xl text-(--text-muted) font-medium">
        Use state-of-the-art AI to analyze your project history, extract expertise, and build an unbeatable professional narrative.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left: Data Sources -->
      <div class="lg:col-span-1 space-y-8">
        <div class="card-cinematic">
          <h3 class="text-xl font-black mb-6 flex items-center gap-3">
            <Cpu size={24} class="text-primary" />
            Connected Sources
          </h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 glass rounded-2xl border-primary/20">
              <div class="flex items-center gap-4">
                <Globe size={20} />
                <span class="font-bold">GitHub</span>
              </div>
              <div class="text-xs font-black text-green-500 uppercase tracking-widest">Active</div>
            </div>
            <div class="flex items-center justify-between p-4 glass rounded-2xl opacity-50 grayscale">
              <div class="flex items-center gap-4">
                <LinkIcon size={20} />
                <span class="font-bold">LinkedIn</span>
              </div>
              <button class="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Connect</button>
            </div>
          </div>
        </div>

        <div class="card-cinematic bg-primary/5">
          <h3 class="text-xl font-black mb-4">AI Intelligence</h3>
          <p class="text-sm text-(--text-muted) font-medium mb-6">
            Our models are trained on 10M+ successful developer profiles and hiring patterns.
          </p>
          <div class="space-y-4">
            <div class="flex items-center gap-3 text-xs font-bold">
              <Zap size={14} class="text-yellow-500" />
              <span>Bio Optimization</span>
            </div>
            <div class="flex items-center gap-3 text-xs font-bold">
              <Zap size={14} class="text-yellow-500" />
              <span>Skill Gap Analysis</span>
            </div>
            <div class="flex items-center gap-3 text-xs font-bold">
              <Zap size={14} class="text-yellow-500" />
              <span>Recruiter Visibility</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: AI Processing -->
      <div class="lg:col-span-2">
        <div class="card-cinematic min-h-[500px] flex flex-col items-center justify-center text-center p-12">
          {#if !isProcessing && progress === 0}
            <div class="w-24 h-24 bg-linear-to-br from-primary to-secondary rounded-3xl flex items-center justify-center text-white shadow-2xl mb-10 animate-float">
              <Sparkles size={48} />
            </div>
            <h2 class="text-3xl font-black mb-6">Ready for AI Analysis?</h2>
            <p class="text-(--text-muted) font-medium mb-12 max-w-md">
              We'll scan your public contributions and platforms to build your intelligent identity. This takes about 30 seconds.
            </p>
            <button 
              onclick={startAIAnalysis}
              class="btn-premium-primary px-12 py-6 text-xl flex items-center gap-4 shadow-primary/40"
            >
              <span>Start Analysis</span>
              <ArrowRight size={24} />
            </button>
          {:else if isProcessing}
            <div class="w-full max-w-md">
              <div class="relative w-48 h-48 mx-auto mb-12">
                <div class="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div 
                  class="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"
                  style="clip-path: polygon(0 0, 100% 0, 100% {progress}%, 0 {progress}%)"
                ></div>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-4xl font-black">{Math.round(progress)}%</span>
                </div>
              </div>
              <h3 class="text-2xl font-black mb-4 animate-pulse">{currentStep}</h3>
              <p class="text-xs font-black uppercase tracking-[0.3em] text-primary">AI Neural Link Active</p>
            </div>
          {:else}
            <div class="w-full text-left" in:fade>
              <div class="flex items-center justify-between mb-12">
                <h2 class="text-3xl font-black italic">Analysis <span class="text-primary">Complete.</span></h2>
                <button 
                  onclick={startAIAnalysis}
                  class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-(--text-muted) hover:text-primary transition-colors"
                >
                  <RefreshCw size={14} />
                  <span>Re-analyze</span>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-6">
                  <div class="p-6 glass rounded-2xl">
                    <h4 class="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">Smart Bio</h4>
                    <p class="text-sm font-medium leading-relaxed italic">
                      "A high-impact Full Stack Engineer with a focus on cinematic user experiences. Proven track record in Svelte architectures and AI-driven frontend ecosystems. Top 1% contributor in open-source identity tooling."
                    </p>
                  </div>
                  <div class="p-6 glass rounded-2xl">
                    <h4 class="text-xs font-black uppercase tracking-[0.2em] text-secondary mb-4">Skill Extraction</h4>
                    <div class="flex flex-wrap gap-2">
                      {#each ['SvelteKit', 'TypeScript', 'Tailwind', 'AI/ML', 'Fastify', 'Prisma', 'PostgreSQL', 'UI/UX'] as skill}
                        <span class="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">{skill}</span>
                      {/each}
                    </div>
                  </div>
                </div>

                <div class="space-y-6">
                  <div class="p-6 glass rounded-2xl bg-linear-to-br from-green-500/10 to-transparent border-green-500/20">
                    <h4 class="text-xs font-black uppercase tracking-[0.2em] text-green-500 mb-4">Optimization Report</h4>
                    <ul class="space-y-4">
                      <li class="flex items-center gap-3 text-sm font-bold">
                        <CheckCircle2 size={16} class="text-green-500" />
                        <span>Profile SEO: Excellent</span>
                      </li>
                      <li class="flex items-center gap-3 text-sm font-bold opacity-60">
                        <RefreshCw size={16} class="text-blue-500" />
                        <span>Project Linking: Needs Update</span>
                      </li>
                      <li class="flex items-center gap-3 text-sm font-bold">
                        <CheckCircle2 size={16} class="text-green-500" />
                        <span>Recruiter Impact: High</span>
                      </li>
                    </ul>
                  </div>
                  <button class="w-full btn-premium-primary py-5 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3">
                    <Save size={18} />
                    <span>Apply Enhancements</span>
                  </button>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</main>

<Footer />

<style>
  .animate-spin {
    animation: spin 2s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
