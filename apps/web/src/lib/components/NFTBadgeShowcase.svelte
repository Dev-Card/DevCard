<script lang="ts">
  let hoveredBadgeId = $state<string | null>(null);
  let selectedBadge = $state<any>(null);

  const badges = [
    {
      id: 'genesis-contrib',
      title: 'Genesis Contributor',
      emoji: '🛸',
      grad: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
      desc: 'Awarded to developers who committed code during the DevCard genesis phase.',
      contract: '0x881C...92a1',
      tokenId: '#4209',
      standard: 'ERC-721',
      mintDate: '2026-02-14'
    },
    {
      id: 'gas-opt',
      title: 'Gas Optimizer Elite',
      emoji: '⚡',
      grad: 'linear-gradient(135deg, #10b981, #06b6d4)',
      desc: 'Optimized smart contracts reducing execution gas costs by over 45%.',
      contract: '0x10FA...77b1',
      tokenId: '#0182',
      standard: 'ERC-1155',
      mintDate: '2026-04-19'
    },
    {
      id: 'dao-gov',
      title: 'DAO Governance Titan',
      emoji: '🏛️',
      grad: 'linear-gradient(135deg, #f59e0b, #e11d48)',
      desc: 'Authored and successfully passed 3 critical governance proposals.',
      contract: '0x99A3...112c',
      tokenId: '#0054',
      standard: 'ERC-721',
      mintDate: '2026-05-01'
    },
    {
      id: 'oss-hero',
      title: 'OSS Legend Attestation',
      emoji: '👑',
      grad: 'linear-gradient(135deg, #a855f7, #3b82f6)',
      desc: 'Secured 5,000+ GitHub stars across public Web3 open-source libraries.',
      contract: '0x5C91...cde8',
      tokenId: '#0007',
      standard: 'ERC-721',
      mintDate: '2026-05-25'
    }
  ];

  function openBadge(badge: any) {
    selectedBadge = badge;
  }

  function closeBadge() {
    selectedBadge = null;
  }
</script>

<div class="nft-showcase glass">
  <div class="card-header">
    <span class="header-icon">🏆</span>
    <div class="title-area">
      <h3>NFT Achievement Gallery</h3>
      <span class="sub">Verified On-Chain Developer Badges</span>
    </div>
  </div>

  <div class="badges-grid">
    {#each badges as badge}
      <button 
        class="badge-card" 
        style="--badge-gradient: {badge.grad};"
        onmouseenter={() => hoveredBadgeId = badge.id}
        onmouseleave={() => hoveredBadgeId = null}
        onclick={() => openBadge(badge)}
      >
        <div class="hologram-effect {hoveredBadgeId === badge.id ? 'active' : ''}"></div>
        <div class="badge-emoji-wrapper">
          <span class="badge-emoji">{badge.emoji}</span>
        </div>
        <h4 class="badge-title">{badge.title}</h4>
        <span class="badge-token">{badge.standard} • {badge.tokenId}</span>
      </button>
    {/each}
  </div>

  {#if selectedBadge}
    <div class="modal-overlay" onclick={closeBadge}>
      <div class="modal-content glass" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h4>Badge Metadata Inspector</h4>
          <button class="close-btn" onclick={closeBadge}>×</button>
        </div>
        <div class="modal-body">
          <div class="badge-preview-large" style="background: {selectedBadge.grad}">
            <span class="large-emoji">{selectedBadge.emoji}</span>
            <div class="badge-reflection"></div>
          </div>
          <div class="badge-details-info">
            <h3 class="title">{selectedBadge.title}</h3>
            <p class="description">{selectedBadge.desc}</p>
            
            <div class="spec-table">
              <div class="spec-row">
                <span class="spec-label">Token Standard</span>
                <span class="spec-val">{selectedBadge.standard}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Token ID</span>
                <span class="spec-val">{selectedBadge.tokenId}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Contract Address</span>
                <span class="spec-val code-address">{selectedBadge.contract}</span>
              </div>
              <div class="spec-row">
                <span class="spec-label">Minted On</span>
                <span class="spec-val">{selectedBadge.mintDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .nft-showcase {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    height: 100%;
    min-height: 380px;
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

  .badges-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.85rem;
    flex-grow: 1;
  }

  .badge-card {
    position: relative;
    border-radius: var(--radius);
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    cursor: pointer;
    overflow: hidden;
    color: var(--text-primary);
    transition: var(--theme-transition);
  }

  .badge-card:hover {
    transform: translateY(-4px) scale(1.02);
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 10px 25px -10px var(--accent-glow);
  }

  .badge-emoji-wrapper {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--badge-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 6px 15px -3px rgba(0, 0, 0, 0.3);
  }

  .badge-emoji {
    font-size: 1.6rem;
  }

  .badge-title {
    font-size: 0.8rem;
    font-weight: 700;
    text-align: center;
    margin: 0;
    max-width: 110px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .badge-token {
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  /* Hologram animation effect */
  .hologram-effect {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      115deg,
      transparent 20%,
      rgba(255, 255, 255, 0.08) 40%,
      rgba(255, 255, 255, 0.18) 50%,
      rgba(255, 255, 255, 0.08) 60%,
      transparent 80%
    );
    transform: rotate(25deg) translate(-20%, -20%);
    transition: transform 0.8s cubic-bezier(0.1, 0.8, 0.3, 1);
    pointer-events: none;
  }

  .badge-card:hover .hologram-effect {
    transform: rotate(25deg) translate(20%, 20%);
  }

  /* Modal Details */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal-content {
    width: 90%;
    max-width: 480px;
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 0.75rem;
  }

  .modal-header h4 {
    font-size: 1.1rem;
    color: var(--text-primary);
    margin: 0;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    transition: color 0.2s;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
  }

  .badge-preview-large {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 10px 30px -5px rgba(0,0,0,0.5);
    border: 2px solid rgba(255,255,255,0.25);
  }

  .large-emoji {
    font-size: 3.5rem;
    z-index: 2;
  }

  .badge-reflection {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.4) 0%,
      transparent 50%,
      rgba(0, 0, 0, 0.2) 100%
    );
    z-index: 3;
    pointer-events: none;
  }

  .badge-details-info {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .badge-details-info .title {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--text-primary);
    text-align: center;
  }

  .badge-details-info .description {
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-align: center;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  }

  .spec-table {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    background: rgba(0,0,0,0.15);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    border: 1px solid rgba(255,255,255,0.03);
  }

  .spec-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
  }

  .spec-label {
    color: var(--text-muted);
    font-weight: 500;
  }

  .spec-val {
    color: var(--text-primary);
    font-weight: 700;
  }

  .code-address {
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--accent);
  }
</style>
