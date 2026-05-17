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
    
    <section id="how-it-works" class="pt-32 pb-16 relative overflow-hidden bg-(--bg-secondary)/30">
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
  .container {
    max-width: 1200px;
  }
</style>
