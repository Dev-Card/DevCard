<script lang="ts">
  let {
    leaderboard = [
      { rank: 1, name: 'Sarah Chen', handle: '@sarah_codes', score: 14520, trend: 'up' },
      { rank: 2, name: 'David Kim', handle: '@dkim_dev', score: 13950, trend: 'same' },
      { rank: 3, name: 'Alex Wong', handle: '@awong_oss', score: 12840, trend: 'up' },
      { rank: 4, name: 'Maria Garcia', handle: '@mgarcia', score: 11200, trend: 'down' },
      { rank: 5, name: 'You', handle: '@dev_user', score: 9540, trend: 'up', isUser: true }
    ]
  } = $props<{
    leaderboard?: { rank: number, name: string, handle: string, score: number, trend: 'up'|'down'|'same', isUser?: boolean }[];
  }>();
</script>

<div class="global-leaderboard glass">
  <div class="header">
    <h3>Global Rankings</h3>
    <button class="btn-text">View All</button>
  </div>

  <div class="table-container">
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th class="col-rank">Rank</th>
          <th class="col-developer">Developer</th>
          <th class="col-score">Score</th>
          <th class="col-trend">Trend</th>
        </tr>
      </thead>
      <tbody>
        {#each leaderboard as user}
          <tr class:is-user={user.isUser}>
            <td class="col-rank">
              <span class="rank-badge rank-{user.rank}">{user.rank}</span>
            </td>
            <td class="col-developer">
              <div class="developer-info">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} class="avatar" />
                <div class="details">
                  <span class="name">{user.name}</span>
                  <span class="handle">{user.handle}</span>
                </div>
              </div>
            </td>
            <td class="col-score">{user.score.toLocaleString()}</td>
            <td class="col-trend">
              {#if user.trend === 'up'}
                <svg class="trend-icon up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              {:else if user.trend === 'down'}
                <svg class="trend-icon down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              {:else}
                <svg class="trend-icon same" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .global-leaderboard {
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

  .btn-text {
    background: transparent;
    border: none;
    color: var(--primary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-text:hover {
    text-decoration: underline;
  }

  .table-container {
    flex: 1;
    overflow-x: auto;
  }

  .leaderboard-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 0.5rem;
    text-align: left;
  }

  th {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 1rem 0.5rem;
    font-weight: 600;
  }

  td {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.2s;
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.04);
  }

  td:first-child {
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    border-top-left-radius: var(--radius);
    border-bottom-left-radius: var(--radius);
  }

  td:last-child {
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    border-top-right-radius: var(--radius);
    border-bottom-right-radius: var(--radius);
  }

  tr.is-user td {
    background: rgba(99, 102, 241, 0.1);
    border-color: rgba(99, 102, 241, 0.3);
  }

  .col-rank { width: 60px; text-align: center; }
  .col-developer { min-width: 200px; }
  .col-score { width: 100px; font-weight: 700; color: var(--text-primary); }
  .col-trend { width: 60px; text-align: center; }

  th.col-rank, th.col-trend { text-align: center; }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-weight: 800;
    font-size: 0.875rem;
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }

  .rank-1 { background: linear-gradient(135deg, #fbbf24, #d97706); color: #fff; box-shadow: 0 0 10px rgba(251,191,36,0.4); }
  .rank-2 { background: linear-gradient(135deg, #94a3b8, #475569); color: #fff; }
  .rank-3 { background: linear-gradient(135deg, #b45309, #78350f); color: #fff; }

  .developer-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-secondary);
  }

  .details {
    display: flex;
    flex-direction: column;
  }

  .name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .handle {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .trend-icon {
    width: 18px;
    height: 18px;
  }

  .trend-icon.up { color: #22c55e; }
  .trend-icon.down { color: #ef4444; }
  .trend-icon.same { color: var(--text-muted); }
</style>
