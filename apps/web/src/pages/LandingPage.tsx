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
  return (
    <>
      <div className="bg-glow" />
      <Navbar />
      <main className="landing" id="landing-main">
        <section className="hero" id="hero-section">
          <div className="hero-badge">🚀 Open Source & Free Forever</div>
          <h1>
            <span className="gradient-text">One Tap.</span>
            <br />
            Every Profile.
          </h1>
          <p className="description">
            The developer-first profile exchange platform. Share your GitHub, LinkedIn,
            Twitter, and every other profile with a single NFC tap — beautifully.
          </p>
          <div className="cta-group">
            <Link to="/" className="btn-primary" id="cta-get-started">
              Get Started Free
            </Link>
            <a
              href="https://github.com/ShantKhatri/DevCard"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              id="cta-github"
            >
              ⭐ Star on GitHub
            </a>
          </div>
        </section>

        <section className="features" id="features-section">
          {features.map((f, i) => (
            <article className="feature-card" key={i} id={`feature-card-${i}`}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </section>

        <footer className="footer" id="landing-footer">
          <p>
            Built with ❤️ by the{' '}
            <a
              href="https://github.com/ShantKhatri/DevCard"
              target="_blank"
              rel="noopener noreferrer"
              className="gradient-text"
            >
              DevCard
            </a>{' '}
            community
          </p>
        </footer>
      </main>
    </>
  );
}
