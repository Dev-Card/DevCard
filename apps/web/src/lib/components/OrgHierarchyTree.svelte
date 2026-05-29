<script lang="ts">
  let selectedNodeId = $state<string | null>(null);

  const hierarchyNodes = [
    { id: 'vp', name: 'Marcus Vance', role: 'VP of Engineering', level: 1, avatar: '👔', department: 'Product Engineering' },
    { id: 'director', name: 'Sarah Lin', role: 'Director of Platforms', level: 2, avatar: '👩‍💼', department: 'Core Infrastructure' },
    { id: 'em', name: 'David Miller', role: 'Engineering Manager', level: 3, avatar: '👨‍💻', department: 'Developer Experience' },
    { id: 'lead', name: 'Alice Thorne', role: 'Tech Lead / Frontend', level: 4, avatar: '👩‍🎨', department: 'DevCard Ecosystem' },
    { id: 'me', name: 'Bhuvanesh S (You)', role: 'Senior Developer', level: 5, avatar: '🧬', department: 'DevCard Ecosystem', isSelf: true }
  ];

  let selectedNode = $derived(hierarchyNodes.find(n => n.id === selectedNodeId));
</script>

<div class="org-hierarchy glass">
  <div class="card-header">
    <span class="header-icon">🌳</span>
    <div class="title-area">
      <h3>Organization Hierarchy</h3>
      <span class="sub">Reporting Lines & Org Architecture</span>
    </div>
  </div>

  <div class="tree-container">
    <div class="tree-nodes">
      {#each hierarchyNodes as node, index}
        <div class="node-wrapper">
          {#if index > 0}
            <div class="connector-line"></div>
          {/if}
          
          <button 
            class="tree-node {node.isSelf ? 'self' : ''} {selectedNodeId === node.id ? 'selected' : ''}"
            onclick={() => selectedNodeId = selectedNodeId === node.id ? null : node.id}
          >
            <span class="avatar">{node.avatar}</span>
            <div class="info">
              <span class="name">{node.name}</span>
              <span class="role">{node.role}</span>
            </div>
            {#if node.isSelf}
              <span class="self-tag">You</span>
            {/if}
          </button>
        </div>
      {/each}
    </div>
  </div>

  <div class="node-details">
    {#if selectedNode}
      <div class="details-card">
        <div class="details-header">
          <span class="avatar-large">{selectedNode.avatar}</span>
          <div class="details-name-group">
            <h4>{selectedNode.name}</h4>
            <span class="details-role">{selectedNode.role}</span>
          </div>
        </div>
        <div class="details-body">
          <div class="detail-row">
            <span class="label">Department:</span>
            <span class="value">{selectedNode.department}</span>
          </div>
          <div class="detail-row">
            <span class="label">Level:</span>
            <span class="value">L{selectedNode.level} (Org tier)</span>
          </div>
        </div>
      </div>
    {:else}
      <p class="placeholder">Select a node in the org tree to inspect staff profile details.</p>
    {/if}
  </div>
</div>

<style>
  .org-hierarchy {
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

  .tree-container {
    flex-grow: 1;
    overflow-y: auto;
    max-height: 200px;
    padding: 0.5rem;
    display: flex;
    justify-content: center;
  }

  .tree-nodes {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .node-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .connector-line {
    width: 2px;
    height: 15px;
    background: rgba(255, 255, 255, 0.08);
  }

  .tree-node {
    width: 85%;
    max-width: 240px;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: var(--radius);
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    position: relative;
    transition: var(--theme-transition);
  }

  .tree-node:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .tree-node.selected {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.35);
  }

  .tree-node.self {
    border-color: rgba(168, 85, 247, 0.4);
    background: rgba(168, 85, 247, 0.04);
  }

  .tree-node.self.selected {
    background: rgba(168, 85, 247, 0.08);
    border-color: rgba(168, 85, 247, 0.5);
  }

  .avatar {
    font-size: 1.1rem;
  }

  .info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
  }

  .name {
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .role {
    font-size: 0.65rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .self-tag {
    font-size: 0.6rem;
    background: rgba(168, 85, 247, 0.2);
    color: #a855f7;
    font-weight: 800;
    padding: 0.1rem 0.35rem;
    border-radius: 999px;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }

  .node-details {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 0.85rem;
    min-height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .details-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .details-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .avatar-large {
    font-size: 1.8rem;
  }

  .details-name-group h4 {
    font-size: 0.9rem;
    margin: 0;
  }

  .details-role {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .details-body {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    background: rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.03);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }

  .detail-row .label {
    color: var(--text-muted);
  }

  .detail-row .value {
    font-weight: 700;
    color: var(--text-primary);
  }

  .placeholder {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
  }
</style>
