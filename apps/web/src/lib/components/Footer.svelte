<script lang="ts">
  import { Heart } from 'lucide-svelte';
  import BrandIcon from './BrandIcon.svelte';
</script>

<footer class="py-24 border-t border-(--border-main) bg-(--bg-main) relative overflow-hidden">
  <!-- Decorative Glow -->
  <div class="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10"></div>
  
  <div class="container mx-auto px-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
      <div class="lg:col-span-2">
        <div class="flex items-center gap-3 mb-8 group cursor-default">
          <div class="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 group-hover:rotate-6 transition-transform duration-500">
            <span class="text-2xl font-black italic">D</span>
          </div>
          <span class="text-2xl font-black tracking-tighter">DevCard</span>
        </div>
        <p class="text-lg text-(--text-muted) max-w-md leading-relaxed font-medium mb-8">
          The ultimate developer identity platform. One tap to connect on every platform you care about. Open source and privacy-first.
        </p>
        <div class="flex items-center gap-4">
          <a href="https://x.com/DevCard" target="_blank" class="p-3 glass rounded-2xl hover:text-primary hover:scale-110 transition-all duration-300" aria-label="Follow us on X (Twitter)">
            <BrandIcon name="twitter" size={24} />
          </a>
          <a href="https://github.com/Dev-Card/DevCard" target="_blank" class="p-3 glass rounded-2xl hover:text-primary hover:scale-110 transition-all duration-300" aria-label="Follow us on GitHub">
            <BrandIcon name="github" size={24} />
          </a>
          <a href="https://linkedin.com/company/devcard" target="_blank" class="p-3 glass rounded-2xl hover:text-primary hover:scale-110 transition-all duration-300" aria-label="Connect with us on LinkedIn">
            <BrandIcon name="linkedin" size={24} />
          </a>
        </div>
      </div>

      <div>
        <h4 class="font-black mb-8 uppercase tracking-[0.2em] text-xs text-primary">Product</h4>
        <ul class="space-y-4">
          <li><a href="#features" class="text-(--text-muted) hover:text-primary font-bold transition-all duration-300">Features</a></li>
          <li><a href="#how-it-works" class="text-(--text-muted) hover:text-primary font-bold transition-all duration-300">How it Works</a></li>
          <li><a href="https://docs.devcard.io" class="text-(--text-muted) hover:text-primary font-bold transition-all duration-300">Documentation</a></li>
          <li><a href="/pricing" class="text-(--text-muted) hover:text-primary font-bold transition-all duration-300">Premium Plans</a></li>
        </ul>
      </div>

      <div>
        <h4 class="font-black mb-8 uppercase tracking-[0.2em] text-xs text-primary">Community</h4>
        <ul class="space-y-4">
          <li><a href="https://github.com/Dev-Card/DevCard" class="text-(--text-muted) hover:text-primary font-bold transition-all duration-300">GitHub</a></li>
          <li><a href="https://github.com/Dev-Card/DevCard/blob/main/CONTRIBUTING.md" class="text-(--text-muted) hover:text-primary font-bold transition-all duration-300">Contributing</a></li>
          <li><a href="https://discord.gg/devcard" class="text-(--text-muted) hover:text-primary font-bold transition-all duration-300">Discord</a></li>
          <li><a href="https://github.com/sponsors/dev-card" class="text-(--text-muted) hover:text-primary font-bold transition-all duration-300">Sponsors</a></li>
        </ul>
      </div>
    </div>

    <div class="pt-12 border-t border-(--border-main) flex flex-col md:flex-row justify-between items-center gap-8">
      <div class="flex flex-col md:flex-row items-center gap-8">
        <p class="text-sm text-(--text-muted) font-bold">
          &copy; {new Date().getFullYear()} DevCard Platform. Built with <Heart size={14} class="inline text-red-500 fill-red-500" /> for developers.
        </p>
        <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest border border-green-500/20">
          <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          All Systems Operational
        </div>
      </div>
      <div class="flex items-center gap-8">
        <a href="/privacy" class="text-xs font-bold text-(--text-muted) hover:text-primary transition-colors">Privacy</a>
        <a href="/terms" class="text-xs font-bold text-(--text-muted) hover:text-primary transition-colors">Terms</a>
        <a href="https://github.com/bhuvaneshwaran/DevCard" class="text-xs font-bold text-(--text-muted) hover:text-primary transition-colors">Open Source</a>
      </div>
    </div>
  </div>
</footer>

<style>
  .container {
    max-width: 1200px;
  }
</style>
