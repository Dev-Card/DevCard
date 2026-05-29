<script lang="ts">
  let {
    mentors = [
      { id: 1, name: 'Alex Rivera', role: 'Staff Engineer', company: 'Stripe', match: 94, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
      { id: 2, name: 'Priya Patel', role: 'OSS Maintainer', company: 'Vercel', match: 88, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' }
    ]
  } = $props<{
    mentors?: { id: number, name: string, role: string, company: string, match: number, avatar: string }[];
  }>();
</script>

<div class="mentorship-match glass">
  <div class="header">
    <h3>Recommended Mentors</h3>
  </div>

  <div class="mentors-grid">
    {#each mentors as mentor}
      <div class="mentor-card">
        <div class="mentor-header">
          <img src={mentor.avatar} alt={mentor.name} class="avatar" />
          <div class="match-score">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
            </svg>
            {mentor.match}%
          </div>
        </div>
        
        <div class="mentor-info">
          <h4 class="name">{mentor.name}</h4>
          <span class="role">{mentor.role} @ {mentor.company}</span>
        </div>

        <button class="btn-connect">Connect</button>
      </div>
    {/each}
  </div>
</div>

<style>
  .mentorship-match {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
  }

  .header h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .mentors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    flex: 1;
  }

  .mentor-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: all 0.2s;
  }

  .mentor-card:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-2px);
  }

  .mentor-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.1);
  }

  .match-score {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(236, 72, 153, 0.1);
    color: #ec4899;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .mentor-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .name {
    margin: 0;
    font-size: 1.05rem;
    color: var(--text-primary);
  }

  .role {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .btn-connect {
    margin-top: auto;
    width: 100%;
    padding: 0.6rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius);
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .btn-connect:hover {
    opacity: 0.9;
  }
</style>
