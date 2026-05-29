<script lang="ts">
  let selectedCredential = $state<any>(null);
  let showProofModal = $state(false);

  const credentials = [
    {
      id: 'ts-senior',
      title: 'Senior TypeScript Architect',
      issuer: 'W3C Developer Registry',
      type: 'ZK-Skill Proof (zk-SNARK)',
      verifiedAt: '2026-05-15',
      status: 'Verified',
      hash: 'did:devcard:0x71C2b8429b63483bF/credentials/ts-senior-zk-991f82b',
      details: {
        schema: 'https://schema.org/EducationalOccupationalCredential',
        subject: '0x71C2b8429b63483bF6C0a38B6a41C6b377b63a9b',
        assertions: {
          typescriptScore: '98/100',
          advancedPatternsApproved: true,
          typeSafetyIndex: '99.8%'
        },
        proof: {
          verificationMethod: 'Ed25519VerificationKey2020',
          signatureValue: 'MEYCIQDR3mCqfV+10Z...oR9uW3N0mYcAwIhAOtH4yG42n'
        }
      }
    },
    {
      id: 'svelte-expert',
      title: 'Svelte 5 Architecture Master',
      issuer: 'DevCard Protocol',
      type: 'Soulbound Attestation (ERC-5173)',
      verifiedAt: '2026-05-28',
      status: 'Verified',
      hash: 'did:devcard:0x71C2b8429b63483bF/credentials/svelte-master-sbt-220a',
      details: {
        schema: 'https://devcard.id/schemas/SvelteMasteryAttestation',
        subject: '0x71C2b8429b63483bF6C0a38B6a41C6b377b63a9b',
        assertions: {
          runesMastery: 'Expert',
          reactivityModelScore: '100/100',
          dashboardScaleLimit: '10+ systems loaded'
        },
        proof: {
          verificationMethod: 'EcdsaSecp256k1Signature2019',
          signatureValue: '0x3a4b92cde8f112bb9...f1f3a2b72c918c5e00'
        }
      }
    },
    {
      id: 'solidity-audit',
      title: 'Smart Contract Security Auditor',
      issuer: 'ConsenSys Academy',
      type: 'ECDSA Signature',
      verifiedAt: '2026-04-10',
      status: 'Verified',
      hash: 'did:devcard:0x71C2b8429b63483bF/credentials/solidity-audit-ecdsa-843c',
      details: {
        schema: 'https://schema.org/Course',
        subject: '0x71C2b8429b63483bF6C0a38B6a41C6b377b63a9b',
        assertions: {
          courseCode: 'SEC-301',
          reentrancyProtectionMastered: true,
          fuzzingExperienceHours: 120
        },
        proof: {
          verificationMethod: 'Secp256k1VerificationKey2018',
          signatureValue: '0x9923bcdefa8439ac12...3a8b7c6c5d4e3f2a1b'
        }
      }
    }
  ];

  function openProof(cred: any) {
    selectedCredential = cred;
    showProofModal = true;
  }

  function closeProof() {
    showProofModal = false;
    selectedCredential = null;
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    alert('Cryptographic signature copied to clipboard!');
  }
</script>

<div class="verifiable-credentials glass">
  <div class="card-header">
    <span class="header-icon">🛡️</span>
    <div class="title-area">
      <h3>ZK Skill Credentials</h3>
      <span class="sub">W3C Decentralized Identifiers (DIDs)</span>
    </div>
  </div>

  <div class="credentials-list">
    {#each credentials as cred}
      <div class="credential-item">
        <div class="item-main">
          <div class="info-block">
            <h4 class="cred-title">{cred.title}</h4>
            <span class="cred-issuer">{cred.issuer} • <span class="cred-type">{cred.type}</span></span>
          </div>
          <span class="status-indicator">
            <span class="shield-icon">🛡️</span>
            Verified
          </span>
        </div>
        
        <div class="item-footer">
          <span class="did-hash">{cred.hash.slice(0, 32)}...</span>
          <button class="verify-detail-btn" onclick={() => openProof(cred)}>
            Inspect Cryptographic Proof
          </button>
        </div>
      </div>
    {/each}
  </div>

  {#if showProofModal && selectedCredential}
    <div class="modal-overlay" onclick={closeProof}>
      <div class="modal-content glass" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h4>Cryptographic Verification Manifest</h4>
          <button class="close-btn" onclick={closeProof}>×</button>
        </div>
        <div class="modal-body">
          <div class="meta-info">
            <p><strong>Subject DID:</strong> <code>did:ethr:{selectedCredential.details.subject.slice(0, 10)}...</code></p>
            <p><strong>Issuing Proof Method:</strong> <code>{selectedCredential.details.proof.verificationMethod}</code></p>
            <p><strong>Verification Status:</strong> <span class="status-valid">✓ SIGNATURE VALID</span></p>
          </div>
          
          <div class="payload-box">
            <div class="payload-header">
              <span>Verified Assertions (JSON)</span>
              <button class="copy-payload-btn" onclick={() => copyText(JSON.stringify(selectedCredential.details, null, 2))}>
                Copy JSON
              </button>
            </div>
            <pre><code>{JSON.stringify(selectedCredential.details, null, 2)}</code></pre>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .verifiable-credentials {
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

  .credentials-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    max-height: 280px;
    padding-right: 4px;
  }

  .credential-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    padding: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: var(--theme-transition);
  }

  .credential-item:hover {
    background: rgba(99, 102, 241, 0.04);
    border-color: rgba(99, 102, 241, 0.2);
    transform: translateY(-1px);
  }

  .item-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .info-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .cred-title {
    font-size: 0.925rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .cred-issuer {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .cred-type {
    color: var(--accent);
    font-weight: 500;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .shield-icon {
    font-size: 0.75rem;
  }

  .item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    padding-top: 0.6rem;
  }

  .did-hash {
    font-size: 0.7rem;
    font-family: monospace;
    color: var(--text-muted);
  }

  .verify-detail-btn {
    background: transparent;
    border: none;
    color: var(--primary);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
    transition: color 0.2s;
  }

  .verify-detail-btn:hover {
    color: var(--accent);
    text-decoration: underline;
  }

  /* Modal Styles */
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
    max-width: 550px;
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
    gap: 1rem;
  }

  .meta-info {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .meta-info code {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-family: monospace;
    color: var(--text-primary);
  }

  .status-valid {
    color: #22c55e;
    font-weight: 800;
    letter-spacing: 0.05em;
  }

  .payload-box {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .payload-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .copy-payload-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
    transition: var(--theme-transition);
  }

  .copy-payload-btn:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }

  pre {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: var(--radius);
    max-height: 220px;
    overflow-y: auto;
  }

  code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8rem;
    color: #38bdf8;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
