<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let theme = $state<string>('light');

  // Form fields
  let username = $state<string>('');
  let displayName = $state<string>('');
  let bio = $state<string>('');
  let avatarUrl = $state<string>('');
  
  // Platform link builder
  let selectedPlatform = $state<string>('github');
  let linkInput = $state<string>('');
  let links = $state<Array<{ id: string; platform: string; username: string; url: string }>>([]);
  
  let isEditing = $state<boolean>(false);
  let formError = $state<string>('');
  let formSuccess = $state<string>('');

  const platformOptions = [
    { id: 'github', name: 'GitHub', placeholder: 'e.g. octocat or https://github.com/octocat' },
    { id: 'twitter', name: 'Twitter / X', placeholder: 'e.g. elonmusk or https://x.com/elonmusk' },
    { id: 'linkedin', name: 'LinkedIn', placeholder: 'e.g. johndoe or https://linkedin.com/in/johndoe' },
    { id: 'instagram', name: 'Instagram', placeholder: 'e.g. zuck or https://instagram.com/zuck' },
    { id: 'youtube', name: 'YouTube', placeholder: 'e.g. @mrbeast or https://youtube.com/@mrbeast' },
    { id: 'devto', name: 'Dev.to', placeholder: 'e.g. ben or https://dev.to/ben' },
    { id: 'leetcode', name: 'LeetCode', placeholder: 'e.g. coder or https://leetcode.com/u/coder' },
    { id: 'portfolio', name: 'Portfolio', placeholder: 'e.g. https://mywebsite.com' }
  ];

  const platformColors: Record<string, string> = {
    github: '#181717',
    linkedin: '#0A66C2',
    twitter: '#000000',
    instagram: '#E1306C',
    youtube: '#FF0000',
    devto: '#0A0A0A',
    leetcode: '#FFA116',
    portfolio: '#6366F1'
  };

  const platformUrls: Record<string, string> = {
    github: 'https://github.com/{username}',
    twitter: 'https://x.com/{username}',
    linkedin: 'https://www.linkedin.com/in/{username}',
    instagram: 'https://instagram.com/{username}',
    youtube: 'https://youtube.com/@{username}',
    devto: 'https://dev.to/{username}',
    leetcode: 'https://leetcode.com/u/{username}',
    portfolio: '{username}'
  };

  // Avatar presets and builder state
  const presetAvatars: Array<{ url: string; label: string }> = [
    { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop&q=80', label: 'Abstract Tech' },
    { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&h=150&fit=crop&q=80', label: 'Code Terminal' },
    { url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=150&h=150&fit=crop&q=80', label: 'Developer Desk' },
    { url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&h=150&fit=crop&q=80', label: 'Retro Cyber' },
    { url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80', label: 'Creative Developer' },
    { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&q=80', label: 'Tech Expert' }
  ];

  function getInitialsAvatar(name: string): string {
    const cleanName = name.trim();
    if (!cleanName) return '';
    const parts = cleanName.split(/\s+/);
    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    const upperInitials = initials.toUpperCase() || '⚡';
    
    // Curated gradients
    const gradients = [
      ['#6366f1', '#a855f7'],
      ['#3b82f6', '#1d4ed8'],
      ['#ec4899', '#f43f5e'],
      ['#10b981', '#059669'],
      ['#f59e0b', '#d97706'],
      ['#8b5cf6', '#6d28d9']
    ];
    // Simple hash based on name to keep gradient consistent
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    const [color1, color2] = gradients[index];
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <linearGradient id="grad-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad-${index})" rx="32" />
      <text x="50%" y="54%" font-family="'Outfit', 'Inter', sans-serif" font-size="38" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${upperInitials}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function syncGitHubAvatar() {
    const githubLink = links.find(l => l.platform === 'github');
    if (githubLink && githubLink.username) {
      avatarUrl = `https://github.com/${githubLink.username}.png`;
      formSuccess = 'Successfully synced avatar from GitHub!';
      setTimeout(() => { formSuccess = ''; }, 3000);
    } else {
      formError = 'Please add your GitHub profile link first to sync your avatar.';
      setTimeout(() => { formError = ''; }, 4000);
    }
  }

  onMount(() => {
    // Theme toggle initialization
    const saved = localStorage.getItem('devcard-theme');
    if (saved) {
      theme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');

    // Pre-fill form if editing
    const params = new URLSearchParams(window.location.search);
    const editUsername = params.get('edit');
    if (editUsername) {
      const savedCard = localStorage.getItem(`devcard_${editUsername}`);
      if (savedCard) {
        try {
          const profile = JSON.parse(savedCard);
          username = profile.username || '';
          displayName = profile.displayName || '';
          bio = profile.bio || '';
          avatarUrl = profile.avatarUrl || '';
          links = profile.links || [];
          isEditing = true;
          
          // Smooth scroll to form
          setTimeout(() => {
            scrollToForm();
          }, 100);
        } catch (e) {
          console.error('Failed to parse editing card', e);
        }
      }
    }
  });

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('devcard-theme', theme);
  }

  function scrollToForm() {
    const formElement = document.getElementById('create-card');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleUsernameInput(event: any) {
    const input = event.target.value;
    username = input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-')         // Collapse consecutive hyphens
      .replace(/^-|-$/g, '');      // Trim hyphens from ends
  }

  function extractUsername(platform: string, url: string): string {
    if (!url) return '';
    try {
      let cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        return cleanUrl;
      }
      const parsed = new URL(cleanUrl);
      const pathname = parsed.pathname;
      const segments = pathname.split('/').filter(Boolean);
      
      if (platform === 'youtube') {
        const last = segments[segments.length - 1];
        return last ? last.replace(/^@/, '') : '';
      }
      
      const last = segments[segments.length - 1];
      return last || parsed.hostname;
    } catch {
      return url;
    }
  }

  function buildLink(platform: string, input: string): { username: string; url: string } {
    const trimmed = input.trim();
    const isUrl = /^https?:\/\//i.test(trimmed);
    
    let userVal = '';
    let fullUrl = '';
    
    if (isUrl) {
      fullUrl = trimmed;
      userVal = extractUsername(platform, trimmed);
    } else {
      userVal = trimmed;
      const pattern = platformUrls[platform] || '{username}';
      fullUrl = pattern.replace(/{username}/g, trimmed);
      if (platform === 'portfolio' && !/^https?:\/\//i.test(fullUrl)) {
        fullUrl = 'https://' + fullUrl;
      }
    }
    
    return { username: userVal, url: fullUrl };
  }

  function addLink() {
    if (!linkInput.trim()) {
      formError = 'Please enter a profile username or URL.';
      return;
    }

    if (links.some(l => l.platform === selectedPlatform)) {
      formError = `You have already added a link for ${platformOptions.find(p => p.id === selectedPlatform)?.name || selectedPlatform}.`;
      return;
    }

    const { username: extractedUser, url: builtUrl } = buildLink(selectedPlatform, linkInput);
    
    links = [...links, {
      id: Math.random().toString(36).substring(2, 9),
      platform: selectedPlatform,
      username: extractedUser || username || 'user',
      url: builtUrl
    }];
    
    linkInput = '';
    formError = '';
  }

  function deleteLink(id: string) {
    links = links.filter(l => l.id !== id);
  }

  function generateCard() {
    formError = '';
    formSuccess = '';

    if (!username.trim()) {
      formError = 'Username is required.';
      return;
    }
    if (username.length < 3) {
      formError = 'Username must be at least 3 characters.';
      return;
    }
    if (!displayName.trim()) {
      formError = 'Full Name is required.';
      return;
    }
    if (!bio.trim()) {
      formError = 'Short Bio is required.';
      return;
    }
    if (links.length === 0) {
      formError = 'Please add at least one social or profile link.';
      return;
    }

    const profileData = {
      username,
      displayName,
      bio,
      avatarUrl: avatarUrl.trim() || null,
      accentColor: '#6366f1',
      links
    };

    try {
      localStorage.setItem(`devcard_${username}`, JSON.stringify(profileData));
      formSuccess = 'Your DevCard has been generated successfully! Redirecting...';
      
      setTimeout(() => {
        goto(`/u/${username}`);
      }, 1000);
    } catch (e) {
      formError = 'An error occurred while saving your card. Please try again.';
      console.error(e);
    }
  }

  function seedDemoAndNavigate(e: Event) {
    e.preventDefault();
    const demoData = {
      username: 'devcard-demo',
      displayName: 'Alex Developer',
      bio: 'Full Stack Engineer | Open Source Contributor | Building the future of developer networking 🚀',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&q=80',
      accentColor: '#6366f1',
      links: [
        { id: '1', platform: 'github', username: 'alexdev', url: 'https://github.com/alexdev', displayOrder: 0 },
        { id: '2', platform: 'linkedin', username: 'alex-developer', url: 'https://linkedin.com/in/alex-developer', displayOrder: 1 },
        { id: '3', platform: 'twitter', username: 'alex_codes', url: 'https://x.com/alex_codes', displayOrder: 2 },
        { id: '4', platform: 'leetcode', username: 'alex_leetcode', url: 'https://leetcode.com/u/alex_leetcode', displayOrder: 3 },
        { id: '5', platform: 'portfolio', username: 'alexdev.me', url: 'https://alexdev.me', displayOrder: 4 }
      ]
    };
    
    try {
      localStorage.setItem('devcard_devcard-demo', JSON.stringify(demoData));
      goto('/u/devcard-demo');
    } catch (e) {
      console.error('Failed to seed demo', e);
    }
  }

  // Reactive derived URLs for dynamic avatar suggestions
  let initialsAvatar = $derived(getInitialsAvatar(displayName));
  let avataaarsUrl = $derived(`https://api.dicebear.com/7.x/avataaars/svg?seed=${username || displayName || 'dev'}`);
  let botttsUrl = $derived(`https://api.dicebear.com/7.x/bottts/svg?seed=${username || displayName || 'dev'}`);
  let pixelUrl = $derived(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${username || displayName || 'dev'}`);
  let loreleiUrl = $derived(`https://api.dicebear.com/7.x/lorelei/svg?seed=${username || displayName || 'dev'}`);
  let identiconUrl = $derived(`https://api.dicebear.com/7.x/identicon/svg?seed=${username || displayName || 'dev'}`);
  let githubLink = $derived(links.find(l => l.platform === 'github'));
</script>

<svelte:head>
  <title>DevCard — One Tap. Every Profile. Every Platform.</title>
  <meta
    name="description"
    content="Open source developer profile exchange platform. Share all your developer profiles with one QR code."
  />
</svelte:head>

<div class="bg-glow"></div>

<main class="landing">
  <nav class="glass">
    <div class="nav-content">
      <div class="logo">⚡ <span class="gradient-text">DevCard</span></div>
      <button
        id="theme-toggle"
        class="theme-toggle"
        onclick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-badge">GSSoC'26 Edition</div>
    <h1 class="gradient-text">One Tap. Every Profile.<br/>Every Platform.</h1>
    <p class="description">
      The open-source standard for developer networking. Put all your profiles—GitHub, LinkedIn, LeetCode, and more—into a single, high-impact digital card.
    </p>
    <div class="cta-group">
      <a
        href="#create-card"
        class="btn-primary animate-pulse"
        onclick={(e) => { e.preventDefault(); scrollToForm(); }}
      >
        ✨ Create Your Card
      </a>
      <button
        onclick={seedDemoAndNavigate}
        class="btn-secondary"
      >
        View Demo Card →
      </button>
      <a
        href="https://github.com/Dev-Card/DevCard"
        class="btn-outline"
        target="_blank"
        rel="noopener"
      >
        ⭐ Star on GitHub
      </a>
    </div>
  </section>

  <!-- CREATE YOUR CARD FORM -->
  <section id="create-card" class="create-card-section glass">
    <div class="section-header">
      <div class="logo-accent">⚡</div>
      <h2>{isEditing ? 'Update Your DevCard' : 'Create Your DevCard'}</h2>
      <p class="section-subtitle">
        Enter your details to generate a stunning, shareable developer profile card.
      </p>
    </div>

    {#if formError}
      <div class="alert alert-error" role="alert">
        ⚠️ {formError}
      </div>
    {/if}

    {#if formSuccess}
      <div class="alert alert-success" role="alert">
        🎉 {formSuccess}
      </div>
    {/if}

    <form onsubmit={(e) => { e.preventDefault(); generateCard(); }} class="card-form">
      <div class="form-grid">
        <!-- Username Field -->
        <div class="form-group">
          <label for="username">Username <span class="required">*</span></label>
          <div class="input-with-prefix">
            <span class="url-prefix">/u/</span>
            <input
              type="text"
              id="username"
              placeholder="e.g. johndoe"
              value={username}
              oninput={handleUsernameInput}
              disabled={isEditing}
              required
            />
          </div>
          {#if !isEditing}
            <span class="input-helper">Your card will be available at /u/your-username</span>
          {:else}
            <span class="input-helper">Username cannot be changed when editing</span>
          {/if}
        </div>

        <!-- Full Name Field -->
        <div class="form-group">
          <label for="displayName">Full Name <span class="required">*</span></label>
          <input
            type="text"
            id="displayName"
            placeholder="e.g. John Doe"
            bind:value={displayName}
            required
          />
        </div>

        <!-- Avatar Studio Group -->
        <div class="form-group full-width avatar-studio-group">
          <span class="studio-title-label">Avatar Studio <span class="optional">(Pick an avatar suggestion below)</span></span>
          
          <div class="avatar-studio-container glass">
            <!-- Left Side: Live Avatar Preview -->
            <div class="avatar-preview-box">
              <div class="preview-avatar-wrapper">
                {#if avatarUrl && (avatarUrl.startsWith('data:') || /^https?:\/\//i.test(avatarUrl))}
                  <img src={avatarUrl} alt="Avatar Preview" class="studio-preview-image" onerror={() => { avatarUrl = ''; }} />
                {:else}
                  <div class="studio-preview-placeholder">
                    {displayName ? displayName.charAt(0).toUpperCase() : '⚡'}
                  </div>
                {/if}
              </div>
              <span class="preview-label">Live Preview</span>
            </div>

            <!-- Right Side: Suggestions Selector Grid -->
            <div class="avatar-studio-controls">
              <!-- Category: Dynamic Suggestions -->
              <div class="control-section">
                <span class="control-label">✨ Dynamic Suggestions (Real-time)</span>
                <div class="suggestions-grid">
                  <!-- Option 1: Dynamic Initials Avatar -->
                  <button
                    type="button"
                    class="suggestion-card {avatarUrl === initialsAvatar ? 'active' : ''}"
                    onclick={() => { avatarUrl = initialsAvatar; }}
                    disabled={!displayName.trim()}
                    title={displayName ? 'Use initials-based colored gradient' : 'Type your Full Name to enable'}
                  >
                    <div class="suggestion-preview">
                      {#if displayName.trim()}
                        <img src={initialsAvatar} alt="Initials Avatar" />
                      {:else}
                        <span class="suggestion-placeholder">Aa</span>
                      {/if}
                    </div>
                    <span class="suggestion-name">Initials SVG</span>
                  </button>

                  <!-- Option 2: DiceBear Avataaars -->
                  <button
                    type="button"
                    class="suggestion-card {avatarUrl === avataaarsUrl ? 'active' : ''}"
                    onclick={() => { avatarUrl = avataaarsUrl; }}
                  >
                    <div class="suggestion-preview">
                      <img src={avataaarsUrl} alt="Avataaars suggestion" />
                    </div>
                    <span class="suggestion-name">Avataaars</span>
                  </button>

                  <!-- Option 3: DiceBear Robots -->
                  <button
                    type="button"
                    class="suggestion-card {avatarUrl === botttsUrl ? 'active' : ''}"
                    onclick={() => { avatarUrl = botttsUrl; }}
                  >
                    <div class="suggestion-preview">
                      <img src={botttsUrl} alt="Bot suggestion" />
                    </div>
                    <span class="suggestion-name">Robots</span>
                  </button>

                  <!-- Option 4: DiceBear Pixel Art -->
                  <button
                    type="button"
                    class="suggestion-card {avatarUrl === pixelUrl ? 'active' : ''}"
                    onclick={() => { avatarUrl = pixelUrl; }}
                  >
                    <div class="suggestion-preview">
                      <img src={pixelUrl} alt="Pixel suggestion" />
                    </div>
                    <span class="suggestion-name">Pixel Art</span>
                  </button>

                  <!-- Option 5: DiceBear Lorelei -->
                  <button
                    type="button"
                    class="suggestion-card {avatarUrl === loreleiUrl ? 'active' : ''}"
                    onclick={() => { avatarUrl = loreleiUrl; }}
                  >
                    <div class="suggestion-preview">
                      <img src={loreleiUrl} alt="Chibi suggestion" />
                    </div>
                    <span class="suggestion-name">Chibi</span>
                  </button>

                  <!-- Option 6: DiceBear Identicon -->
                  <button
                    type="button"
                    class="suggestion-card {avatarUrl === identiconUrl ? 'active' : ''}"
                    onclick={() => { avatarUrl = identiconUrl; }}
                  >
                    <div class="suggestion-preview">
                      <img src={identiconUrl} alt="Identicon suggestion" />
                    </div>
                    <span class="suggestion-name">Identicon</span>
                  </button>
                </div>
              </div>

              <!-- Curated Presets & GitHub Sync Section -->
              <div class="control-section row-controls suggestion-footer-controls">
                <div class="sub-control">
                  <span class="control-label">📷 Developer Photography Presets</span>
                  <div class="preset-avatars-grid">
                    {#each presetAvatars as preset}
                      <button
                        type="button"
                        class="preset-btn {avatarUrl === preset.url ? 'active' : ''}"
                        onclick={() => { avatarUrl = preset.url; }}
                        style="background-image: url({preset.url})"
                        title={preset.label}
                        aria-label="Select {preset.label} preset"
                      ></button>
                    {/each}
                  </div>
                </div>

                <div class="sub-control github-sync-control">
                  <span class="control-label">🐙 Sync GitHub Avatar</span>
                  <button
                    type="button"
                    onclick={syncGitHubAvatar}
                    class="btn-github-sync"
                    title={githubLink ? `Sync avatar from @${githubLink.username}` : 'Add a GitHub profile link first'}
                  >
                    {#if githubLink}
                      Sync from @{githubLink.username}
                    {:else}
                      Sync GitHub Avatar
                    {/if}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Short Bio Field -->
        <div class="form-group full-width">
          <label for="bio">Short Bio <span class="required">*</span></label>
          <textarea
            id="bio"
            rows="3"
            placeholder="Describe yourself in a few sentences... e.g. Software Engineer passionate about Svelte and open source."
            bind:value={bio}
            maxlength="200"
            required
          ></textarea>
          <div class="textarea-footer">
            <span class="char-count">{bio.length}/200 characters</span>
          </div>
        </div>
      </div>

      <!-- Add Links Section -->
      <div class="links-section-form">
        <h3>Add Your Social & Profile Links</h3>
        <p class="section-subtitle-sm">
          Select a platform, enter your username or profile URL, and click "Add".
        </p>

        <div class="link-builder-row">
          <div class="select-wrapper">
            <select bind:value={selectedPlatform}>
              {#each platformOptions as platform}
                <option value={platform.id}>{platform.name}</option>
              {/each}
            </select>
          </div>
          <input
            type="text"
            placeholder={platformOptions.find(p => p.id === selectedPlatform)?.placeholder || 'Enter profile URL'}
            bind:value={linkInput}
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
          />
          <button type="button" onclick={addLink} class="btn-add-link">
            ➕ Add Link
          </button>
        </div>

        <!-- Link List -->
        <div class="links-list-container">
          {#if links.length === 0}
            <div class="empty-links-state">
              <span class="empty-icon">🔗</span>
              <p>No links added yet. Add at least one platform link!</p>
            </div>
          {:else}
            <div class="links-list">
              {#each links as link}
                {@const color = platformColors[link.platform] || '#6366f1'}
                <div class="link-item glass">
                  <div class="link-item-info">
                    <span class="link-platform-tag" style="background: {color}">
                      {platformOptions.find(p => p.id === link.platform)?.name || link.platform}
                    </span>
                    <span class="link-username-tag">@{link.username}</span>
                    <span class="link-url-tag">{link.url}</span>
                  </div>
                  <button type="button" onclick={() => deleteLink(link.id)} class="btn-delete-link" aria-label="Delete link">
                    🗑️
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Form Action Button -->
      <div class="form-submit-wrapper">
        <button type="submit" class="btn-primary btn-generate-card">
          {isEditing ? '⚡ Update My DevCard' : '⚡ Generate My DevCard'}
        </button>
        {#if isEditing}
          <button type="button" onclick={() => { isEditing = false; username = ''; displayName = ''; bio = ''; avatarUrl = ''; links = []; }} class="btn-secondary">
            Cancel Edit
          </button>
        {/if}
      </div>
    </form>
  </section>

  <section id="features" class="features">
    <div class="feature-card glass">
      <div class="feature-icon">🔗</div>
      <h3>Unified Identity</h3>
      <p>Combine your fragmented online presence into a cohesive professional identity.</p>
    </div>
    <div class="feature-card glass">
      <div class="feature-icon">⚡</div>
      <h3>Instant Follow</h3>
      <p>Integrated APIs allow followers to connect with you instantly across platforms.</p>
    </div>
    <div class="feature-card glass">
      <div class="feature-icon">🔒</div>
      <h3>Private by Design</h3>
      <p>No tracking, no data selling. Your information stays where it belongs: with you.</p>
    </div>
  </section>

  <footer class="footer">
    <p>© 2026 DevCard • Built for the Developer Community</p>
  </footer>
</main>

<style>
  .bg-glow {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 50% 0%, var(--primary-glow), transparent 40%),
                radial-gradient(circle at 0% 100%, var(--accent-glow), transparent 30%);
    pointer-events: none;
    z-index: -1;
  }

  nav {
    position: sticky;
    top: 1.25rem;
    margin: 0 auto;
    width: min(1100px, calc(100% - 2rem));
    max-width: 1100px;
    border-radius: var(--radius-xl);
    z-index: 100;
    padding: 1rem 1.5rem;
  }

  .nav-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .logo {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1.35rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .theme-toggle {
    width: 46px;
    height: 46px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    transition: transform 0.24s ease, background-color 0.24s ease, border-color 0.24s ease;
  }

  .theme-toggle:hover {
    transform: scale(1.05);
    background: rgba(255, 255, 255, 0.14);
  }

  .theme-toggle:focus-visible {
    outline: 3px solid rgba(99, 102, 241, 0.24);
    outline-offset: 3px;
  }

  .landing {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.25rem;
  }

  .hero {
    text-align: center;
    padding: clamp(4rem, 8vw, 6rem) 0 4rem;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.45rem 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    font-size: 0.88rem;
    font-weight: 700;
    margin-bottom: 1.75rem;
    color: var(--primary);
  }

  h1 {
    font-size: clamp(3rem, 5.8vw, 4.5rem);
    font-weight: 900;
    letter-spacing: -1px;
    margin: 0 auto 1.5rem;
    max-width: 760px;
  }

  .description {
    font-size: clamp(1rem, 1.1vw, 1.2rem);
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto 2.5rem;
    line-height: 1.7;
  }

  .cta-group {
    display: flex;
    gap: 1rem;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }

  .btn-outline {
    padding: 0.92rem 1.75rem;
    border-radius: calc(var(--radius) * 1.15);
    font-weight: 700;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: transparent;
    color: var(--text-primary);
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .btn-outline:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(99, 102, 241, 0.35);
  }

  .btn-secondary {
    padding: 0.92rem 1.75rem;
    border-radius: calc(var(--radius) * 1.15);
    font-weight: 700;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    cursor: pointer;
    font: inherit;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(99, 102, 241, 0.45);
  }

  /* --- Create Card Form Styles --- */
  .create-card-section {
    padding: clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 3rem);
    border-radius: var(--radius-xl, 24px);
    margin: 3rem auto 5rem;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: var(--shadow-xl);
    max-width: 800px;
    position: relative;
    overflow: hidden;
  }

  .section-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .logo-accent {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    display: inline-block;
    animation: pulse 2s infinite;
  }

  .create-card-section h2 {
    font-size: clamp(1.8rem, 3.2vw, 2.5rem);
    font-weight: 800;
    margin-bottom: 0.75rem;
    background: linear-gradient(135deg, #fff 0%, var(--text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .section-subtitle {
    color: var(--text-secondary);
    font-size: 1.05rem;
    max-width: 550px;
    margin: 0 auto;
    line-height: 1.5;
  }

  .section-subtitle-sm {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
    line-height: 1.4;
  }

  .card-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group.full-width {
    grid-column: span 2;
  }

  @media (max-width: 640px) {
    .form-group.full-width {
      grid-column: span 1;
    }
  }

  label, .studio-title-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .required {
    color: #ef4444;
  }

  .optional {
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: normal;
  }

  input, select, textarea {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    color: var(--text-primary);
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.2s ease;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .input-with-prefix {
    display: flex;
    align-items: stretch;
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .input-with-prefix:focus-within {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .input-with-prefix input {
    border: none;
    background: transparent;
    padding-left: 0.35rem;
    flex: 1;
    box-shadow: none;
  }

  .input-with-prefix input:focus {
    border: none;
    box-shadow: none;
    background: transparent;
  }

  .url-prefix {
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-muted);
    font-size: 0.95rem;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    font-weight: 500;
  }

  .input-helper {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* --- Avatar Studio Styles --- */
  .avatar-studio-group {
    margin-bottom: 0.5rem;
  }

  .avatar-studio-container {
    display: flex;
    gap: 2rem;
    padding: 1.5rem;
    border-radius: var(--radius-xl);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    align-items: center;
  }

  @media (max-width: 640px) {
    .avatar-studio-container {
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
  }

  .avatar-preview-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    min-width: 120px;
  }

  .preview-avatar-wrapper {
    position: relative;
    width: 110px;
    height: 110px;
    border-radius: 32% 68% 63% 37% / 34% 36% 64% 66%;
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .studio-preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .studio-preview-placeholder {
    font-size: 2.75rem;
    font-weight: 800;
    color: white;
  }

  .preview-label {
    font-size: 0.8rem;
    color: var(--text-muted);
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .avatar-studio-controls {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    width: 100%;
  }

  .control-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .row-controls {
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
  }

  @media (max-width: 520px) {
    .row-controls {
      flex-direction: column;
      gap: 1rem;
    }
  }

  .sub-control {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-label {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.3px;
  }

  .preset-avatars-grid {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .preset-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    border: 2px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }

  .preset-btn:hover {
    transform: scale(1.1);
    border-color: var(--primary, #6366f1);
  }

  .preset-btn.active {
    border-color: var(--primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
    transform: scale(1.05);
  }

  .suggestions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
    gap: 0.75rem;
    width: 100%;
  }

  .suggestion-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
  }

  .suggestion-card:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-2px);
  }

  .suggestion-card.active {
    background: rgba(99, 102, 241, 0.08);
    border-color: var(--primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
  }

  .suggestion-card:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .suggestion-preview {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .suggestion-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .suggestion-placeholder {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .suggestion-name {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  }

  .github-sync-control {
    min-width: 140px;
  }

  .btn-github-sync {
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: white;
    background: #24292e;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-github-sync:hover {
    background: #2f363d;
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  textarea {
    resize: vertical;
  }

  .textarea-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: -0.25rem;
  }

  .char-count {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* --- Links Section in Form --- */
  .links-section-form {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .links-section-form h3 {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .link-builder-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .link-builder-row input {
    flex: 1;
    min-width: 200px;
  }

  .select-wrapper {
    position: relative;
    display: flex;
  }

  .select-wrapper select {
    appearance: none;
    padding-right: 2.5rem;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.04);
  }

  .select-wrapper::after {
    content: "▼";
    font-size: 0.75rem;
    color: var(--text-muted);
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .btn-add-link {
    padding: 0.75rem 1.25rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: var(--radius);
    font-weight: 600;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .btn-add-link:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  /* --- Links List Container --- */
  .links-list-container {
    background: rgba(0, 0, 0, 0.12);
    border: 1px dashed rgba(255, 255, 255, 0.06);
    border-radius: var(--radius-xl);
    padding: 1rem;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .empty-links-state {
    text-align: center;
    color: var(--text-muted);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .empty-icon {
    font-size: 1.5rem;
    opacity: 0.5;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .link-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: var(--radius);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    gap: 1rem;
  }

  .link-item-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
  }

  .link-platform-tag {
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    color: white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
  }

  .link-username-tag {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .link-url-tag {
    font-size: 0.82rem;
    color: var(--text-muted);
    max-width: 320px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-delete-link {
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.25rem;
    opacity: 0.6;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .btn-delete-link:hover {
    opacity: 1;
    transform: scale(1.15);
  }

  /* --- Form Alerts --- */
  .alert {
    padding: 1rem;
    border-radius: var(--radius);
    font-size: 0.95rem;
    font-weight: 500;
    border-left: 4px solid;
    margin-bottom: 1.5rem;
  }

  .alert-error {
    background: rgba(239, 68, 68, 0.06);
    border: 1px solid rgba(239, 68, 68, 0.12);
    border-left-color: #ef4444;
    color: #fca5a5;
  }

  .alert-success {
    background: rgba(34, 197, 94, 0.06);
    border: 1px solid rgba(34, 197, 94, 0.12);
    border-left-color: #22c55e;
    color: #86efac;
  }

  /* --- Form Action Buttons --- */
  .form-submit-wrapper {
    display: flex;
    gap: 1rem;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 1.75rem;
    margin-top: 0.5rem;
  }

  .btn-generate-card {
    padding: 0.9rem 2rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    border-radius: calc(var(--radius) * 1.15);
    box-shadow: 0 10px 25px -10px rgba(99, 102, 241, 0.4);
    transition: all 0.25s ease;
    display: inline-flex;
    align-items: center;
  }

  .btn-generate-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -10px rgba(99, 102, 241, 0.5);
  }

  .btn-generate-card:active {
    transform: translateY(0);
  }

  .btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
    color: white;
    border: none;
    box-shadow: 0 10px 25px -10px rgba(99, 102, 241, 0.4);
    text-decoration: none;
    padding: 0.92rem 1.75rem;
    border-radius: calc(var(--radius) * 1.15);
    font-weight: 700;
    transition: all 0.25s ease;
    display: inline-flex;
    align-items: center;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -10px rgba(99, 102, 241, 0.5);
  }

  /* Smooth animations */
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.08); opacity: 0.85; }
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.75rem;
    padding: 4rem 0 5rem;
  }

  @media (max-width: 640px) {
    .features {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      padding: 0 12px;
    }
  }

  .feature-card {
    padding: 2.4rem;
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.5));
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
    min-height: 140px;
  }

  @media (max-width: 640px) {
    .feature-card {
      margin-bottom: 12px;
      padding: 1.8rem;
    }
  }

  .feature-card:hover {
    transform: translateY(-8px);
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 26px 50px -18px rgba(0, 0, 0, 0.35);
  }

  .feature-icon {
    font-size: 2.3rem;
    margin-bottom: 1.4rem;
  }

  h3 {
    font-size: 1.4rem;
    margin-bottom: 0.9rem;
  }

  .feature-card p {
    color: var(--text-secondary);
    line-height: 1.7;
  }

  .footer {
    text-align: center;
    padding: 3rem 0 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
  }

  @media (max-width: 860px) {
    nav {
      top: 0.9rem;
      padding: 0.85rem 1.1rem;
    }

    .hero {
      padding: clamp(3rem, 9vw, 5rem) 0 3rem;
    }
  }

  @media (max-width: 640px) {
    h1 {
      font-size: 2.6rem;
    }

    .cta-group {
      flex-direction: column;
      align-items: stretch;
    }

    .features {
      gap: 1.2rem;
    }

    .footer {
      padding: 2rem 0 1.25rem;
    }
  }
</style>
