import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './LeaderboardPage.css';

type Contributor = {
login: string;
avatarUrl: string;
profileUrl: string;
issues: number;
mergedPrs: number;
openPrs: number;
};

export default function LeaderboardPage() {
const [contributors, setContributors] = useState<Contributor[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
document.title = 'Contributor Leaderboard | DevCard';
}, []);

useEffect(() => {
let cancelled = false;


async function load() {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/leaderboard.json', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to load leaderboard');
    }

    const data: Contributor[] = await response.json();

    if (!cancelled) {
      setContributors(data);
    }
  } catch {
    if (!cancelled) {
      console.error(error);
      setError('Could not load leaderboard.');
    }
  } finally {
    if (!cancelled) {
      setLoading(false);
    }
  }
}

load();

return () => {
  cancelled = true;
};


}, []);

return (
<> <div className="bg-glow" /> <Navbar />

  <main className="leaderboard" id="leaderboard-main">
    <header className="leaderboard-header">
      <div className="hero-badge">🏆 Community</div>

      <h1>
        <span className="gradient-text">Contributor</span>{' '}
        Leaderboard
      </h1>

      <p className="leaderboard-subtitle">
        The developers building DevCard, ranked by merged
        pull requests, issues, and open work.
      </p>
    </header>

    {loading && (
      <div className="leaderboard-state glass">
        Loading contributors…
      </div>
    )}

    {error && !loading && (
      <div className="leaderboard-state glass error">
        {error}
      </div>
    )}

    {!loading && !error && (
      <ol
        className="leaderboard-list"
        id="leaderboard-list"
      >
        {contributors.map((c, i) => (
          <li
            key={c.login}
            className="leaderboard-row glass"
          >
            <span
              className={`rank rank-${
                i + 1 <= 3 ? i + 1 : 'n'
              }`}
            >
              {i + 1}
            </span>

            <a
              href={c.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="contributor"
            >
              <img
                src={c.avatarUrl}
                alt={c.login}
                className="contributor-avatar"
                loading="lazy"
              />

              <span className="contributor-name">
                @{c.login}
              </span>
            </a>

            <div className="stats">
              <span
                className="stat"
                title="Merged pull requests"
              >
                <span className="stat-value">
                  {c.mergedPrs}
                </span>

                <span className="stat-label">
                  Merged PRs
                </span>
              </span>

              <span
                className="stat"
                title="Open pull requests"
              >
                <span className="stat-value">
                  {c.openPrs}
                </span>

                <span className="stat-label">
                  Open PRs
                </span>
              </span>

              <span
                className="stat"
                title="Issues created"
              >
                <span className="stat-value">
                  {c.issues}
                </span>

                <span className="stat-label">
                  Issues
                </span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    )}

    <div className="leaderboard-footer">
      <Link to="/" className="gradient-text">
        ← Back to Home
      </Link>
    </div>
  </main>
</>);
}
