<script lang="ts">
  let capacityUsed = $state(80);
  let hoveredProject = $state<string | null>(null);

  const projects = [
    { id: 'fe-refactor', name: 'Frontend Refactor', allocation: 35, status: 'On Track', color: '#6366f1', count: '14 issues' },
    { id: 'sec-audit', name: 'API Security Audit', allocation: 25, status: 'Critical Path', color: '#ec4899', count: '4 audits' },
    { id: 'cicd-opt', name: 'CI/CD Speedup', allocation: 20, status: 'In Progress', color: '#10b981', count: '3 pipelines' },
    { id: 'reviews', name: 'PR Reviews & Mentor', allocation: 20, status: 'Ongoing', color: '#a855f7', count: '18 reviews' }
  ];
</script>

<div class="workload-dist glass">
  <div class="card-header">
    <span class="header-icon">📊</span>
    <div class="title-area">
      <h3>Active Workload Distribution</h3>
      <span class="sub">Weekly Allocation & Project Health</span>
    </div>
  </div>

  <div class="capacity-bar-area">
    <div class="capacity-header">
      <span class="label">Total Allocation</span>
      <span class="value {capacityUsed >= 90 ? 'critical' : ''}">{capacityUsed}% Capacity</span>
    </div>
    
    <div class="segmented-bar">
      {#each projects as project}
        <div 
          class="segment" 
          style="width: {project.allocation}%; background-color: {project.color};"
          title="{project.name}: {project.allocation}%"
          onmouseenter={() => hoveredProject = project.id}
          onmouseleave={() => hoveredProject = null}
        ></div>
      {/each}
    </div>
  </div>

  <div class="project-breakdown">
    {#each projects as project}
      <div 
        class="project-row {hoveredProject === project.id ? 'highlight' : ''}"
        onmouseenter={() => hoveredProject = project.id}
        onmouseleave={() => hoveredProject = null}
      >
        <div class="left-side">
          <span class="color-dot" style="background-color: {project.color};"></span>
          <div class="name-group">
            <span class="name">{project.name}</span>
            <span class="count">{project.count}</span>
          </div>
        </div>

        <div class="right-side">
          <span class="allocation">{project.allocation}%</span>
          <span class="status-badge {project.status.toLowerCase().replace(' ', '-')}">
            {project.status}
          </span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .workload-dist {
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

  .capacity-bar-area {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .capacity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }

  .capacity-header .label {
    color: var(--text-muted);
    font-weight: 600;
  }

  .capacity-header .value {
    font-weight: 800;
    color: #10b981;
  }

  .capacity-header .value.critical {
    color: #ef4444;
  }

  .segmented-bar {
    width: 100%;
    height: 12px;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    background: rgba(255, 255, 255, 0.05);
  }

  .segment {
    height: 100%;
    transition: transform 0.2s ease, opacity 0.2s ease;
    cursor: pointer;
  }

  .segment:hover {
    transform: scaleY(1.2);
    opacity: 0.95;
  }

  .project-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .project-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: var(--radius);
    transition: var(--theme-transition);
  }

  .project-row.highlight {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .left-side {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .name-group {
    display: flex;
    flex-direction: column;
  }

  .name {
    font-size: 0.8rem;
    font-weight: 700;
  }

  .count {
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  .right-side {
    display: flex;
    align-items: center;
    gap: 0.60rem;
  }

  .allocation {
    font-size: 0.8rem;
    font-weight: 800;
  }

  .status-badge {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }

  .status-badge.on-track { background: rgba(16, 185, 129, 0.1); color: #10b981; }
  .status-badge.critical-path { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
  .status-badge.in-progress { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
  .status-badge.ongoing { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
</style>
