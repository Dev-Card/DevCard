<script lang="ts">
  import { PLATFORMS, getProfileUrl } from '@devcard/shared';
  import { fade, fly, scale } from 'svelte/transition';
  import { 
    Zap, CreditCard, Share2, ExternalLink, ArrowRight,
    Mail, Globe, MapPin, Briefcase 
  } from 'lucide-svelte';
  import BrandIcon from '$lib/components/BrandIcon.svelte';
  import { onMount } from 'svelte';

  let { data } = $props();
  const profile = $derived(data.profile);
  const error = $derived(data.error);

  const platformColors: Record<string, string> = {
    github: '#181717', linkedin: '#0A66C2', twitter: '#000000',
    gitlab: '#FC6D26', devfolio: '#3770FF', npm: '#CB3837',
    devto: '#0A0A0A', hashnode: '#2962FF', medium: '#000000',
    leetcode: '#FFA116', hackerrank: '#00EA64', discord: '#5865F2',
    telegram: '#26A5E4', email: '#EA4335', portfolio: '#6366F1', custom: '#8B5CF6',
  };

  let mounted = $state(false);
  onMount(() => {
    mounted = true;
  });

  function handleShare() {
    if (navigator.share && profile) {
      navigator.share({
        title: `${profile.displayName}'s DevCard`,
        url: window.location.href
      });
    }
  }
</script>

<svelte:head>
  {#if profile}
    <title>{profile.displayName} | DevCard</title>
    <meta name="description" content="{profile.bio || `${profile.displayName}'s developer profiles`}" />
  {:else}
    <title>User Not Found | DevCard</title>
  {/if}
</svelte:head>

<div class="min-h-screen bg-(--bg-main) text-(--text-main) selection:bg-primary/30" style="--accent-color: {profile?.accentColor || '#7C3AED'}">
  <!-- Background Accents -->
  <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-(--accent-color)/20 rounded-full blur-[120px] animate-pulse-slow"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow-reverse"></div>
  </div>

  {#if error || !profile}
    <main class="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div transition:scale class="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-8">
        <Zap size={48} />
      </div>
      <h1 transition:fade class="text-4xl font-black mb-4">User Not Found</h1>
      <p transition:fade class="text-(--text-muted) max-w-md mb-12 text-lg font-medium">This DevCard profile could not be found. It might have been moved or deleted.</p>
      <a href="/" class="btn-premium-primary px-8 py-4 flex items-center gap-3">
        <span>Go Home</span>
        <ArrowRight size={20} />
      </a>
    </main>
  {:else}
    <main class="max-w-xl mx-auto px-6 py-12 lg:py-24">
      <div 
        transition:fly={{ y: 40, duration: 800 }}
        class="card-premium p-1 relative overflow-hidden"
      >
        <!-- Profile Header -->
        <div class="relative z-10 p-8 md:p-12 text-center">
          <div class="relative inline-block mb-8 group">
            <div class="absolute inset-0 bg-(--accent-color)/30 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            {#if profile.avatarUrl}
              <img 
                src={profile.avatarUrl} 
                alt={profile.displayName} 
                class="w-32 h-32 rounded-full relative z-10 border-4 border-black/10 dark:border-white/10 shadow-2xl"
              />
            {:else}
              <div 
                class="w-32 h-32 rounded-full relative z-10 flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-black/10 dark:border-white/10"
                style="background: linear-gradient(135deg, var(--accent-color), var(--color-secondary, #06B6D4))"
              >
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            {/if}
          </div>

          <h1 class="text-4xl font-black mb-2 tracking-tight">{profile.displayName}</h1>
          
          <div class="flex flex-wrap items-center justify-center gap-4 text-sm font-bold text-(--text-muted) uppercase tracking-widest mb-6">
            {#if profile.role}
              <div class="flex items-center gap-1.5">
                <Briefcase size={14} class="text-(--accent-color)" />
                <span>{profile.role}</span>
              </div>
            {/if}
            {#if profile.company}
              <div class="flex items-center gap-1.5">
                <Globe size={14} class="text-secondary" />
                <span>{profile.company}</span>
              </div>
            {/if}
          </div>

          {#if profile.bio}
            <p class="text-lg text-(--text-muted) font-medium leading-relaxed max-w-md mx-auto mb-10">
              {profile.bio}
            </p>
          {/if}

          <!-- Action Bar -->
          <div class="flex items-center justify-center gap-4 pt-8 border-t border-black/5 dark:border-white/5">
            <button 
              onclick={handleShare}
              class="flex-1 btn-premium-primary flex items-center justify-center gap-2 py-4"
              style="background: linear-gradient(135deg, var(--accent-color), var(--color-secondary, #06B6D4))"
            >
              <Share2 size={20} />
              <span>Share Profile</span>
            </button>
            <button 
              class="p-4 glass rounded-2xl hover:bg-primary/10 transition-colors text-primary"
              style="color: var(--accent-color)"
            >
              <Zap size={24} />
            </button>
          </div>
        </div>
      </div>

      <!-- Links Grid -->
      <div class="mt-8 space-y-4">
        <h3 class="text-xs font-black uppercase tracking-[0.3em] text-(--text-muted) px-4 mb-6">Professional Connections</h3>
        
        {#each profile.links as link, i}
          {@const platform = PLATFORMS[link.platform]}
          {@const color = platformColors[link.platform] || '#8B5CF6'}
          <a 
            href={link.url || getProfileUrl(link.platform, link.username)}
            target="_blank"
            rel="noopener noreferrer"
            transition:fly={{ y: 20, duration: 600, delay: 100 * i }}
            class="card-premium group flex items-center justify-between hover:scale-[1.02] transition-all duration-300 active:scale-95 border border-black/5 dark:border-white/5 p-4 md:p-6 rounded-2xl glass"
          >
            <div class="flex items-center gap-6">
              <div 
                class="w-14 h-14 rounded-2xl flex items-center justify-center text-(--text-muted) transition-colors"
                style="background: {color}15; color: {color}"
              >
                <BrandIcon name={link.platform as any} size={24} />
              </div>
              <div>
                <h4 class="text-lg font-black group-hover:text-(--accent-color) transition-colors">{platform?.name || link.platform}</h4>
                <p class="text-sm font-medium text-(--text-muted)">{link.username}</p>
              </div>
            </div>
            <div 
              class="p-3 rounded-xl transition-all"
              style="background: {color}10; color: {color}"
            >
              <ExternalLink size={18} />
            </div>
          </a>
        {/each}
      </div>

      <!-- Footer CTA -->
      <footer class="mt-20 text-center pb-12">
        <p class="text-(--text-muted) font-medium mb-6">Want your own premium developer card?</p>
        <a 
          href="/" 
          class="inline-flex items-center gap-3 glass px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all border-primary/20"
          style="border-color: var(--accent-color)30"
        >
          <Zap size={20} class="fill-primary" style="fill: var(--accent-color)" />
          <span>Get Your DevCard Free</span>
        </a>
      </footer>
    </main>
  {/if}
</div>

<style>
  :global(body) {
    background: var(--bg-main);
  }
</style>
