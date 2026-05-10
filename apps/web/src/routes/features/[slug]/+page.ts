import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { 
  Layers, Zap, CreditCard, Share2, Lock, Globe, 
  Code, Shield, Zap as Fast, Smartphone, Users
} from 'lucide-svelte';

const featureData = {
  'one-card': {
    title: "One Card, All Profiles",
    tagline: "The single source of truth for your digital identity.",
    description: "Aggregation is at the heart of DevCard. We connect to the APIs of major platforms to ensure your metrics, contributions, and social links are always in sync.",
    icon: Layers,
    color: "from-blue-500 to-indigo-600",
    stats: [
      { label: "Integrations", value: "20+" },
      { label: "Sync Speed", value: "Real-time" },
      { label: "Accuracy", value: "100%" }
    ],
    highlights: [
      {
        title: "Deep API Integration",
        text: "We don't just link; we fetch data. Your GitHub contribution graph and Twitter bio are imported directly.",
        icon: Code
      },
      {
        title: "Auto-Discovery",
        text: "Add one link, and our engine finds your other profiles based on verified metadata.",
        icon: Fast
      }
    ]
  },
  'hybrid-engine': {
    title: "Hybrid Follow Engine",
    tagline: "The faster way to grow your professional network.",
    description: "Networking shouldn't be manual. Our Hybrid Engine allows you to follow someone on multiple platforms simultaneously with a single secure handshake.",
    icon: Zap,
    color: "from-orange-400 to-red-500",
    stats: [
      { label: "Time Saved", value: "90%" },
      { label: "Success Rate", value: "99.9%" },
      { label: "Handshake", value: "Secure" }
    ],
    highlights: [
      {
        title: "Silent Handshake",
        text: "Exchange data without scanning. Using near-field proximity logic for instant detection.",
        icon: Smartphone
      },
      {
        title: "Multi-Platform Push",
        text: "Follow on GitHub, LinkedIn, and Twitter in one click. No more searching for usernames.",
        icon: Users
      }
    ]
  },
  'context-cards': {
    title: "Context Cards",
    tagline: "Tailor your identity to the audience.",
    description: "You are more than one thing. DevCard lets you create different versions of your profile for different contexts—hackathons, conferences, or job interviews.",
    icon: CreditCard,
    color: "from-purple-500 to-pink-600",
    stats: [
      { label: "Templates", value: "12+" },
      { label: "Custom Slots", value: "Unlimited" },
      { label: "Switch Speed", value: "Instant" }
    ],
    highlights: [
      {
        title: "Professional Persona",
        text: "Hide the memes, show the enterprise experience. Perfect for high-stakes interviews.",
        icon: Shield
      },
      {
        title: "Hacker Identity",
        text: "Showcase your PRs, repo stars, and hackathon wins for developer-focused meetups.",
        icon: Code
      }
    ]
  },
  'instant-sharing': {
    title: "Instant Sharing",
    tagline: "Frictionless connection, everywhere.",
    description: "Share your card via QR code, NFC tags, or a short 'magic' URL. Your peers don't even need the app to connect with you.",
    icon: Share2,
    color: "from-green-400 to-emerald-600",
    stats: [
      { label: "NFC Ready", value: "Yes" },
      { label: "QR Format", value: "SVG/PNG" },
      { label: "Offline", value: "Supported" }
    ],
    highlights: [
      {
        title: "Zero-App Requirement",
        text: "Anyone with a browser can view your card. They don't need to sign up to save your contact info.",
        icon: Globe
      },
      {
        title: "NFC Card Support",
        text: "Program your physical business card or phone sticker to point to your DevCard instantly.",
        icon: Smartphone
      }
    ]
  },
  'privacy-first': {
    title: "Privacy-First Architecture",
    tagline: "Your data is your property.",
    description: "DevCard is built on the principle of data sovereignty. We never sell your info, and we use zero trackers.",
    icon: Lock,
    color: "from-rose-500 to-orange-600",
    stats: [
      { label: "Trackers", value: "Zero" },
      { label: "Ads", value: "None" },
      { label: "Encryption", value: "E2E" }
    ],
    highlights: [
      {
        title: "Open Source Audit",
        text: "Our source code is transparent. Anyone can verify how we handle user data.",
        icon: Code
      },
      {
        title: "Zero Monetization",
        text: "We don't sell your data. Our model is based on premium features, not user tracking.",
        icon: Globe
      }
    ]
  },
  'developer-focused': {
    title: "Built for Developers",
    tagline: "High performance, zero bloat.",
    description: "Written in Svelte 5 and optimized for speed. DevCard is built by developers, for developers, with a focus on DX and performance.",
    icon: Globe,
    color: "from-cyan-400 to-blue-600",
    stats: [
      { label: "Lighthouse", value: "100/100" },
      { label: "Bundle Size", value: "Minimal" },
      { label: "API Access", value: "Public" }
    ],
    highlights: [
      {
        title: "Extensible Schema",
        text: "Add custom platforms or integrations via our open API. Build your own themes and layouts.",
        icon: Code
      },
      {
        title: "Community Driven",
        text: "Fully open source under Apache 2.0. Suggest features, fix bugs, and grow the platform.",
        icon: Users
      }
    ]
  }
};

export const load: PageLoad = ({ params }) => {
  const feature = featureData[params.slug as keyof typeof featureData];

  if (!feature) {
    throw error(404, 'Feature not found');
  }

  return {
    feature
  };
};
