<script lang="ts">
  let {
    matchProfile = {
      name: 'Alex Chen',
      handle: '@alexc_dev',
      role: 'Fullstack Engineer',
      matchScore: 92,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    },
    commonSkills = ['Svelte', 'TypeScript', 'Node.js']
  } = $props<{
    matchProfile?: {
      name: string;
      handle: string;
      role: string;
      matchScore: number;
      avatar: string;
    };
    commonSkills?: string[];
  }>();

  // Calculate SVG stroke offset for the circular progress
  let circumference = $derived(2 * Math.PI * 36);
  let strokeDashoffset = $derived(circumference - (matchProfile.matchScore / 100) * circumference);
</script>

<div class="match-card glass">
  <div class="header">
    <h3>Top Hackathon Match</h3>
    <span class="badge">Highly Compatible</span>
  </div>

  <div class="profile-section">
    <div class="avatar-ring">
      <svg class="progress-ring" viewBox="0 0 80 80">
        <circle class="ring-bg" cx="40" cy="40" r="36" />
        <circle 
          class="ring-progress" 
          cx="40" cy="40" r="36" 
          style="stroke-dasharray: {circumference}; stroke-dashoffset: {strokeDashoffset};"
        />
      </svg>
      <img src={matchProfile.avatar} alt={matchProfile.name} class="avatar" />
      <div class="score-badge">{matchProfile.matchScore}%</div>
    </div>

    <div class="info">
      <h4>{matchProfile.name}</h4>
      <span class="handle">{matchProfile.handle}</span>
      <p class="role">{matchProfile.role}</p>
    </div>
  </div>

  <div class="skills-section">
    <span class="skills-label">Shared Stack:</span>
    <div class="skills-list">
      {#each commonSkills as skill}
        <span class="skill-tag">{skill}</span>
      {/each}
    </div>
  </div>

  <button class="btn-primary connect-btn">Send Collaboration Request</button>
</div>

<style>
  .match-card {
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
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .profile-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .avatar-ring {
    position: relative;
    width: 80px;
    height: 80px;
    flex-shrink: 0;
  }

  .progress-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.05);
    stroke-width: 4;
  }

  .ring-progress {
    fill: none;
    stroke: #22c55e;
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-dashoffset 1s ease-out;
  }

  .avatar {
    position: absolute;
    top: 6px;
    left: 6px;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--bg-secondary);
  }

  .score-badge {
    position: absolute;
    bottom: -5px;
    right: -5px;
    background: #22c55e;
    color: #fff;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.15rem 0.4rem;
    border-radius: 8px;
    border: 2px solid var(--bg-primary);
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info h4 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .handle {
    font-size: 0.875rem;
    color: var(--primary);
    font-weight: 500;
  }

  .role {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .skills-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    padding: 1rem;
    border-radius: var(--radius);
  }

  .skills-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .skills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .skill-tag {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.35rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .connect-btn {
    width: 100%;
    margin-top: auto;
  }
</style>
