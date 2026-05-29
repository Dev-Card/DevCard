<script lang="ts">
  let isConnected = $state(false);
  let isConnecting = $state(false);
  let selectedWallet = $state('');
  let walletAddress = $state('');
  let ensName = $state('');
  let balance = $state('0.00');
  let network = $state('Ethereum');
  let showDropdown = $state(false);

  const wallets = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', balance: '4.29 ETH', ens: 'bhuvanesh.eth', address: '0x71C2b8429b63483bF6C0a38B6a41C6b377b63a9b' },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: '🛡️', balance: '12.45 ETH', ens: 'bhuvanesh.cb.id', address: '0x32A5c918cDe82a9F08D1E690f3671207e9d72B28' },
    { id: 'phantom', name: 'Phantom', icon: '👻', balance: '88.50 SOL', ens: 'bhuvanesh.sol', address: 'BhuV429PhaNTomXyZ8a9bDevCard1111111111111' },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🌐', balance: '254.80 USDC', ens: 'bhuvanesh.eth', address: '0x9E21fC18E9dD7f42d13C5d71c429D8b7b83b63a9' }
  ];

  const networks = [
    { name: 'Ethereum', symbol: 'ETH', icon: '🔷' },
    { name: 'Polygon', symbol: 'POL', icon: '💜' },
    { name: 'Arbitrum', symbol: 'ETH', icon: '🌀' },
    { name: 'Solana', symbol: 'SOL', icon: '☀️' }
  ];

  function selectWallet(walletId: string) {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) return;

    isConnecting = true;
    selectedWallet = wallet.name;

    setTimeout(() => {
      isConnected = true;
      isConnecting = false;
      walletAddress = wallet.address;
      ensName = wallet.ens;
      balance = wallet.balance;
      if (walletId === 'phantom') {
        network = 'Solana';
      } else {
        network = 'Ethereum';
      }
    }, 1500);
  }

  function disconnect() {
    isConnected = false;
    walletAddress = '';
    ensName = '';
    balance = '0.00';
    selectedWallet = '';
  }

  function changeNetwork(netName: string) {
    network = netName;
    showDropdown = false;
    
    // Update balance mock representation
    if (netName === 'Solana') {
      balance = '88.50 SOL';
    } else if (netName === 'Polygon') {
      balance = '1,842.10 POL';
    } else if (netName === 'Arbitrum') {
      balance = '4.29 ETH (L2)';
    } else {
      balance = '4.29 ETH';
    }
  }

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    alert('Wallet address copied to clipboard!');
  }
</script>

<div class="wallet-connector glass">
  <div class="card-header">
    <div class="header-title">
      <span class="icon">🔌</span>
      <h3>Web3 Identity Portal</h3>
    </div>
    {#if isConnected}
      <span class="status-badge active">Connected</span>
    {:else if isConnecting}
      <span class="status-badge connecting">Connecting...</span>
    {:else}
      <span class="status-badge inactive">Disconnected</span>
    {/if}
  </div>

  <div class="content-body">
    {#if !isConnected && !isConnecting}
      <p class="description">Link your crypto wallet to anchor your developer identity and showcase ZK skills & NFTs.</p>
      
      <div class="wallet-options">
        {#each wallets as wallet}
          <button class="wallet-btn" onclick={() => selectWallet(wallet.id)}>
            <span class="wallet-icon">{wallet.icon}</span>
            <span class="wallet-name">{wallet.name}</span>
            <span class="arrow">→</span>
          </button>
        {/each}
      </div>
    {:else if isConnecting}
      <div class="connecting-loader">
        <div class="spinner"></div>
        <p>Connecting to {selectedWallet}...</p>
        <span class="subtext">Awaiting signature approval in your wallet extension.</span>
      </div>
    {:else}
      <!-- Connected State -->
      <div class="connected-state">
        <div class="identity-badge">
          <div class="avatar-holder">
            <span class="wallet-avatar">🧬</span>
          </div>
          <div class="identity-info">
            <h4 class="ens-domain">{ensName || 'No ENS Domain'}</h4>
            <div class="address-container">
              <span class="address">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              <button class="copy-btn" onclick={copyAddress} title="Copy Address">📋</button>
            </div>
          </div>
        </div>

        <div class="network-selector">
          <span class="label">Active Network</span>
          <div class="network-dropdown-container">
            <button class="network-btn" onclick={() => showDropdown = !showDropdown}>
              <span>{networks.find(n => n.name === network)?.icon || '🔷'} {network}</span>
              <span class="chevron">{showDropdown ? '▲' : '▼'}</span>
            </button>
            {#if showDropdown}
              <div class="network-dropdown glass">
                {#each networks as net}
                  <button class="dropdown-item" onclick={() => changeNetwork(net.name)}>
                    <span>{net.icon} {net.name}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <div class="balance-display">
          <span class="label">Account Balance</span>
          <h2 class="balance-value gradient-text">{balance}</h2>
        </div>

        <button class="disconnect-btn" onclick={disconnect}>
          Disconnect Wallet
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .wallet-connector {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    height: 100%;
    min-height: 380px;
    justify-content: space-between;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-title .icon {
    font-size: 1.25rem;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .status-badge {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-badge.active {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .status-badge.connecting {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
    animation: pulse 1.5s infinite alternate;
  }

  .status-badge.inactive {
    background: rgba(148, 163, 184, 0.15);
    color: #94a3b8;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .content-body {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
  }

  .description {
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .wallet-options {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }

  .wallet-btn {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: var(--radius);
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition: var(--theme-transition);
  }

  .wallet-btn:hover {
    background: rgba(99, 102, 241, 0.08);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateX(4px);
  }

  .wallet-icon {
    font-size: 1.25rem;
    margin-right: 0.75rem;
  }

  .wallet-name {
    font-size: 0.9rem;
    font-weight: 600;
    flex-grow: 1;
  }

  .arrow {
    font-size: 0.9rem;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .wallet-btn:hover .arrow {
    opacity: 1;
  }

  .connecting-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem 0;
    gap: 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.05);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .connecting-loader p {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .connecting-loader .subtext {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* Connected UI */
  .connected-state {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .identity-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 0.75rem;
    border-radius: var(--radius);
  }

  .avatar-holder {
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .identity-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .ens-domain {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .address-container {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .address {
    font-size: 0.75rem;
    font-family: monospace;
    color: var(--text-muted);
  }

  .copy-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .copy-btn:hover {
    opacity: 1;
  }

  .network-selector {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 600;
  }

  .network-dropdown-container {
    position: relative;
  }

  .network-btn {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.85rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }

  .network-btn:hover {
    border-color: rgba(99, 102, 241, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }

  .chevron {
    font-size: 0.6rem;
    color: var(--text-muted);
  }

  .network-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 10;
    border-radius: var(--radius);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0.25rem;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    border-radius: calc(var(--radius) * 0.7);
    color: var(--text-primary);
    font-size: 0.85rem;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;
  }

  .dropdown-item:hover {
    background: rgba(99, 102, 241, 0.15);
  }

  .balance-display {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .balance-value {
    font-size: 1.75rem;
    font-weight: 800;
  }

  .disconnect-btn {
    width: 100%;
    padding: 0.7rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius);
    color: #ef4444;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: var(--theme-transition);
  }

  .disconnect-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    transform: translateY(-1px);
  }

  @keyframes pulse {
    from { opacity: 0.8; }
    to { opacity: 1; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
