<script lang="ts">
  import { PLATFORMS } from '@devcard/shared';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  // State for the form
  let profile = $state({
    displayName: 'Your Name',
    role: 'Developer',
    company: 'DevCard',
    bio: 'Building the future of developer profiles.',
    pronouns: 'he/him',
    accentColor: '#6366F1',
    avatarUrl: '',
    links: [
      { platform: 'github', username: 'username' }
    ]
  });

  let previewUrl = $state('');
  
  onMount(() => {
    console.log("Create page mounted");
    const saved = localStorage.getItem('devcard-draft');
    if (saved) {
      try {
        profile = { ...profile, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse saved draft", e);
      }
    }
    updatePreviewUrl();
  });

  function updatePreviewUrl() {
    if (typeof window !== 'undefined') {
      const slug = profile.displayName.toLowerCase().trim().replace(/\s+/g, '-') || 'preview';
      previewUrl = window.location.origin + '/u/' + slug;
    }
  }

  $effect(() => {
    updatePreviewUrl();
  });

  function addLink() {
    profile.links = [...profile.links, { platform: 'github', username: '' }];
  }

  function removeLink(index: number) {
    profile.links = profile.links.filter((_, i) => i !== index);
  }

  async function generateAndSave() {
    console.log("Generating card...", profile);
    try {
      localStorage.setItem('devcard-draft', JSON.stringify(profile));
      const slug = profile.displayName.toLowerCase().trim().replace(/\s+/g, '-') || 'preview';
      console.log("Navigating to:", `/u/${slug}?preview=true`);
      await goto(`/u/${slug}?preview=true`);
    } catch (err) {
      console.error("Generation failed:", err);
      alert("Something went wrong while generating. Check the console for details.");
    }
  }
</script>

<svelte:head>
  <title>Create Your DevCard — Preview Tool</title>
</svelte:head>

<main class="create-page">
  <div class="container">
    <div class="header">
      <a href="/" class="back-link">← Home</a>
      <h1>Create Your DevCard</h1>
      <p>Customize your card and see how it looks in real-time.</p>
    </div>

    <div class="layout">
      <!-- Form Section -->
      <section class="form-section">
        <div class="form-group">
          <label for="name">Display Name</label>
          <input id="name" type="text" bind:value={profile.displayName} placeholder="Enter your name" />
        </div>

        <div class="form-group">
          <label for="avatar">Profile Photo URL</label>
          <div class="avatar-input-group">
            <input id="avatar" type="text" bind:value={profile.avatarUrl} placeholder="https://example.com/photo.jpg" />
            <button class="random-btn" onclick={() => profile.avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`}>🎲 Random</button>
          </div>
          <p class="input-help">Paste a link or generate a random one.</p>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="role">Role</label>
            <input id="role" type="text" bind:value={profile.role} placeholder="e.g. Senior Developer" />
          </div>
          <div class="form-group">
            <label for="pronouns">Pronouns</label>
            <input id="pronouns" type="text" bind:value={profile.pronouns} placeholder="e.g. they/them" />
          </div>
        </div>

        <div class="form-group">
          <label for="bio">Bio</label>
          <textarea id="bio" bind:value={profile.bio} placeholder="Tell the world about yourself..." rows="3"></textarea>
        </div>

        <div class="form-group">
          <label for="accent">Accent Color</label>
          <div class="color-picker">
            <input id="accent" type="color" bind:value={profile.accentColor} />
            <code>{profile.accentColor}</code>
          </div>
        </div>

        <div class="links-manager">
          <div class="links-header">
            <label>Social Links</label>
            <button class="add-btn" onclick={addLink}>+ Add</button>
          </div>
          
          {#each profile.links as link, i}
            <div class="link-row">
              <select bind:value={link.platform}>
                {#each Object.keys(PLATFORMS) as p}
                  <option value={p}>{PLATFORMS[p].name}</option>
                {/each}
              </select>
              <input type="text" bind:value={link.username} placeholder="Username" />
              <button class="remove-btn" onclick={() => removeLink(i)}>×</button>
            </div>
          {/each}
        </div>
        
        <div class="info-note">
          <p>💡 To save this permanently, you'll eventually need to use the DevCard Mobile App.</p>
        </div>
      </section>

      <!-- Preview Section -->
      <section class="preview-section">
        <div class="sticky-preview">
          <h2 class="preview-label">Live Preview</h2>
          
          <!-- The Premium Card -->
          <div class="premium-card" style="--accent: {profile.accentColor}">
            <div class="card-glass"></div>
            <div class="card-content">
              <div class="card-top">
                <div class="brand-row">
                  <div class="mini-chip"></div>
                  <span class="brand-text">DevCard</span>
                </div>
                <span class="contactless">📶</span>
              </div>

              <div class="card-mid">
                <div class="avatar-container">
                  {#if profile.avatarUrl}
                    <img src={profile.avatarUrl} alt={profile.displayName} class="avatar" />
                  {:else}
                    <div class="avatar-placeholder" style="background: var(--accent)">
                      {profile.displayName.charAt(0).toUpperCase()}
                    </div>
                  {/if}
                </div>
                <div class="main-info">
                  <h3>{profile.displayName}</h3>
                  <p class="role">{profile.role}{profile.company ? ` @ ${profile.company}` : ''}</p>
                  {#if profile.pronouns}
                    <p class="pronouns">{profile.pronouns}</p>
                  {/if}
                </div>
              </div>

              <div class="card-bottom">
                <div class="bio-container">
                  <p class="bio-text">{profile.bio}</p>
                </div>
                
                <div class="qr-wrapper">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(previewUrl)}&color=ffffff&bgcolor=0f172a`} 
                    alt="QR Code" 
                    class="qr-code" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="preview-footer">
            <button class="generate-btn" onclick={generateAndSave}>🚀 Generate My Card</button>
            <button class="print-btn" onclick={() => window.print()}>🖨️ Print Card</button>
            <p class="share-note">Generate your card to see the final public view!</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</main>

<style>
  :global(body) {
    background: #0b0f19;
    color: #f8fafc;
    font-family: 'Inter', -apple-system, sans-serif;
    margin: 0;
  }

  .create-page {
    min-height: 100vh;
    padding: 3rem 1rem;
  }

  .container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 3rem;
    text-align: center;
  }

  .back-link {
    color: #6366f1;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
    display: inline-block;
    margin-bottom: 1rem;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .header p {
    color: #94a3b8;
    margin-top: 0.5rem;
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: flex-start;
  }

  /* Form Styles */
  .form-section {
    background: #1e293b;
    padding: 2rem;
    border-radius: 20px;
    border: 1px solid #334155;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
  }

  .avatar-input-group {
    display: flex;
    gap: 0.5rem;
  }

  .random-btn {
    background: #334155;
    color: white;
    border: 1px solid #475569;
    border-radius: 8px;
    padding: 0 1rem;
    cursor: pointer;
    white-space: nowrap;
    font-size: 0.85rem;
    transition: background 0.2s;
  }

  .random-btn:hover {
    background: #475569;
  }

  .input-help {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0.25rem 0 0 0;
  }

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input, textarea, select {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 0.75rem;
    color: white;
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #6366f1;
  }

  .color-picker {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .color-picker input {
    width: 50px;
    height: 40px;
    padding: 2px;
    cursor: pointer;
  }

  .links-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .add-btn {
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.25rem 0.75rem;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .link-row {
    display: grid;
    grid-template-columns: 100px 1fr 40px;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .remove-btn {
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1.2rem;
    cursor: pointer;
  }

  .info-note {
    background: rgba(99, 102, 241, 0.1);
    padding: 1rem;
    border-radius: 12px;
    border-left: 4px solid #6366f1;
    font-size: 0.85rem;
    color: #a5b4fc;
  }

  /* Preview Styles */
  .preview-section {
    position: sticky;
    top: 2rem;
  }

  .preview-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #64748b;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  /* Shared Premium Card Styles */
  .premium-card {
    background: linear-gradient(145deg, #1e293b, #0f172a);
    border-radius: 24px;
    padding: 28px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
    aspect-ratio: 1.58;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .card-glass {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
    pointer-events: none;
  }

  .card-content {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mini-chip {
    width: 32px;
    height: 20px;
    background: #94a3b8;
    opacity: 0.5;
    border-radius: 4px;
  }

  .brand-text {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
  }

  .contactless {
    font-size: 24px;
    opacity: 0.5;
  }

  .card-mid {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 1rem;
  }

  .avatar-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 800;
    color: white;
  }

  .main-info h3 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.5px;
  }

  .role {
    margin: 4px 0 0 0;
    font-size: 0.9rem;
    color: #94a3b8;
  }

  .pronouns {
    margin: 4px 0 0 0;
    font-size: 0.75rem;
    color: #64748b;
    font-style: italic;
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
  }

  .bio-text {
    margin: 0;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    max-width: 280px;
  }

  .qr-wrapper {
    width: 80px;
    height: 80px;
    background: white;
    border-radius: 8px;
    padding: 4px;
    flex-shrink: 0;
  }

  .qr-code {
    width: 100%;
    height: 100%;
  }

  .preview-footer {
    margin-top: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  .generate-btn {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 1rem 2rem;
    font-weight: 800;
    font-size: 1.1rem;
    cursor: pointer;
    box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
    transition: all 0.2s;
    width: 100%;
  }

  .generate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px rgba(99, 102, 241, 0.4);
  }

  .print-btn {
    background: #1e293b;
    color: #94a3b8;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 0.6rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .share-note {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 0.5rem;
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
      gap: 3rem;
    }
    .preview-section {
      position: static;
      order: -1;
    }
    .premium-card {
      max-width: 500px;
      margin: 0 auto;
    }
  }

  @media (max-width: 500px) {
    .premium-card {
      padding: 20px;
      aspect-ratio: auto;
    }
    .main-info h3 { font-size: 1.2rem; }
    .avatar-placeholder { width: 60px; height: 60px; font-size: 24px; }
    .qr-wrapper { width: 60px; height: 60px; }
  }
</style>
