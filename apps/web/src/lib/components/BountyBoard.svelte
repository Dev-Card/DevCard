<script lang="ts">
  let {
    bounties = [
      { id: 1, repo: 'vercel/next.js', issue: 'Optimize Image Loader', amount: '$500', match: 98, tags: ['React', 'Performance'] },
      { id: 2, repo: 'sveltejs/kit', issue: 'Fix router typings', amount: '$350', match: 95, tags: ['TypeScript', 'Svelte'] },
      { id: 3, repo: 'withastro/astro', issue: 'Add Markdown integration', amount: '$200', match: 88, tags: ['Markdown', 'Vite'] }
    ]
  } = $props<{
    bounties?: { id: number, repo: string, issue: string, amount: string, match: number, tags: string[] }[];
  }>();
</script>

<div class="bounty-board glass">
  <div class="header">
    <h3>Active Bounties</h3>
    <span class="badge">Matched to Your Skills</span>
  </div>

  <div class="bounties-list">
    {#each bounties as bounty}
      <div class="bounty-card">
        <div class="bounty-main">
          <div class="repo-info">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            <span>{bounty.repo}</span>
          </div>
          <h4 class="issue-title">{bounty.issue}</h4>
          <div class="tags">
            {#each bounty.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        </div>
        
        <div class="bounty-meta">
          <div class="reward-box">
            <span class="amount">{bounty.amount}</span>
            <span class="match-score">{bounty.match}% Match</span>
          </div>
          <button class="btn-claim">Claim</button>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .bounty-board {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  .bounties-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
    overflow-y: auto;
  }

  .bounty-card {
    display: flex;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1.25rem;
    border-radius: var(--radius);
    transition: transform 0.2s, border-color 0.2s;
  }

  .bounty-card:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
  }

  .bounty-main {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .repo-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .issue-title {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }

  .tag {
    font-size: 0.7rem;
    padding: 0.1rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    color: var(--text-secondary);
  }

  .bounty-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    min-width: 90px;
  }

  .reward-box {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .amount {
    font-size: 1.25rem;
    font-weight: 800;
    color: #10b981;
  }

  .match-score {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .btn-claim {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: var(--radius);
    padding: 0.4rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-claim:hover {
    background: #10b981;
    color: #0f172a;
  }

  @media (max-width: 640px) {
    .bounty-card {
      flex-direction: column;
      gap: 1rem;
    }
    .bounty-meta {
      flex-direction: row;
      align-items: center;
    }
    .reward-box {
      align-items: flex-start;
    }
  }
</style>
