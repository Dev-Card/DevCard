import Navbar from '../components/Navbar';
import './LandingPage.css';

const SmartphoneIcon = () => (
  <svg xmlns="http://www.apache.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
    <path d="M12 18h.01"></path>
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.apache.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>
);

const OpenSourceIcon = () => (
  <svg xmlns="http://www.apache.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"></polyline>
    <polyline points="8 6 2 12 8 18"></polyline>
  </svg>
);

const features = [
  {
    icon: <SmartphoneIcon />,
    title: 'NFC Tap & Share',
    description:
      'Share your developer profiles with a single tap. No apps, no QR codes. Just pure NFC magic.',
  },
  {
    icon: <LinkIcon />,
    title: 'All Platforms, One Card',
    description:
      'GitHub, LinkedIn, Twitter, Dev.to, and more. Consolidate every developer profile into one sleek card.',
  },
  {
    icon: <OpenSourceIcon />,
    title: 'Open Source Community',
    description:
      'Built by developers, for developers. Fully open-source and community-driven. Fork it, extend it, make it yours.',
  },
];

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="landing-container" id="landing-main">
        {/* Hero Section */}
        <section className="hero-section" id="hero-section">
          <div className="hero-content">
            <h1>
              One Tap. Every Profile.
            </h1>
            <p className="hero-description">
              DevCard is the developer-first profile exchange platform. Share your GitHub, LinkedIn, Twitter, and every other profile with a single NFC tap.
            </p>
            <div className="hero-actions">
              <button className="btn-solid disabled" disabled id="cta-get-started">
                Mobile App Coming Soon
              </button>
              <a
                href="https://github.com/Dev-Card/DevCard"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
                id="cta-github"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* Our Story / Problem Section */}
        <section className="info-section alternate-bg" id="story-section">
          <div className="content-wrapper">
            <h2>The Problem We're Solving</h2>
            <p>
              As developers, our professional identity is scattered across multiple platforms. We have our code on GitHub, our articles on Dev.to or Medium, our professional network on LinkedIn, and our community presence on Twitter/X or Discord.
            </p>
            <p>
              When meeting someone at a hackathon, conference, or meetup, sharing all these links is a hassle. DevCard solves this by consolidating your entire developer footprint into a single, sleek NFC card and a unified profile page. Tap your card to a phone, and instantly share who you are and what you build.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section" id="features-section">
          <div className="content-wrapper">
            <h2>Why DevCard?</h2>
            <div className="features-grid">
              {features.map((f, i) => (
                <article className="info-card" key={i} id={`feature-card-${i}`}>
                  <div className="info-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Community & Onboarding Section */}
        <section className="info-section alternate-bg" id="community-section">
          <div className="content-wrapper text-center">
            <h2>Join the Community</h2>
            <p className="community-description">
              DevCard is an open-source initiative. We welcome contributors of all skill levels to help us build the ultimate developer identity platform.
            </p>
            <div className="community-links">
              <a href="https://discord.gg/R5AmTHgnm" target="_blank" rel="noopener noreferrer" className="community-link discord">
                💬 Join our Discord
              </a>
              <a href="https://github.com/Dev-Card/DevCard/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="community-link guide">
                📚 Developer Guide
              </a>
              <a href="https://github.com/Dev-Card/DevCard" target="_blank" rel="noopener noreferrer" className="community-link github">
                ⭐ Star the Repo
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer" id="landing-footer">
          <p>
            Built with ❤️ by the{' '}
            <a
              href="https://github.com/Dev-Card/DevCard"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              DevCard Community
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
