<script lang="ts">
  import { 
    Layers, 
    Zap, 
    CreditCard, 
    Share2, 
    Lock, 
    Globe, 
    Cpu, 
    Smartphone,
    ArrowUpRight
  } from 'lucide-svelte';
  import { onMount } from 'svelte';

  const features = [
    {
      slug: 'one-card',
      title: "One Card, All Profiles",
      description: "GitHub, LinkedIn, Twitter, Devfolio, GitLab, LeetCode, and 15+ more — all perfectly synced in one premium digital card.",
      icon: Layers,
      color: "from-blue-500 to-indigo-600"
    },
    {
      slug: 'hybrid-engine',
      title: "Hybrid Follow Engine",
      description: "The industry's first \"Silent Follow\" engine. Connect on GitHub via API and LinkedIn via WebView without ever leaving the app.",
      icon: Zap,
      color: "from-orange-400 to-red-500"
    },
    {
      slug: 'context-cards',
      title: "Context Cards",
      description: "Different cards for different vibes. Use your \"Corporate\" card for LinkedIn and your \"Hacker\" card for Devfolio and GitHub.",
      icon: CreditCard,
      color: "from-purple-500 to-pink-600"
    },
    {
      slug: 'instant-sharing',
      title: "Instant Sharing",
      description: "Share via QR, NFC, or AirDrop-style magic links. Your peers don't even need the app to see your profile and connect.",
      icon: Share2,
      color: "from-green-400 to-emerald-600"
    },
    {
      slug: 'privacy-first',
      title: "Privacy-First Architecture",
      description: "No tracking. No data monetization. Your social identity stays yours. Fully Apache 2.0 licensed and community-audited.",
      icon: Lock,
      color: "from-rose-500 to-orange-600"
    },
    {
      slug: 'developer-focused',
      title: "Built for Developers",
      description: "Fully open source, Svelte-powered, and built with extreme performance in mind. Extend it, host it, or just use it.",
      icon: Globe,
      color: "from-cyan-400 to-blue-600"
    }
  ];

  let observer: IntersectionObserver;
  let sectionRef: HTMLElement;

  onMount(() => {
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-10');
        }
      });
    }, { threshold: 0.1 });

    const cards = sectionRef.querySelectorAll('.feature-card-anim');
    cards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  });
</script>

<section id="features" class="pt-12 pb-24 relative overflow-hidden bg-(--bg-secondary)/50" bind:this={sectionRef}>
  <!-- Background Accents -->
  <div class="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[140px] -z-10 animate-pulse-slow"></div>
  <div class="absolute bottom-0 left-0 w-1/2 h-1/2 bg-secondary/5 rounded-full blur-[140px] -z-10 animate-pulse-slow" style="animation-delay: 2s"></div>

  <div class="container mx-auto px-6">
    <div class="text-center max-w-3xl mx-auto mb-20">
      <div class="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6 border border-primary/20">
        Features
      </div>
      <h2 class="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight">
        Designed for the <br /> 
        <span class="text-primary italic">Modern Developer</span>
      </h2>
      <p class="text-xl text-(--text-muted) leading-relaxed">
        Everything you need to showcase your digital presence with zero friction and maximum impact.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
      {#each features as feature, i}
        {@const Icon = feature.icon}
        <a 
          href="/features/{feature.slug}"
          class="feature-card-anim opacity-0 translate-y-10 transition-all duration-700 group h-full flex cursor-pointer"
          style="transition-delay: {i * 100}ms"
        >
          <div class="card-premium p-8 md:p-10 flex flex-col relative overflow-hidden group w-full transition-transform duration-500 hover:-translate-y-2">
            <!-- Animated Background Glow -->
            <div class="absolute -inset-px bg-linear-to-br {feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
            
            <div class="relative z-10 flex flex-col h-full">
              <div class="w-14 h-14 rounded-2xl bg-linear-to-br {feature.color} flex items-center justify-center text-white mb-8 shadow-lg shadow-black/5 group-hover:scale-110 transition-transform duration-500">
                <Icon size={28} />
              </div>
              
              <h3 class="text-2xl font-black mb-4 flex items-center justify-between">
                {feature.title}
                <ArrowUpRight size={20} class="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
              </h3>
              <p class="text-(--text-muted) leading-relaxed font-medium mb-6">
                {feature.description}
              </p>
              
              <div class="mt-auto pt-4 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest opacity-100 transition-opacity duration-500">
                <span>Learn More</span>
                <Zap size={14} class="fill-primary" />
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

<style>
  .container {
    max-width: 1200px;
  }
</style>
