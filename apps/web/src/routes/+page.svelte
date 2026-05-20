<script lang="ts">
  import Navbar from '$lib/components/Navbar.svelte';
  import Hero from '$lib/components/Hero.svelte';
  import Features from '$lib/components/Features.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { Zap } from 'lucide-svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    // Initial scroll animation setup if needed
  });
</script>

<svelte:head>
  <title>DevCard — Premium Developer Identity Platform</title>
  <meta
    name="description"
    content="One Tap. Every Profile. Every Platform. The premium open-source developer profile exchange platform."
  />
</svelte:head>

<div class="relative min-h-screen selection:bg-primary/30 selection:text-primary">
  <Navbar />
  
  <main>
    <Hero />
    
    <section id="how-it-works" class="py-32 relative overflow-hidden bg-(--bg-secondary)/30">
      <div class="container mx-auto px-6">
        <div class="text-center max-w-3xl mx-auto mb-20">
          <div class="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-[0.2em] mb-6 border border-secondary/20">
            Process
          </div>
          <h2 class="text-4xl md:text-5xl font-black mb-8 leading-tight">
            Stop the manual <br />
            <span class="text-primary italic">Search & Connect</span> dance.
          </h2>
          <p class="text-lg text-(--text-muted) font-medium">
            DevCard streamlines professional networking by bridging the gap between physical interaction and digital connection.
          </p>
        </div>

        <div class="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div class="flex-1 space-y-12">
            <div class="group relative">
              <div class="absolute -left-4 top-0 bottom-0 w-1 bg-primary/10 group-hover:bg-primary transition-colors duration-500 rounded-full"></div>
              <div class="pl-8">
                <div class="flex items-center gap-4 mb-4">
                  <span class="text-4xl font-black text-primary/20 group-hover:text-primary transition-colors duration-500">01</span>
                  <h3 class="text-2xl font-black">Connect Your Profiles</h3>
                </div>
                <p class="text-(--text-muted) font-medium leading-relaxed">
                  Link your GitHub, LinkedIn, Twitter, and 15+ other platforms in seconds. Our API handles the synchronization so your data is always up-to-date.
                </p>
              </div>
            </div>

            <div class="group relative">
              <div class="absolute -left-4 top-0 bottom-0 w-1 bg-primary/10 group-hover:bg-primary transition-colors duration-500 rounded-full"></div>
              <div class="pl-8">
                <div class="flex items-center gap-4 mb-4">
                  <span class="text-4xl font-black text-primary/20 group-hover:text-primary transition-colors duration-500">02</span>
                  <h3 class="text-2xl font-black">Generate Your Card</h3>
                </div>
                <p class="text-(--text-muted) font-medium leading-relaxed">
                  Customize your card with professional, dark mode, or hackathon-focused layouts. Choose which profiles to share based on the context of your meeting.
                </p>
              </div>
            </div>

            <div class="group relative">
              <div class="absolute -left-4 top-0 bottom-0 w-1 bg-primary/10 group-hover:bg-primary transition-colors duration-500 rounded-full"></div>
              <div class="pl-8">
                <div class="flex items-center gap-4 mb-4">
                  <span class="text-4xl font-black text-primary/20 group-hover:text-primary transition-colors duration-500">03</span>
                  <h3 class="text-2xl font-black">One Tap to Follow</h3>
                </div>
                <p class="text-(--text-muted) font-medium leading-relaxed">
                  Show your QR code. Your peer scans it and connects with you on everything instantly. No typing, no typos, no friction.
                </p>
              </div>
            </div>
          </div>

          <div class="flex-1 relative">
            <div class="relative z-10 glass p-4 rounded-[3rem] shadow-2xl transform lg:rotate-3 hover:rotate-0 transition-all duration-700">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200" 
                alt="Dashboard Preview" 
                class="rounded-[2.5rem] w-full shadow-2xl" 
              />
              <!-- Floating UI element -->
              <div class="absolute -bottom-10 -left-10 glass p-6 rounded-3xl shadow-2xl animate-bounce hidden md:block" style="animation-duration: 3s">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-500">
                    <Zap size={24} class="fill-current" />
                  </div>
                  <div>
                    <p class="text-xs font-black uppercase tracking-widest text-(--text-muted)">Connection</p>
                    <p class="text-lg font-black">Success!</p>
                  </div>
                </div>
              </div>
            </div>
            <!-- Background glow -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/10 rounded-full blur-[120px] -z-10"></div>
          </div>
        </div>
      </div>
    </section>

    <Features />

    <!-- CTA Section -->
    <section class="py-24">
      <div class="container mx-auto px-6 text-center">
        <div class="glass p-12 md:p-20 rounded-[3rem] relative overflow-hidden group">
          <div class="absolute top-0 left-0 w-full h-full bg-linear-to-br from-primary/10 to-secondary/10 -z-10"></div>
          <div class="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-700"></div>
          
          <h2 class="text-4xl md:text-6xl font-bold mb-8">Ready to upgrade your <br /> <span class="text-primary">developer networking?</span></h2>
          <p class="text-xl text-[var(--text-muted)] mb-12 max-w-2xl mx-auto">
            Join the community of developers who are streamlining their social presence with DevCard.
          </p>
          
          <div class="flex flex-col sm:flex-row justify-center gap-6">
            <a href="/login" class="btn-premium-primary text-lg px-10 py-5">
              Get Started for Free
            </a>
            <a href="/login" class="btn-premium-secondary text-lg px-10 py-5">
              Access Account
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <Footer />
</div>

<style>
  .bg-glow {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, var(--primary-glow), transparent 40%),
                radial-gradient(circle at 0% 100%, var(--accent-glow), transparent 30%);
    pointer-events: none;
    z-index: -1;
  }

  nav {
    position: sticky;
    top: 1.25rem;
    margin: 0 auto;
    width: min(1100px, calc(100% - 2rem));
    max-width: 1100px;
    border-radius: var(--radius-xl);
    z-index: 100;
    padding: 1rem 1.5rem;
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .logo {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1.35rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .theme-toggle {
    width: 46px;
    height: 46px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    transition: transform 0.24s ease, background-color 0.24s ease, border-color 0.24s ease;
  }

  .theme-toggle:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.14);
  }

  .theme-toggle:focus-visible {
    outline: 3px solid rgba(99, 102, 241, 0.24);
    outline-offset: 3px;
  }

  .landing {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.25rem;
  }

  .hero {
    text-align: center;
    padding: clamp(4rem, 8vw, 6rem) 0 4rem;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.45rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 700;
    margin-bottom: 1.75rem;
    color: var(--primary);
  }

  h1 {
    font-size: clamp(3rem, 5.8vw, 4.5rem);
    font-weight: 900;
    letter-spacing: -1px;
    margin: 0 auto 1.5rem;
    max-width: 760px;
  }

  .description {
    font-size: clamp(1rem, 1.1vw, 1.2rem);
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto 2.5rem;
    line-height: 1.7;
  }

  .cta-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .btn-secondary {
    padding: 0.92rem 1.75rem;
    border-radius: calc(var(--radius) * 1.15);
    font-weight: 700;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(99, 102, 241, 0.45);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.75rem;
    padding: 4rem 0 5rem;
  }

  @media (max-width: 640px) {
  .features {
    display: grid;
    grid-template-columns: 1fr; /* single column */
    gap: 16px;
    padding: 0 12px;
  }
}

  .feature-card {
    padding: 2.4rem;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.5));
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
  }

  .feature-card {
  min-height: 140px;
  padding: 16px;
}
@media (max-width: 640px) {
  .feature-card {
    margin-bottom: 12px;
  }
}

  .feature-card:hover {
    transform: translateY(-8px);
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 26px 50px -18px rgba(0, 0, 0, 0.35);
  }

  .feature-icon {
    font-size: 2.3rem;
    margin-bottom: 1.4rem;
  }

  h3 {
    font-size: 1.4rem;
    margin-bottom: 0.9rem;
  }

  .feature-card p {
    color: var(--text-secondary);
    line-height: 1.7;
  }

  .footer {
    text-align: center;
    padding: 3rem 0 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
  }

  @media (max-width: 860px) {
    nav {
      top: 0.9rem;
      padding: 0.85rem 1.1rem;
    }

    .hero {
      padding: clamp(3rem, 9vw, 5rem) 0 3rem;
    }
  }

  @media (max-width: 640px) {
    h1 {
      font-size: 2.6rem;
    }

    .cta-group {
      flex-direction: column;
      align-items: stretch;
    }

    .feature-card {
      padding: 1.8rem;
    }

    .features {
      gap: 1.2rem;
    }

    .footer {
      padding: 2rem 0 1.25rem;
    }
  }
</style>
