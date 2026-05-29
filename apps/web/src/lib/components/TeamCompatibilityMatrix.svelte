<script lang="ts">
  let selectedMemberId = $state<string | null>(null);

  const teamMembers = [
    {
      id: 'alice',
      name: 'Alice (Tech Lead)',
      role: 'Frontend Architect',
      overallScore: 94,
      traits: { technical: 98, communication: 90, culture: 92, speed: 96 },
      notes: 'Strong overlap in JavaScript/Svelte. Highly synchronized execution patterns.'
    },
    {
      id: 'bob',
      name: 'Bob (Product Manager)',
      role: 'Growth PM',
      overallScore: 82,
      traits: { technical: 65, communication: 95, culture: 90, speed: 88 },
      notes: 'Excellent roadmap communication, slightly divergent priorities on refactoring vs features.'
    },
    {
      id: 'charlie',
      name: 'Charlie (DevOps Lead)',
      role: 'Platform Engineer',
      overallScore: 88,
      traits: { technical: 92, communication: 80, culture: 85, speed: 95 },
      notes: 'Strong alignment on CI/CD automation, clean Git workflows, and deployment cycles.'
    },
    {
      id: 'diana',
      name: 'Diana (QA Lead)',
      role: 'SDET Specialist',
      overallScore: 91,
      traits: { technical: 88, communication: 94, culture: 92, speed: 90 },
      notes: 'Very high sync on test coverage priorities, unit testing strategies, and bug triage.'
    }
  ];

  let selectedMember = $derived(teamMembers.find(m => m.id === selectedMemberId));
</script>

<div class="team-matrix glass">
  <div class="card-header">
    <span class="header-icon">🤝</span>
    <div class="title-area">
      <h3>Team Compatibility Matrix</h3>
      <span class="sub">AI-Powered Synergy & Trait Alignment</span>
    </div>
  </div>

  <div class="matrix-grid">
    {#each teamMembers as member}
      <button 
        class="member-row {selectedMemberId === member.id ? 'active' : ''}"
        onclick={() => selectedMemberId = selectedMemberId === member.id ? null : member.id}
      >
        <div class="member-header">
          <div class="member-name-group">
            <span class="name">{member.name}</span>
            <span class="role">{member.role}</span>
          </div>
          <div class="score-badge" style="--score-color: {member.overallScore >= 90 ? '#10b981' : '#6366f1'}">
            {member.overallScore}%
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-fill" style="width: {member.overallScore}%; background: {member.overallScore >= 90 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : 'linear-gradient(90deg, #6366f1, #a855f7)'}"></div>
        </div>
      </button>
    {/each}
  </div>

  <div class="detail-panel">
    {#if selectedMember}
      <div class="panel-content">
        <h4 class="detail-title">Trait Breakdown: {selectedMember.name}</h4>
        
        <div class="traits-grid">
          <div class="trait-item">
            <span class="label">Technical</span>
            <span class="value">{selectedMember.traits.technical}%</span>
          </div>
          <div class="trait-item">
            <span class="label">Communication</span>
            <span class="value">{selectedMember.traits.communication}%</span>
          </div>
          <div class="trait-item">
            <span class="label">Culture</span>
            <span class="value">{selectedMember.traits.culture}%</span>
          </div>
          <div class="trait-item">
            <span class="label">Execution Speed</span>
            <span class="value">{selectedMember.traits.speed}%</span>
          </div>
        </div>

        <p class="notes">💡 <em>{selectedMember.notes}</em></p>
      </div>
    {:else}
      <div class="placeholder-content">
        <p>Select a team member above to analyze granular alignment metrics.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .team-matrix {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    height: 100%;
    min-height: 380px;
    justify-content: space-between;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-icon {
    font-size: 1.5rem;
  }

  .title-area {
    display: flex;
    flex-direction: column;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .sub {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .matrix-grid {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .member-row {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: var(--radius);
    padding: 0.65rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    cursor: pointer;
    text-align: left;
    color: var(--text-primary);
    transition: var(--theme-transition);
  }

  .member-row:hover {
    background: rgba(99, 102, 241, 0.04);
    border-color: rgba(99, 102, 241, 0.2);
  }

  .member-row.active {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.35);
  }

  .member-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .member-name-group {
    display: flex;
    flex-direction: column;
  }

  .name {
    font-size: 0.85rem;
    font-weight: 700;
  }

  .role {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .score-badge {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--score-color);
  }

  .progress-bar-container {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 999px;
  }

  .detail-panel {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 0.85rem;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .detail-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .traits-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .trait-item {
    display: flex;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.15);
    padding: 0.35rem 0.6rem;
    border-radius: 6px;
    font-size: 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.03);
  }

  .trait-item .label {
    color: var(--text-muted);
  }

  .trait-item .value {
    font-weight: 700;
    color: var(--text-primary);
  }

  .notes {
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.35;
  }

  .placeholder-content {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.75rem;
  }
</style>
