import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './LandingPage.css';

const features = [
  {
    icon: '📱',
    title: 'NFC Tap & Share',
    description:
      'Share your developer profiles with a single tap. No apps, no QR codes — just pure NFC magic.',
  },
  {
    icon: '🔗',
    title: 'All Platforms, One Card',
    description:
      'GitHub, LinkedIn, Twitter, Dev.to, and more. Consolidate every developer profile into one sleek card.',
  },
  {
    icon: '⚡',
    title: 'Open Source',
    description:
      'Built by developers, for developers. Fully open-source and community-driven. Fork it, extend it, make it yours.',
  },
];

export default function LandingPage() {
  const revealRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  return (
    <>
      <div className="bg-glow" aria-hidden="true" />
      <Navbar />
      <main className="landing" id="landing-main">
        {/* ── Hero ── */}
        <section className="hero" id="hero-section">
          <div className="hero-badge reveal" ref={addRef}>
            🚀 Open Source &amp; Free Forever
          </div>

          <h1 className="reveal" ref={addRef}>
            <span className="gradient-text">One Tap.</span>
            <br />
            Every Profile.
          </h1>

          <p className="description reveal" ref={addRef}>
            The developer-first profile exchange platform. Share your GitHub, LinkedIn,
            Twitter, and every other profile with a single NFC tap — beautifully.
          </p>

          <div className="cta-group reveal" ref={addRef}>
            <Link to="/" className="btn-primary" id="cta-get-started">
              <span>Get Started Free</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            <a
              href="https://github.com/Dev-Card/DevCard"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              id="cta-github"
            >
              ⭐ Star on GitHub
            </a>
          </div>

          {/* subtle floating badge beneath CTA */}
          <p className="hero-sub reveal" ref={addRef}>
            Free forever · No credit card · MIT licensed
          </p>
        </section>

        {/* ── Features ── */}
        <section className="features" id="features-section">
          {features.map((f, i) => (
            <article
              className="feature-card reveal"
              key={i}
              id={`feature-card-${i}`}
              ref={addRef}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </section>

        {/* ── Footer ── */}
        <footer className="footer" id="landing-footer">
          <div className="footer-inner">
            {/* Brand */}
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="footer-logo-icon">⚡</span>
                <span className="gradient-text footer-logo-text">DevCard</span>
              </div>
              <p className="footer-tagline">
                One tap. Every profile. Built in the open.
              </p>
            </div>

            {/* Links */}
            <nav className="footer-links" aria-label="Footer navigation">
              <div className="footer-col">
                <span className="footer-col-label">Product</span>
                <a href="https://github.com/Dev-Card/DevCard" target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="#features-section">Features</a>
                <Link to="/">Get Started</Link>
              </div>
              <div className="footer-col">
                <span className="footer-col-label">Community</span>
                <a href="https://github.com/Dev-Card/DevCard/issues" target="_blank" rel="noopener noreferrer">Issues</a>
                <a href="https://github.com/Dev-Card/DevCard/pulls" target="_blank" rel="noopener noreferrer">Contribute</a>
                <a href="https://github.com/Dev-Card/DevCard/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>
              </div>
            </nav>
          </div>

          {/* Bottom bar */}
          <div className="footer-bottom">
            <span>Built with ❤️ by the DevCard community</span>
            <span className="footer-dot" aria-hidden="true">·</span>
            <span>Open Source &amp; Free Forever</span>
          </div>
        </footer>
      </main>
    </>
  );
}