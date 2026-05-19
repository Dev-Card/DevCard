<script lang="ts">
  import { onMount } from 'svelte';
  import { Moon, Sun, Menu, X, LayoutDashboard, Zap, LogOut, Sparkles, Box, BarChart3 } from 'lucide-svelte';
  import { fly, fade } from 'svelte/transition';
  import { page } from '$app/state';

  // Read theme synchronously from the class already applied by the
  // blocking script in app.html — avoids a flash or state mismatch.
  let theme = $state(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
  );
  let isScrolled = $state(false);
  let isMobileMenuOpen = $state(false);
  let activeSection = $state('');

  const user = $derived(page.data.user);

  onMount(() => {
    // Theme is already applied by the blocking script in app.html.
    // We only need to wire up the system preference change listener here.
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only follow system changes if the user hasn't set a manual preference
      if (!localStorage.getItem('devcard-theme')) {
        theme = e.matches ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    const handleScroll = () => {
      isScrolled = window.scrollY > 20;
    };
    window.addEventListener('scroll', handleScroll);

    // Active Section Observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          activeSection = entry.target.id;
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('section[id]').forEach(section => observer.observe(section));

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  });
  
  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('devcard-theme', theme);
  }

  const navLinks = [
    { name: 'AI Studio', href: '/studio', icon: Sparkles },
    { name: 'Marketplace', href: '/themes', icon: Box },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 }
  ];
</script>

<nav
  class="fixed top-0 left-0 right-0 z-50 transition-all duration-700 {isScrolled ? 'py-4' : 'py-8'}"
>
  <div class="container mx-auto px-6">
    <div
      class="glass-morphic px-8 py-4 rounded-3xl flex items-center justify-between transition-all duration-700 {isScrolled ? 'border-primary/20 shadow-2xl shadow-primary/10' : 'bg-transparent border-transparent shadow-none'}"
    >
      <!-- Logo -->
      <a href="/" class="flex items-center gap-3 group">
        <div class="w-12 h-12 bg-linear-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 animate-pulse-glow">
          <Zap size={24} class="fill-white" />
        </div>
        <div class="flex flex-col">
          <span class="text-2xl font-black tracking-tighter leading-none">DevCard <span class="text-primary italic">AI</span></span>
          <span class="text-[10px] font-black uppercase tracking-[0.4em] text-primary mt-1 opacity-70">AI Ecosystem</span>
        </div>
      </a>

      <!-- Desktop Nav -->
      <div class="hidden lg:flex items-center gap-12">
        {#each navLinks as link}
          <a
            href={link.href}
            class="group flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 {page.url.pathname === link.href ? 'text-primary' : 'text-(--text-muted) hover:text-primary'}"
          >
            <link.icon size={14} class="opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            <span>{link.name}</span>
          </a>
        {/each}
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-6">
        <button
          onclick={toggleTheme}
          class="p-3 rounded-2xl glass hover:border-primary/50 transition-all duration-500 group"
          aria-label="Toggle theme"
        >
          {#if theme === 'light'}
            <div in:fade={{ duration: 300 }} class="group-hover:rotate-12 transition-transform"><Moon size={22} /></div>
          {:else}
            <div in:fade={{ duration: 300 }} class="group-hover:rotate-90 transition-transform"><Sun size={22} /></div>
          {/if}
        </button>

        {#if user}
          <a
            href="/dashboard"
            class="hidden sm:flex items-center gap-3 btn-premium-primary px-8! py-3.5! text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105"
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </a>
        {:else}
          <a
            href="/login"
            class="hidden sm:flex items-center gap-3 btn-premium-primary px-8! py-3.5! text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105"
          >
            <Sparkles size={18} class="fill-white" />
            <span>Join Now</span>
          </a>
        {/if}

        <!-- Mobile Menu Toggle -->
        <button
          class="lg:hidden p-3 rounded-2xl glass text-primary border-primary/20"
          onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
        >
          {#if isMobileMenuOpen}
            <X size={24} />
          {:else}
            <Menu size={24} />
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Mobile Menu -->
  {#if isMobileMenuOpen}
    <div
      transition:fly={{ y: -20, duration: 400 }}
      class="lg:hidden absolute top-full left-0 right-0 p-6"
    >
      <div class="glass rounded-3xl p-10 flex flex-col gap-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-primary/30 bg-(--bg-main)/95 backdrop-blur-3xl">
        {#each navLinks as link}
          <a
            href={link.href}
            onclick={() => (isMobileMenuOpen = false)}
            class="flex items-center gap-4 text-2xl font-black uppercase tracking-widest hover:text-primary transition-colors {page.url.pathname === link.href ? 'text-primary' : ''}"
          >
            <link.icon size={24} />
            <span>{link.name}</span>
          </a>
        {/each}
        
        <div class="h-px bg-primary/20 w-full my-4"></div>
        
        {#if user}
          <a
            href="/dashboard"
            class="btn-premium-primary text-center py-5 text-lg font-black uppercase tracking-widest"
          >
            Dashboard
          </a>
          <form action="/logout" method="POST" class="w-full">
            <button class="w-full flex items-center justify-center gap-3 text-red-500 font-black text-xl py-4">
              <LogOut size={24} />
              <span>Log Out</span>
            </button>
          </form>
        {:else}
          <a
            href="/login"
            class="btn-premium-primary text-center py-5 text-lg font-black uppercase tracking-widest"
          >
            Join Ecosystem
          </a>
        {/if}
      </div>
    </div>
  {/if}
</nav>

<style>
  .container {
    max-width: 1400px;
  }
</style>
