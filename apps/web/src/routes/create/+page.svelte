<script lang="ts">
  let name = $state('');
  let bio = $state('');
  let links = $state('');
  let skills = $state('');
  
  let fileInput: HTMLInputElement | undefined = $state();
  let importError = $state('');
  let importSuccess = $state(false);

  function handleExport() {
    const config = {
      name,
      bio,
      links,
      skills,
      version: 1
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devcard-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Clear status
    importError = '';
    importSuccess = false;
  }

  function handleImport(event: Event) {
    importError = '';
    importSuccess = false;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const config = JSON.parse(text);
        
        // Basic validation schema
        if (typeof config === 'object' && config !== null) {
          name = typeof config.name === 'string' ? config.name : '';
          bio = typeof config.bio === 'string' ? config.bio : '';
          links = typeof config.links === 'string' ? config.links : '';
          skills = typeof config.skills === 'string' ? config.skills : '';
          importSuccess = true;
          
          setTimeout(() => {
            importSuccess = false;
          }, 3000);
        } else {
          importError = 'Malformed configuration file.';
        }
      } catch (err) {
        importError = 'Invalid JSON file. Could not parse configuration.';
      }
      
      // Reset input so the same file can be uploaded again if needed
      if (input) input.value = '';
    };
    reader.readAsText(file);
  }
  
  function triggerFileInput() {
    fileInput?.click();
  }
  
  function handleImageDownload() {
    alert("Image download functionality will be integrated here.");
  }
</script>

<svelte:head>
  <title>Create DevCard | DevCard</title>
  <meta name="description" content="Generate your custom DevCard" />
</svelte:head>

<div class="bg-gradient"></div>

<main class="page-container">
  <div class="header">
    <h1>Create Your DevCard</h1>
    <p>Fill out the customization panel below to generate your card.</p>
  </div>

  <div class="content-grid">
    <!-- Customization Panel -->
    <div class="customization-panel glass">
      <h2>Customization Panel</h2>
      
      <div class="form-group">
        <label for="name">Name</label>
        <input id="name" type="text" bind:value={name} placeholder="e.g. Jane Doe" />
      </div>

      <div class="form-group">
        <label for="bio">Bio</label>
        <textarea id="bio" rows="3" bind:value={bio} placeholder="A short bio about yourself"></textarea>
      </div>

      <div class="form-group">
        <label for="links">Links (comma-separated)</label>
        <input id="links" type="text" bind:value={links} placeholder="GitHub, LinkedIn, Twitter" />
      </div>

      <div class="form-group">
        <label for="skills">Skills (comma-separated)</label>
        <input id="skills" type="text" bind:value={skills} placeholder="React, Node.js, TypeScript" />
      </div>

      <div class="actions">
        <p class="actions-label">Card Actions:</p>
        <div class="button-group">
          <button class="btn-primary" onclick={handleImageDownload}>
            <span class="icon">⬇️</span> Download Image
          </button>
          <button class="btn-secondary" onclick={handleExport}>
            <span class="icon">💾</span> Backup Config
          </button>
          <button class="btn-secondary" onclick={triggerFileInput}>
            <span class="icon">📂</span> Import Config
          </button>
        </div>
        
        <!-- Hidden file input for import -->
        <input 
          type="file" 
          accept=".json" 
          bind:this={fileInput} 
          onchange={handleImport} 
          style="display: none;" 
        />
        
        {#if importError}
          <div class="alert error">
            {importError}
          </div>
        {/if}
        {#if importSuccess}
          <div class="alert success">
            Configuration restored successfully!
          </div>
        {/if}
      </div>
    </div>

    <!-- Preview Panel -->
    <div class="preview-panel glass">
      <h2>Live Preview</h2>
      <div class="card-preview" style="--accent: #6366f1">
        <div class="card-inner">
          <div class="avatar-placeholder">
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>
          <h3 class="preview-name">{name || 'Your Name'}</h3>
          <p class="preview-bio">{bio || 'Your bio will appear here...'}</p>
          
          {#if skills}
            <div class="preview-tags">
              {#each skills.split(',').map(s => s.trim()).filter(Boolean) as skill}
                <span class="tag">{skill}</span>
              {/each}
            </div>
          {/if}

          {#if links}
            <div class="preview-links">
              {#each links.split(',').map(l => l.trim()).filter(Boolean) as link}
                <div class="link-item">
                  <span class="link-dot"></span>
                  {link}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  .bg-gradient {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.15), transparent 60%),
                #0f1222;
    z-index: -1;
  }

  .page-container {
    min-height: 100vh;
    padding: clamp(2rem, 5vw, 4rem) 1.25rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, sans-serif;
    color: #f8fafc;
  }

  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .header h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-bottom: 0.5rem;
  }

  .header p {
    color: var(--text-secondary, #94a3b8);
    font-size: 1.1rem;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  .glass {
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.5rem;
    padding: 2rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: #e2e8f0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.75rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #cbd5e1;
    margin-bottom: 0.5rem;
  }

  input[type="text"],
  textarea {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.75rem;
    padding: 0.875rem 1rem;
    color: #f8fafc;
    font-family: inherit;
    font-size: 1rem;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  input[type="text"]:focus,
  textarea:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(0, 0, 0, 0.3);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .actions {
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .actions-label {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    margin-bottom: 1rem;
    font-weight: 600;
  }

  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    font-family: inherit;
  }

  .btn-primary {
    background: #6366f1;
    color: white;
    box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39);
  }

  .btn-primary:hover {
    background: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .alert {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .alert.error {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .alert.success {
    background: rgba(34, 197, 94, 0.15);
    color: #86efac;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .card-preview {
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .card-preview::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--accent);
  }

  .avatar-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 2rem;
    background: rgba(99, 102, 241, 0.2);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 auto 1.5rem;
    border: 2px solid rgba(99, 102, 241, 0.4);
  }

  .preview-name {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .preview-bio {
    color: #cbd5e1;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .preview-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  .tag {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .preview-links {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 1rem;
    border-radius: 1rem;
  }

  .link-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: #cbd5e1;
    background: rgba(255, 255, 255, 0.05);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
  }

  .link-dot {
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
  }

  @media (max-width: 860px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
