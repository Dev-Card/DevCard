<script lang="ts">
  import { PLATFORMS, getAllPlatforms, getProfileUrl } from '@devcard/shared';
  import { apiFetch } from '$lib/api';
  import { onMount } from 'svelte';

  let { data } = $props();
  const initialUser = data.user;

  // ─── Reactive Runes State ───
  let user = $state({ ...initialUser });
  let links = $state([...(initialUser?.platformLinks || [])]);
  let isSavingUser = $state(false);
  let isSavingLinks = $state(false);
  
  // Platform Add Dialog Form
  let isModalOpen = $state(false);
  let selectedPlatform = $state('github');
  let linkUsername = $state('');
  let linkCustomUrl = $state('');
  let addError = $state('');

  // Toast System
  let toasts = $state<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  let toastId = 0;

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = toastId++;
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, 4000);
  }

  // Derived Computed Values
  const availablePlatforms = $derived(
    getAllPlatforms().filter((p) => {
      if (p.id === 'custom') return true;
      // Filter out platforms already added (duplicate prevention)
      return !links.some((l) => l.platform === p.id);
    })
  );

  const selectedPlatformDef = $derived(PLATFORMS[selectedPlatform]);

  // Accent glow variables
  const accentGlow = $derived(`radial-gradient(circle at 50% 50%, ${user.accentColor}25, transparent 65%)`);

  // ─── Profile Customs Saving ───
  async function handleProfileSave(e: SubmitEvent) {
    e.preventDefault();
    isSavingUser = true;
    try {
      const updated = await apiFetch('/api/profiles/me', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: user.displayName,
          role: user.role,
          company: user.company,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          accentColor: user.accentColor,
          pronouns: user.pronouns || ''
        }),
      });
      user = { ...user, ...updated };
      showToast('Profile information successfully saved!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile details', 'error');
    } finally {
      isSavingUser = false;
    }
  }

  // ─── Platform Links Manager ───
  async function handleAddLink(e: SubmitEvent) {
    e.preventDefault();
    addError = '';

    if (!linkUsername.trim() && !selectedPlatformDef.usesFullUrl) {
      addError = 'Please specify a profile username or handle.';
      return;
    }

    if (selectedPlatformDef.usesFullUrl && !linkCustomUrl.trim()) {
      addError = 'Please specify a profile URL.';
      return;
    }

    isSavingLinks = true;
    try {
      const payload: any = {
        platform: selectedPlatform,
        username: selectedPlatformDef.usesFullUrl ? 'link' : linkUsername.trim(),
      };

      if (selectedPlatformDef.usesFullUrl) {
        payload.url = linkCustomUrl.trim();
        // Fallback username for display
        payload.username = linkCustomUrl.trim().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      }

      const newLink = await apiFetch('/api/profiles/me/links', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      links = [...links, newLink].sort((a, b) => a.displayOrder - b.displayOrder);
      showToast(`${selectedPlatformDef.name} link registered!`);
      
      // Reset form
      linkUsername = '';
      linkCustomUrl = '';
      isModalOpen = false;
    } catch (err: any) {
      addError = err.message || 'Failed to add platform link';
      showToast(addError, 'error');
    } finally {
      isSavingLinks = false;
    }
  }

  async function handleDeleteLink(id: string, platformName: string) {
    if (!confirm(`Are you sure you want to remove the ${platformName} link?`)) return;

    try {
      await apiFetch(`/api/profiles/me/links/${id}`, {
        method: 'DELETE',
      });
      links = links.filter((l) => l.id !== id);
      showToast(`${platformName} link successfully deleted.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete link', 'error');
    }
  }

  async function moveLink(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    // Swap elements
    const listCopy = [...links];
    const temp = listCopy[index];
    listCopy[index] = listCopy[targetIndex];
    listCopy[targetIndex] = temp;

    // Update display orders locally
    const reordered = listCopy.map((link, i) => ({
      ...link,
      displayOrder: i,
    }));

    // Optimistic UI state update
    links = reordered;

    try {
      await apiFetch('/api/profiles/me/links/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          links: reordered.map((l) => ({ id: l.id, displayOrder: l.displayOrder })),
        }),
      });
      showToast('Profile order updated.');
    } catch (err: any) {
      showToast(err.message || 'Failed to persist order change', 'error');
    }
  }

  // ─── Sharing & Exporters ───
  function copyPublicLink() {
    const profileUrl = `${window.location.origin}/u/${user.username}`;
    navigator.clipboard.writeText(profileUrl)
      .then(() => showToast('Public DevCard URL copied to clipboard!'))
      .catch(() => showToast('Failed to copy. URL: ' + profileUrl, 'error'));
  }

  function downloadQRCode(format: 'png' | 'svg') {
    const qrUrl = `/api/u/${user.username}/qr?format=${format}&size=500`;
    showToast(`Downloading QR code in ${format.toUpperCase()} format...`);
    
    // Create direct download trigger
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `devcard-${user.username}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
</script>

<div class="bg-gradient" style="--accent: {user.accentColor}"></div>

<div class="toasts-container">
  {#each toasts as toast (toast.id)}
    <div class="toast glass {toast.type}">
      <span class="toast-icon">{toast.type === 'success' ? '⚡' : '⚠️'}</span>
      <span class="toast-message">{toast.message}</span>
    </div>
  {/each}
</div>

<main class="dashboard-container">
  <!-- Nav Header -->
  <nav class="nav-glass glass">
    <div class="nav-content">
      <div class="logo">⚡ <span class="gradient-text">DevCard Studio</span></div>
      <div class="user-pill glass">
        {#if user.avatarUrl}
          <img src={user.avatarUrl} alt={user.displayName} class="nav-avatar" />
        {:else}
          <div class="nav-avatar-placeholder" style="background: {user.accentColor}">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        {/if}
        <span class="nav-username">@{user.username}</span>
        <a href="/" class="logout-btn">Exit</a>
      </div>
    </div>
  </nav>

  <!-- Workspace Grid Layout -->
  <div class="workspace-grid">
    
    <!-- LEFT PANEL: CUSTOMIZER -->
    <section class="panel-card glass customizer-panel">
      <div class="panel-header">
        <span class="panel-icon">🎨</span>
        <h2>Card Customizer</h2>
      </div>
      <p class="panel-desc">Fine-tune your brand colors and professional details.</p>
      
      <form onsubmit={handleProfileSave} class="studio-form">
        <div class="form-row">
          <div class="form-group">
            <label for="displayName">Display Name</label>
            <input type="text" id="displayName" bind:value={user.displayName} required placeholder="Jane Doe" />
          </div>
          <div class="form-group">
            <label for="accentColor">Glow Color</label>
            <div class="color-picker-wrapper">
              <input type="color" id="accentColor" bind:value={user.accentColor} />
              <input type="text" bind:value={user.accentColor} class="color-hex" uppercase minlength="7" maxlength="7" />
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="role">Role / Headline</label>
            <input type="text" id="role" bind:value={user.role} placeholder="Senior React Native Developer" />
          </div>
          <div class="form-group">
            <label for="company">Company</label>
            <input type="text" id="company" bind:value={user.company} placeholder="Google" />
          </div>
        </div>

        <div class="form-group">
          <label for="avatarUrl">Avatar Image URL</label>
          <input type="url" id="avatarUrl" bind:value={user.avatarUrl} placeholder="https://images.unsplash.com/... or dicebear svg" />
        </div>

        <div class="form-group">
          <label for="bio">Profile Bio</label>
          <textarea id="bio" bind:value={user.bio} rows="4" placeholder="Brief developer manifesto..."></textarea>
        </div>

        <button type="submit" class="btn-primary form-submit" disabled={isSavingUser}>
          {#if isSavingUser}Saving Profile...{:else}Update Profile ⚡{/if}
        </button>
      </form>
    </section>

    <!-- CENTER PANEL: LINK MANAGER -->
    <section class="panel-card glass link-manager-panel">
      <div class="panel-header">
        <span class="panel-icon">🔗</span>
        <h2>Unified Link Manager</h2>
      </div>
      <p class="panel-desc">Register or reorder profiles linked directly to your smart card.</p>

      <div class="link-manager-actions">
        <button class="btn-primary add-link-trigger" onclick={() => isModalOpen = true}>
          + Register Platform Link
        </button>
      </div>

      <div class="links-list-container">
        {#if links.length === 0}
          <div class="empty-state glass">
            <div class="empty-icon">📭</div>
            <h3>No profiles linked yet</h3>
            <p>Add your LeetCode, GitHub, or LinkedIn pages to get started.</p>
          </div>
        {:else}
          <div class="links-list">
            {#each links as link, index (link.id)}
              {@const platform = PLATFORMS[link.platform]}
              <div class="link-item glass" style="border-left: 3px solid {platform?.color || '#6366f1'}">
                <div class="link-badge" style="background: {platform?.color || '#6366f1'}">
                  {platform?.name.charAt(0) || link.platform.charAt(0)}
                </div>
                <div class="link-details">
                  <h4 class="link-platform-name">{platform?.name || link.platform}</h4>
                  <span class="link-username-text">@{link.username}</span>
                </div>
                
                <div class="link-controls">
                  <!-- Reordering buttons -->
                  <button class="control-btn" disabled={index === 0} onclick={() => moveLink(index, 'up')} aria-label="Move Up">▲</button>
                  <button class="control-btn" disabled={index === links.length - 1} onclick={() => moveLink(index, 'down')} aria-label="Move Down">▼</button>
                  <button class="control-btn delete-btn" onclick={() => handleDeleteLink(link.id, platform?.name || link.platform)} aria-label="Delete">🗑️</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <!-- RIGHT PANEL: LIVE CARD PREVIEW & SHARE -->
    <section class="panel-card glass preview-panel">
      <div class="panel-header">
        <span class="panel-icon">📱</span>
        <h2>Dynamic Card Live View</h2>
      </div>
      <p class="panel-desc">Real-time preview of your public identity page.</p>

      <!-- Reactive Mini DevCard Mockup -->
      <div class="mini-devcard-wrapper">
        <div class="mini-devcard glass" style="--accent: {user.accentColor}">
          <div class="card-glow" style="background: {accentGlow}"></div>
          
          <div class="card-identity">
            {#if user.avatarUrl}
              <img src={user.avatarUrl} alt={user.displayName} class="card-avatar" />
            {:else}
              <div class="card-avatar-placeholder" style="background: {user.accentColor}">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            {/if}
            <h3 class="card-displayName">{user.displayName}</h3>
            {#if user.role}
              <span class="card-role">{user.role}{user.company ? ` @ ${user.company}` : ''}</span>
            {/if}
            {#if user.bio}
              <p class="card-bio">{user.bio}</p>
            {/if}
          </div>

          <div class="card-links-scroll font-sans">
            {#if links.length === 0}
              <div class="card-empty-hint">Linked platforms will float here</div>
            {:else}
              {#each links as link (link.id)}
                {@const platform = PLATFORMS[link.platform]}
                <div class="card-mini-tile glass" style="border-left: 2px solid {platform?.color || '#6366f1'}">
                  <span class="tile-icon-circle" style="background: {platform?.color || '#6366f1'}"></span>
                  <span class="tile-label">{platform?.name || link.platform}</span>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <!-- Sharing Panel / QR Exporters -->
      <div class="sharing-controls-box glass">
        <h3>Share & Download</h3>
        <p>Copy your direct profile link or export high-resolution QR graphics for printing.</p>
        
        <div class="export-actions">
          <button class="btn-primary outline" onclick={copyPublicLink}>
            🔗 Copy DevCard Link
          </button>
          
          <div class="qr-export-group">
            <span class="qr-label">Download QR Code:</span>
            <div class="qr-buttons">
              <button onclick={() => downloadQRCode('png')} class="btn-secondary">PNG Image</button>
              <button onclick={() => downloadQRCode('svg')} class="btn-secondary">Vector SVG</button>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</main>

<!-- Platform Link Creator Dialog Modal -->
{#if isModalOpen}
  <div class="modal-backdrop" onclick={() => isModalOpen = false}>
    <div class="modal-content glass" onclick={(e) => e.stopPropagation()}>
      <header class="modal-header">
        <h3>Link Platform Profile</h3>
        <button class="close-modal-btn" onclick={() => isModalOpen = false}>×</button>
      </header>
      
      <form onsubmit={handleAddLink} class="modal-form">
        <div class="form-group">
          <label for="platformSelect">Select Developer Service</label>
          <select id="platformSelect" bind:value={selectedPlatform}>
            {#each availablePlatforms as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </div>

        {#if selectedPlatformDef}
          {#if selectedPlatformDef.usesFullUrl}
            <div class="form-group">
              <label for="customUrl">Profile Website Address (URL)</label>
              <input
                type="url"
                id="customUrl"
                placeholder={selectedPlatformDef.usernamePlaceholder}
                bind:value={linkCustomUrl}
                required
              />
            </div>
          {:else}
            <div class="form-group">
              <label for="platformUsername">{selectedPlatformDef.name} Handle / Username</label>
              <div class="modal-input-wrapper">
                {#if selectedPlatformDef.urlPattern}
                  <span class="url-pattern-prefix">
                    {selectedPlatformDef.urlPattern.split('{username}')[0]}
                  </span>
                {/if}
                <input
                  type="text"
                  id="platformUsername"
                  placeholder={selectedPlatformDef.usernamePlaceholder}
                  bind:value={linkUsername}
                  required
                />
              </div>
            </div>
          {/if}
        {/if}

        {#if addError}
          <div class="alert alert-error">{addError}</div>
        {/if}

        <div class="modal-actions">
          <button type="button" class="btn-secondary" onclick={() => isModalOpen = false}>Cancel</button>
          <button type="submit" class="btn-primary" disabled={isSavingLinks}>
            {#if isSavingLinks}Registering...{:else}Connect Profile ⚡{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .bg-gradient {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, var(--accent), transparent 50%),
                radial-gradient(circle at 100% 100%, var(--accent-glow), transparent 40%),
                var(--bg-page);
    opacity: 0.16;
    z-index: -1;
    transition: background 0.8s ease-in-out;
  }

  .toasts-container {
    position: fixed;
    top: 2rem;
    right: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    z-index: 9999;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.85rem 1.25rem;
    border-radius: var(--radius);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 40px -15px rgba(0, 0, 0, 0.5);
    background: rgba(15, 23, 42, 0.94);
    animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .toast.error {
    border-left: 3px solid #ef4444;
  }

  .toast.success {
    border-left: 3px solid #6366f1;
  }

  @keyframes toastSlideIn {
    from { opacity: 0; transform: translateX(30px) scale(0.95); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }

  .toast-icon {
    font-size: 1.15rem;
  }

  .toast-message {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .dashboard-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 3rem;
  }

  .nav-glass {
    border-radius: var(--radius-xl);
    padding: 0.85rem 1.75rem;
    margin-bottom: 2rem;
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1.35rem;
  }

  .user-pill {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.45rem 1rem;
    border-radius: 999px;
    background: var(--btn-secondary-bg);
    border: 1px solid var(--btn-secondary-border);
  }

  .nav-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
  }

  .nav-avatar-placeholder {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 800;
    color: white;
  }

  .nav-username {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .logout-btn {
    font-size: 0.82rem;
    font-weight: 700;
    color: #ef4444;
    padding-left: 0.5rem;
    border-left: 1px solid rgba(255,255,255,0.12);
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1.75rem;
    align-items: start;
  }

  @media (max-width: 1200px) {
    .workspace-grid {
      grid-template-columns: 1fr 1fr;
    }
    .preview-panel {
      grid-column: span 2;
    }
  }

  @media (max-width: 800px) {
    .workspace-grid {
      grid-template-columns: 1fr;
    }
    .preview-panel {
      grid-column: span 1;
    }
  }

  .panel-card {
    border-radius: var(--radius-xl);
    padding: 2.25rem 1.75rem;
    min-height: 520px;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .panel-icon {
    font-size: 1.6rem;
  }

  h2 {
    font-size: 1.35rem;
    font-weight: 800;
  }

  .panel-desc {
    font-size: 0.88rem;
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: 2rem;
  }

  .studio-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    flex: 1;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.1rem;
  }

  @media (max-width: 480px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  label {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input, select, textarea {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 0.8rem 0.95rem;
    border-radius: var(--radius);
    font: inherit;
    transition: all 0.2s ease;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--primary);
    background: var(--bg-primary);
    box-shadow: 0 0 0 3px var(--primary-glow);
  }

  .color-picker-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  input[type="color"] {
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 50%;
    cursor: pointer;
    background: transparent;
  }

  .color-hex {
    font-family: monospace;
    text-align: center;
    flex: 1;
  }

  textarea {
    resize: none;
  }

  .btn-primary {
    padding: 0.85rem 1.25rem;
    font-weight: 700;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px -8px #6366f1;
  }

  .btn-primary.outline {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: var(--text-primary);
  }

  .btn-primary.outline:hover {
    background: rgba(255,255,255,0.1);
    border-color: #6366f1;
  }

  .form-submit {
    margin-top: auto;
  }

  /* LINK MANAGER STYLING */
  .add-link-trigger {
    width: 100%;
    padding: 0.95rem;
    font-size: 0.92rem;
    margin-bottom: 1.5rem;
  }

  .links-list-container {
    flex: 1;
    overflow-y: auto;
    max-height: 480px;
    padding-right: 0.35rem;
  }

  .links-list-container::-webkit-scrollbar {
    width: 4px;
  }

  .links-list-container::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 99px;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1.5rem;
    border-radius: var(--radius);
    border: 1px dashed rgba(255,255,255,0.08);
  }

  .empty-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    font-size: 1.05rem;
    margin-bottom: 0.4rem;
  }

  .empty-state p {
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .link-item {
    display: flex;
    align-items: center;
    padding: 0.85rem 1.1rem;
    border-radius: var(--radius);
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    transition: all 0.2s ease;
  }

  .link-item:hover {
    background: var(--bg-primary);
    border-color: var(--primary);
  }

  .link-badge {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 800;
    font-size: 0.95rem;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  }

  .link-details {
    flex: 1;
    margin-left: 0.85rem;
    min-width: 0;
  }

  .link-platform-name {
    font-weight: 700;
    font-size: 0.92rem;
    margin-bottom: 0.1rem;
  }

  .link-username-text {
    font-size: 0.78rem;
    color: var(--text-muted);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .control-btn {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid var(--btn-secondary-border);
    background: var(--btn-secondary-bg);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s ease;
  }

  .control-btn:hover:not(:disabled) {
    background: var(--btn-secondary-hover-bg);
    color: var(--text-primary);
  }

  .control-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .control-btn.delete-btn {
    border-color: rgba(239, 68, 68, 0.15);
    background: rgba(239, 68, 68, 0.05);
    color: #ef4444;
  }

  .control-btn.delete-btn:hover {
    background: rgba(239, 68, 68, 0.18);
    color: #f87171;
  }

  /* PREVIEW PANEL STYLING */
  .mini-devcard-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .mini-devcard {
    width: 290px;
    height: 380px;
    border-radius: 20px;
    background: var(--bg-glass);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border: 1px solid var(--border-glass);
    padding: 1.75rem;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
  }

  .card-glow {
    position: absolute;
    top: -60px;
    left: -20px;
    right: -20px;
    height: 200px;
    pointer-events: none;
    z-index: 0;
    transition: background 0.8s ease;
  }

  .card-identity {
    position: relative;
    z-index: 1;
    text-align: center;
    margin-bottom: 1.25rem;
  }

  .card-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border-glass);
    margin: 0 auto 0.6rem;
  }

  .card-avatar-placeholder {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 800;
    color: white;
    margin: 0 auto 0.6rem;
  }

  .card-displayName {
    font-size: 1.1rem;
    font-weight: 800;
    margin-bottom: 0.15rem;
  }

  .card-role {
    font-size: 0.72rem;
    color: var(--text-secondary);
    background: var(--btn-secondary-bg);
    padding: 0.25rem 0.6rem;
    border-radius: 99px;
    border: 1px solid var(--btn-secondary-border);
  }

  .card-bio {
    font-size: 0.72rem;
    color: var(--text-muted);
    line-height: 1.45;
    margin-top: 0.65rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .card-links-scroll {
    position: relative;
    z-index: 1;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-right: 0.2rem;
  }

  .card-links-scroll::-webkit-scrollbar {
    width: 3px;
  }

  .card-links-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.08);
    border-radius: 99px;
  }

  .card-empty-hint {
    text-align: center;
    font-size: 0.7rem;
    color: var(--text-muted);
    margin: auto 0;
  }

  .card-mini-tile {
    display: flex;
    align-items: center;
    padding: 0.55rem 0.75rem;
    border-radius: 9px;
    background: var(--btn-secondary-bg);
    border: 1px solid var(--btn-secondary-border);
  }

  .tile-icon-circle {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .tile-label {
    font-size: 0.75rem;
    font-weight: 700;
    margin-left: 0.6rem;
  }

  .sharing-controls-box {
    border-radius: var(--radius);
    padding: 1.5rem;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    text-align: center;
  }

  .sharing-controls-box h3 {
    font-size: 0.98rem;
    font-weight: 700;
    margin-bottom: 0.35rem;
  }

  .sharing-controls-box p {
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.45;
    margin-bottom: 1.25rem;
  }

  .export-actions {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .qr-export-group {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    text-align: left;
    border-top: 1px solid rgba(255,255,255,0.08);
    padding-top: 1rem;
  }

  .qr-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .qr-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .btn-secondary {
    padding: 0.65rem 1rem;
    border-radius: var(--radius);
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    color: var(--text-secondary);
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: rgba(255,255,255,0.12);
    color: var(--text-primary);
  }

  /* MODAL STYLING */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(2, 6, 23, 0.4);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1.25rem;
  }
  
  :global(html.dark) .modal-backdrop {
    background: rgba(2, 6, 23, 0.75);
  }

  .modal-content {
    width: 100%;
    max-width: 480px;
    border-radius: var(--radius-xl);
    padding: 2.25rem 2rem;
    background: var(--bg-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-glass);
    box-shadow: var(--shadow-lg);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.75rem;
  }

  .modal-header h3 {
    font-size: 1.2rem;
    font-weight: 800;
  }

  .close-modal-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.75rem;
    cursor: pointer;
    line-height: 0.8;
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .modal-input-wrapper {
    display: flex;
    align-items: stretch;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-secondary);
    overflow: hidden;
  }

  .url-pattern-prefix {
    padding: 0.75rem 0.95rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    background: var(--bg-primary);
    border-right: 1px solid var(--border);
    display: flex;
    align-items: center;
    white-space: nowrap;
    user-select: none;
  }

  .modal-input-wrapper input {
    border: none;
    border-radius: 0;
    flex: 1;
    background: transparent;
  }

  .modal-input-wrapper input:focus {
    box-shadow: none;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .modal-actions button {
    padding: 0.75rem 1.25rem;
  }
</style>
