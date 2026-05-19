<script lang="ts">
  import { onMount } from 'svelte';

  interface LanguageStat {
    language: string;
    percentage: number;
    bytes: number;
  }

  interface Repo {
    name: string;
    description: string | null;
    stars: number;
    forks: number;
    url: string;
    language: string | null;
  }

  interface GitHubInsights {
    username: string;
    totalRepos: number;
    totalStars: number;
    totalForks: number;
    followers: number;
    following: number;
    topRepos: Repo[];
    languageStats: LanguageStat[];
    primaryLanguage: string | null;
    fetchedAt: string;
    aiSummary: string | null;
    statsAreCapped: boolean;
  }

  let insights: GitHubInsights | null = null;
  let loading = true;
  let error = '';
  let requiresConnect = false;

  const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

  async function fetchInsights(refresh = false) {
    loading = true;
    error = '';
    try {
      const token = localStorage.getItem('devcard-token');
      if (!token) {
        error = 'Please log in to view your GitHub insights.';
        loading = false;
        return;
      }
      const url = `${API_BASE}/api/analytics/github-insights${refresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && body.requiresAuth) {
          requiresConnect = true;
          loading = false;
          return;
        }
        error = body.message ?? 'Failed to load GitHub insights.';
        loading = false;
        return;
      }
      insights = body as GitHubInsights;
    } catch {
      error = 'Network error — please check your connection.';
    } finally {
      loading = false;
    }
  }

  onMount(() => fetchInsights());
</script>

<svelte:head>
  <title>GitHub Insights — DevCard</title>
  <meta name="description" content="Your AI-powered GitHub activity intelligence dashboard." />
</svelte:head>

<div class="bg-glow"></div>

<main class="container">
  <nav class="glass">
    <div class="nav-content">
      <a href="/" class="logo">⚡ <span class="gradient-text">DevCard</span></a>
      <span class="nav-title">GitHub Insights</span>
    </div>
  </nav>

  {#if loading}
    <div class="state-box">
      <div class="spinner"></div>
      <p>Loading your GitHub insights...</p>
    </div>

  {:else if requiresConnect}
    <div class="state-box">
      <p class="state-icon">🔗</p>
      <h2>Connect your GitHub account</h2>
      <p>Link your GitHub to unlock your developer intelligence dashboard.</p>
      <a href="/connect/github" class="btn-primary">Connect GitHub</a>
    </div>

  {:else if error}
    <div class="state-box error">
      <p class="state-icon">⚠️</p>
      <p>{error}</p>
      <button class="btn-primary" on:click={() => fetchInsights()}>Retry</button>
    </div>

  {:else if insights}
    <div class="dashboard">

      <!-- Header -->
      <div class="header glass">
        <div>
          <h1 class="gradient-text">@{insights.username}</h1>
          <p class="subtitle">Developer Intelligence Dashboard</p>
          {#if insights.statsAreCapped}
            <div class="capped-notice">
              ⚠️ Stats based on your most recently updated 200 repos. You have {insights.totalRepos} repos total.
            </div>
          {/if}
        </div>
        <button class="btn-secondary" on:click={() => fetchInsights(true)}>
          🔄 Refresh
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card glass">
          <div class="stat-value">{insights.totalRepos}</div>
          <div class="stat-label">Repositories</div>
        </div>
        <div class="stat-card glass">
          <div class="stat-value">{insights.totalStars}</div>
          <div class="stat-label">Total Stars</div>
        </div>
        <div class="stat-card glass">
          <div class="stat-value">{insights.totalForks}</div>
          <div class="stat-label">Total Forks</div>
        </div>
        <div class="stat-card glass">
          <div class="stat-value">{insights.followers}</div>
          <div class="stat-label">Followers</div>
        </div>
        <div class="stat-card glass">
          <div class="stat-value">{insights.following}</div>
          <div class="stat-label">Following</div>
        </div>
        {#if insights.primaryLanguage}
          <div class="stat-card glass">
            <div class="stat-value lang">{insights.primaryLanguage}</div>
            <div class="stat-label">Primary Language</div>
          </div>
        {/if}
      </div>

      <!-- AI Summary -->
      {#if insights.aiSummary}
        <div class="ai-card glass">
          <div class="ai-label">🤖 AI Developer Summary</div>
          <p class="ai-text">{insights.aiSummary}</p>
        </div>
      {/if}

      <!-- Language Breakdown -->
      {#if insights.languageStats.length > 0}
        <div class="section glass">
          <h2>Language Breakdown</h2>
          <div class="lang-bar">
            {#each insights.languageStats as lang}
              <div
                class="lang-segment"
                style="width: {lang.percentage}%"
                title="{lang.language}: {lang.percentage.toFixed(1)}%"
              ></div>
            {/each}
          </div>
          <div class="lang-legend">
            {#each insights.languageStats as lang}
              <div class="lang-item">
                <span class="lang-dot"></span>
                <span>{lang.language}</span>
                <span class="lang-pct">{lang.percentage.toFixed(1)}%</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Top Repos -->
      {#if insights.topRepos.length > 0}
        <div class="section glass">
          <h2>Top Repositories</h2>
          <div class="repos-grid">
            {#each insights.topRepos as repo}
              <a href={repo.url} target="_blank" rel="noopener" class="repo-card glass">
                <div class="repo-name">{repo.name}</div>
                {#if repo.description}
                  <div class="repo-desc">{repo.description}</div>
                {/if}
                <div class="repo-stats">
                  <span>⭐ {repo.stars}</span>
                  <span>🍴 {repo.forks}</span>
                  {#if repo.language}<span>💻 {repo.language}</span>{/if}
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}

      <p class="fetched-at">Last updated: {new Date(insights.fetchedAt).toLocaleString()}</p>
    </div>
  {/if}
</main>

<style>
  .bg-glow {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(circle at 50% 0%, var(--primary-glow), transparent 40%),
                radial-gradient(circle at 0% 100%, var(--accent-glow), transparent 30%);
    pointer-events: none;
    z-index: -1;
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.5rem 4rem;
  }

  nav {
    position: sticky;
    top: 1rem;
    margin: 1rem auto;
    border-radius: var(--radius-lg);
    z-index: 100;
    padding: 0.75rem 1.5rem;
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-weight: 800;
    font-size: 1.3rem;
    text-decoration: none;
  }

  .nav-title {
    color: var(--text-secondary);
    font-weight: 600;
  }

  .state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 1.5rem;
    text-align: center;
  }

  .state-icon { font-size: 3rem; }

  .spinner {
    width: 48px; height: 48px;
    border: 4px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .dashboard { display: flex; flex-direction: column; gap: 2rem; margin-top: 2rem; }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2rem;
    border-radius: var(--radius-xl);
  }

  h1 { font-size: 2.5rem; font-weight: 900; margin-bottom: 0.25rem; }
  .subtitle { color: var(--text-secondary); }

  .capped-notice {
    margin-top: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: var(--radius);
    font-size: 0.85rem;
    color: #f59e0b;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    padding: 1.5rem;
    border-radius: var(--radius-xl);
    text-align: center;
  }

  .stat-value { font-size: 2rem; font-weight: 800; color: var(--primary); }
  .stat-value.lang { font-size: 1.2rem; }
  .stat-label { color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.25rem; }

  .ai-card {
    padding: 2rem;
    border-radius: var(--radius-xl);
    border-left: 4px solid var(--primary);
  }

  .ai-label { font-weight: 700; margin-bottom: 0.75rem; color: var(--primary); }
  .ai-text { color: var(--text-secondary); line-height: 1.7; font-size: 1.05rem; }

  .section {
    padding: 2rem;
    border-radius: var(--radius-xl);
  }

  h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; }

  .lang-bar {
    display: flex;
    height: 12px;
    border-radius: 100px;
    overflow: hidden;
    margin-bottom: 1rem;
    background: var(--bg-secondary);
  }

  .lang-segment {
    height: 100%;
    background: var(--primary);
    opacity: 0.8;
    transition: opacity 0.2s;
  }

  .lang-segment:hover { opacity: 1; }

  .lang-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
  }

  .lang-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .lang-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--primary);
  }

  .lang-pct { color: var(--text-secondary); }

  .repos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

  .repo-card {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    text-decoration: none;
    transition: transform 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .repo-card:hover { transform: translateY(-4px); }
  .repo-name { font-weight: 700; color: var(--primary); }
  .repo-desc { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; }
  .repo-stats { display: flex; gap: 1rem; font-size: 0.85rem; color: var(--text-muted); margin-top: auto; }

  .fetched-at {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .btn-primary {
    padding: 0.8rem 1.6rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
  }

  .btn-secondary {
    padding: 0.6rem 1.2rem;
    border: 1px solid var(--border);
    background: var(--bg-card);
    border-radius: var(--radius);
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    h1 { font-size: 1.8rem; }
    .header { flex-direction: column; gap: 1rem; }
  }
</style>