<script lang="ts">
  import { 
    LayoutDashboard, CreditCard, BarChart3, Settings, Plus, ExternalLink, 
    Share2, MoreHorizontal, QrCode, Zap, Users, Eye, LogOut, X 
  } from 'lucide-svelte';
  import BrandIcon from '$lib/components/BrandIcon.svelte';
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';

  let { data } = $props();
  let isMounted = $state(false);
  let activeTab = $state('cards');
  let isCreateModalOpen = $state(false);
  let newCardTitle = $state('');

  const stats = [
    { label: 'Total Views', value: '0', icon: Eye, color: 'text-blue-500' },
    { label: 'Connections', value: '0', icon: Users, color: 'text-green-500' },
    { label: 'Card Shares', value: '0', icon: Share2, color: 'text-purple-500' },
  ];

  const myCards = $derived(data.cards || []);

  onMount(() => {
    isMounted = true;
  });

  function handleCreateCard() {
    if (!newCardTitle) return;
    // In a real app, we would call api.createCard({ title: newCardTitle })
    console.log('Creating card:', newCardTitle);
    isCreateModalOpen = false;
    newCardTitle = '';
  }
</script>

<svelte:head>
  <title>Dashboard — DevCard</title>
</svelte:head>

<div class="min-h-screen bg-(--bg-main) flex">
  <!-- Sidebar -->
  <aside class="w-20 lg:w-64 border-r border-(--border-main) bg-(--bg-main) flex flex-col items-center lg:items-start p-6 fixed h-full z-30">
    <a href="/" class="flex items-center gap-3 mb-12 group">
      <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
        <Zap size={22} class="fill-white" />
      </div>
      <span class="hidden lg:block text-xl font-black tracking-tighter">DevCard</span>
    </a>

    <nav class="flex-1 w-full space-y-2">
      <button 
        onclick={() => activeTab = 'cards'}
        class="w-full flex items-center gap-4 p-3 rounded-2xl transition-all {activeTab === 'cards' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-(--text-muted) hover:bg-primary/10 hover:text-primary'}"
      >
        <CreditCard size={22} />
        <span class="hidden lg:block font-bold">My Cards</span>
      </button>
      <button 
        onclick={() => activeTab = 'analytics'}
        class="w-full flex items-center gap-4 p-3 rounded-2xl transition-all {activeTab === 'analytics' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-(--text-muted) hover:bg-primary/10 hover:text-primary'}"
      >
        <BarChart3 size={22} />
        <span class="hidden lg:block font-bold">Analytics</span>
      </button>
      <button 
        onclick={() => activeTab = 'settings'}
        class="w-full flex items-center gap-4 p-3 rounded-2xl transition-all {activeTab === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-(--text-muted) hover:bg-primary/10 hover:text-primary'}"
      >
        <Settings size={22} />
        <span class="hidden lg:block font-bold">Settings</span>
      </button>
    </nav>

    <div class="mt-auto pt-6 border-t border-(--border-main) w-full space-y-4">
      <div class="flex items-center gap-3 px-2">
        <div class="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed={data.user?.username || 'default'}" alt="Avatar" />
        </div>
        <div class="hidden lg:block overflow-hidden">
          <p class="text-xs font-black truncate">{data.user?.username || 'Guest'}</p>
          <p class="text-[10px] text-(--text-muted) font-bold uppercase tracking-widest">Free Plan</p>
        </div>
      </div>

      <form action="/logout" method="POST" class="w-full">
        <button 
          type="submit"
          class="w-full flex items-center gap-4 p-3 rounded-2xl transition-all text-red-500 hover:bg-red-500/10"
        >
          <LogOut size={22} />
          <span class="hidden lg:block font-bold">Log Out</span>
        </button>
      </form>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 ml-20 lg:ml-64 p-6 lg:p-12">
    {#if isMounted}
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div transition:fade>
          <h1 class="text-3xl lg:text-4xl font-black mb-2">Developer Dashboard</h1>
          <p class="text-(--text-muted) font-medium">Manage your digital identity and track your networking impact.</p>
        </div>
        <button 
          onclick={() => isCreateModalOpen = true}
          class="btn-premium-primary flex items-center gap-2 px-6 py-3 self-start"
        >
          <Plus size={20} />
          <span>Create New Card</span>
        </button>
      </header>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {#each stats as stat, i}
          {@const Icon = stat.icon}
          <div 
            transition:fly={{ y: 20, duration: 500, delay: i * 100 }}
            class="card-premium flex items-center gap-6"
          >
            <div class="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center {stat.color}">
              <Icon size={28} />
            </div>
            <div>
              <p class="text-xs font-black uppercase tracking-widest text-(--text-muted) mb-1">{stat.label}</p>
              <p class="text-3xl font-black">{stat.value}</p>
            </div>
          </div>
        {/each}
      </div>

      <!-- Content Sections -->
      {#if activeTab === 'cards'}
        {#if myCards.length === 0}
          <div 
            transition:fade
            class="flex flex-col items-center justify-center py-20 bg-(--bg-secondary)/30 rounded-[3rem] border-2 border-dashed border-(--border-main)"
          >
            <div class="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6">
              <CreditCard size={40} />
            </div>
            <h3 class="text-2xl font-black mb-2">No Cards Yet</h3>
            <p class="text-(--text-muted) font-medium mb-8 max-w-sm text-center">Create your first developer card to start sharing your professional presence.</p>
            <button 
              onclick={() => isCreateModalOpen = true}
              class="btn-premium-primary px-8 py-3"
            >
              Get Started
            </button>
          </div>
        {:else}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {#each myCards as card, i}
              <div 
                transition:fly={{ y: 20, duration: 600, delay: i * 100 }}
                class="card-premium group"
              >
                <div class="flex items-center justify-between mb-8">
                  <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h3 class="text-xl font-black">{card.title}</h3>
                      <p class="text-xs font-bold text-primary uppercase tracking-widest">{card.isDefault ? 'Primary' : 'Secondary'}</p>
                    </div>
                  </div>
                  <button class="p-2 hover:bg-primary/10 rounded-xl transition-colors">
                    <MoreHorizontal size={20} class="text-(--text-muted)" />
                  </button>
                </div>

                <div class="flex items-center gap-3 mb-8">
                  {#each card.links || [] as link}
                    <div class="w-10 h-10 glass rounded-xl flex items-center justify-center text-(--text-muted) hover:text-primary transition-colors">
                      <BrandIcon name={link.platform as any} size={18} />
                    </div>
                  {/each}
                  <button class="w-10 h-10 glass rounded-xl flex items-center justify-center text-(--text-muted) border-dashed hover:border-primary hover:text-primary transition-all">
                    <Plus size={16} />
                  </button>
                </div>

                <div class="flex items-center justify-between pt-6 border-t border-(--border-main)">
                  <div class="flex items-center gap-4">
                    <div class="flex flex-col">
                      <span class="text-lg font-black">{card.views || 0}</span>
                      <span class="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Views</span>
                    </div>
                    <div class="w-px h-8 bg-(--border-main)"></div>
                    <p class="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Updated {card.lastUpdated || 'recently'}</p>
                  </div>
                  <div class="flex gap-2">
                    <button class="p-2.5 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/10">
                      <Share2 size={18} />
                    </button>
                    <a href="/u/{data.user?.username}" target="_blank" class="p-2.5 glass rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/10">
                      <ExternalLink size={18} />
                    </a>
                  </div>
                </div>
              </div>
            {/each}

            <!-- Add More Card Slot -->
            <button 
              onclick={() => isCreateModalOpen = true}
              class="card-premium border-dashed border-2 border-primary/20 flex flex-col items-center justify-center gap-4 text-(--text-muted) hover:border-primary/40 hover:text-primary transition-all group"
            >
              <div class="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={32} />
              </div>
              <p class="font-black uppercase tracking-[0.2em] text-xs">Create New Profile</p>
            </button>
          </div>
        {/if}
      {/if}
    {/if}
  </main>
</div>

<!-- Create Card Modal -->
{#if isCreateModalOpen}
  <div 
    transition:fade={{ duration: 200 }}
    class="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/40"
  >
    <div 
      transition:scale={{ duration: 400, start: 0.95 }}
      class="glass w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl border border-white/20 relative overflow-hidden"
    >
      <button 
        onclick={() => isCreateModalOpen = false}
        class="absolute top-6 right-6 p-2 rounded-full hover:bg-primary/10 transition-colors"
      >
        <X size={20} />
      </button>

      <h2 class="text-3xl font-black mb-2">Create New Card</h2>
      <p class="text-(--text-muted) font-medium mb-8">Personalize your card identity and share your links.</p>

      <div class="space-y-6">
        <div>
          <label for="card-title" class="block text-xs font-black uppercase tracking-widest text-(--text-muted) mb-3 ml-1">Card Title</label>
          <input 
            id="card-title"
            type="text" 
            bind:value={newCardTitle}
            placeholder="e.g. Portfolio Card, Social Hub"
            class="w-full bg-(--bg-secondary) border border-(--border-main) rounded-2xl px-6 py-4 font-bold focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <button 
          onclick={handleCreateCard}
          disabled={!newCardTitle}
          class="w-full btn-premium-primary py-5 text-lg font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Card
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    background: var(--bg-main);
  }
</style>
