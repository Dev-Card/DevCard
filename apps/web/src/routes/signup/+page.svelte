<script lang="ts">
  import { Globe, Sparkles } from 'lucide-svelte';
  import BrandIcon from '$lib/components/BrandIcon.svelte';
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';

  let isMounted = $state(false);
  let isLoading = $state(false);
  let error = $state('');
  
  const BACKEND_URL = 'http://localhost:3000';

  onMount(() => {
    isMounted = true;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      error = urlParams.get('error') || 'Registration failed';
    }
  });

  function handleOAuth(provider: 'github' | 'google') {
    if (isLoading) return;
    isLoading = true;
    error = '';
    
    setTimeout(() => {
      window.location.href = `${BACKEND_URL}/auth/${provider}`;
    }, 100);
  }
</script>

<svelte:head>
  <title>Sign Up — DevCard</title>
</svelte:head>

<main class="min-h-screen flex items-center justify-center p-6 bg-grid relative overflow-hidden">
  <!-- Background Accents -->
  <div class="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
    <div class="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
    <div class="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-pulse-slow" style="animation-delay: 2s"></div>
  </div>

  {#if isMounted}
    <div 
      transition:fly={{ y: 20, duration: 800 }}
      class="w-full max-w-md"
    >
      <div class="text-center mb-10">
        <a href="/" class="inline-flex items-center gap-3 mb-8 group">
          <div class="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            <span class="text-2xl font-black italic">D</span>
          </div>
          <span class="text-3xl font-black tracking-tighter">DevCard</span>
        </a>
        <h1 class="text-3xl font-black mb-3">Claim Your Identity</h1>
        <p class="text-(--text-muted) font-medium">Join 5,000+ developers sharing their best work.</p>
      </div>

      <div class="glass rounded-[2.5rem] p-10 shadow-2xl border border-white/10 relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary to-secondary"></div>
        
        {#if error}
          <div transition:fade class="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center gap-3">
            <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            {error}
          </div>
        {/if}

        <div class="space-y-4">
          <button 
            onclick={() => handleOAuth('github')}
            disabled={isLoading}
            class="w-full flex items-center justify-center gap-4 bg-[#24292e] hover:bg-[#2f363d] text-white py-4 rounded-2xl font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isLoading}
              <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {:else}
              <BrandIcon name="github" size={24} />
            {/if}
            <span>{isLoading ? 'Connecting...' : 'Sign up with GitHub'}</span>
          </button>

          <button 
            onclick={() => handleOAuth('google')}
            disabled={isLoading}
            class="w-full flex items-center justify-center gap-4 bg-white hover:bg-gray-50 text-black py-4 rounded-2xl font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isLoading}
              <div class="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            {:else}
              <BrandIcon name="google" size={24} />
            {/if}
            <span>{isLoading ? 'Connecting...' : 'Sign up with Google'}</span>
          </button>
        </div>

        <div class="my-8 flex items-center gap-4">
          <div class="h-px flex-1 bg-(--border-main)"></div>
          <span class="text-[10px] font-black uppercase tracking-[0.2em] text-(--text-muted)">Premium Perks</span>
          <div class="h-px flex-1 bg-(--border-main)"></div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 flex-shrink-0">
              <Sparkles size={16} />
            </div>
            <span class="text-sm font-bold text-(--text-muted)">Instant QR Generation</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
              <Globe size={16} />
            </div>
            <span class="text-sm font-bold text-(--text-muted)">Public Shareable Profile</span>
          </div>
        </div>
      </div>

      <p class="mt-8 text-center text-sm font-bold text-(--text-muted)">
        Already have an account? 
        <a href="/login" class="text-primary hover:underline ml-1">Log in here</a>
      </p>
    </div>
  {/if}
</main>
