import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './LeaderboardPage.css';

const REPO = 'Dev-Card/DevCard';
const GITHUB_API = 'https://api.github.com';

// Maintainers / accounts excluded from the contributor leaderboard.
const EXCLUDED = new Set(
  ['ShantKhatri', 'Harxhit', 'blankirigaya'].map((u) => u.toLowerCase())
);

type Contributor = {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  issues: number;
  mergedPrs: number;
  openPrs: number;
};

type GithubContributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  type: string;
};

type SearchResult = { total_count: number };

async function ghJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function countSearch(query: string): Promise<number> {
  const url = `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&per_page=1`;
  const result = await ghJson<SearchResult>(url);
  return result.total_count;
}

async function loadContributorStats(login: string): Promise<Pick<Contributor, 'issues' | 'mergedPrs' | 'openPrs'>> {
  const base = `repo:${REPO} author:${login}`;
  const [issues, mergedPrs, openPrs] = await Promise.all([
    countSearch(`${base} type:issue`),
    countSearch(`${base} type:pr is:merged`),
    countSearch(`${base} type:pr is:open`),
  ]);
  return { issues, mergedPrs, openPrs };
}

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
        const list = await ghJson<GithubContributor[]>(
          `${GITHUB_API}/repos/${REPO}/contributors?per_page=100`
        );

        const eligible = list.filter(
          (c) => c.type === 'User' && !EXCLUDED.has(c.login.toLowerCase())
        );

        const enriched = await Promise.all(
          eligible.map(async (c) => {
            const stats = await loadContributorStats(c.login);
            return {
              login: c.login,
              avatarUrl: c.avatar_url,
              profileUrl: c.html_url,
              ...stats,
            } satisfies Contributor;
          })
        );

        enriched.sort(
          (a, b) =>
            b.mergedPrs - a.mergedPrs ||
            b.issues - a.issues ||
            b.openPrs - a.openPrs ||
            a.login.localeCompare(b.login)
        );

        if (!cancelled) setContributors(enriched);
      } catch {
        if (!cancelled) setError('Could not load contributors. GitHub may be rate-limiting — try again shortly.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="bg-glow" />
      <Navbar />
      <main className="leaderboard" id="leaderboard-main">
        <header className="leaderboard-header">
          <div className="hero-badge">🏆 Community</div>
          <h1>
            <span className="gradient-text">Contributor</span> Leaderboard
          </h1>
          <p className="leaderboard-subtitle">
            The developers building DevCard — ranked by merged pull requests, issues, and open work.
          </p>
        </header>

        {loading && (
          <div className="leaderboard-state glass">Loading contributors…</div>
        )}

        {error && !loading && (
          <div className="leaderboard-state glass error">{error}</div>
        )}

        {!loading && !error && (
          <ol className="leaderboard-list" id="leaderboard-list">
            {contributors.map((c, i) => (
              <li key={c.login} className="leaderboard-row glass">
                <span className={`rank rank-${i + 1 <= 3 ? i + 1 : 'n'}`}>
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
                  <span className="contributor-name">@{c.login}</span>
                </a>
                <div className="stats">
                  <span className="stat" title="Merged pull requests">
                    <span className="stat-value">{c.mergedPrs}</span>
                    <span className="stat-label">Merged PRs</span>
                  </span>
                  <span className="stat" title="Open pull requests">
                    <span className="stat-value">{c.openPrs}</span>
                    <span className="stat-label">Open PRs</span>
                  </span>
                  <span className="stat" title="Issues created">
                    <span className="stat-value">{c.issues}</span>
                    <span className="stat-label">Issues</span>
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
    </>
  );
}
