<script lang="ts">
  import type { PageData } from "./$types";
  import type { PublicCardResponse } from "@devcard/shared/types";

  export let data: PageData;

  const card: PublicCardResponse = data.card;

  // Map each platform name to a colour used for the button accent
  const platformColors: Record<string, string> = {
    github: "#24292e",
    linkedin: "#0077b5",
    twitter: "#1da1f2",
    x: "#000000",
    devfolio: "#3770ff",
    gitlab: "#fc6d26",
    leetcode: "#ffa116",
    hashnode: "#2962ff",
    devto: "#0a0a0a",
    medium: "#00ab6c",
    youtube: "#ff0000",
    instagram: "#e1306c",
    portfolio: "#6c63ff",
  };

  // Normalise the platform name (lowercase, no spaces) for icon + colour lookup
  function normalisePlatform(platform: string): string {
    return platform.toLowerCase().replace(/\s/g, "");
  }

  function getColor(platform: string): string {
    return platformColors[normalisePlatform(platform)] ?? "#555555";
  }

  // The display label shown on each button
  function getLabel(link: { platform: string; label: string | null }): string {
    return link.label ?? link.platform;
  }

  // Build the page URL for the canonical + og:url tag
  const pageUrl = `https://dev-card-web.vercel.app/u/${card.username}`;

  // Build the og:description
  const ogDescription =
    card.bio ??
    `Check out ${card.displayName ?? card.username}'s DevCard — all developer profiles in one place.`;
</script>

<!-- ─── Open Graph & SEO meta tags ─── -->
<svelte:head>
  <title>{card.displayName ?? card.username} | DevCard</title>
  <meta name="description" content={ogDescription} />

  <!-- Open Graph (Facebook, LinkedIn, WhatsApp, Telegram) -->
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="{card.displayName ?? card.username} | DevCard" />
  <meta property="og:description" content={ogDescription} />
  <meta property="og:url" content={pageUrl} />
  <meta
    property="og:image"
    content={card.avatarUrl ?? "https://dev-card-web.vercel.app/og-image.jpg"}
  />
  <meta property="og:site_name" content="DevCard" />

  <!-- Twitter / X card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="{card.displayName ?? card.username} | DevCard" />
  <meta name="twitter:description" content={ogDescription} />
  <meta
    name="twitter:image"
    content={card.avatarUrl ?? "https://dev-card-web.vercel.app/og-image.jpg"}
  />

  <!-- Canonical URL -->
  <link rel="canonical" href={pageUrl} />
</svelte:head>

<!-- ─── Page layout ─── -->
<main class="profile-page">
  <div class="card">
    <!-- Avatar -->
    {#if card.avatarUrl}
      <img
        src={card.avatarUrl}
        alt="{card.displayName ?? card.username}'s avatar"
        class="avatar"
      />
    {:else}
      <div class="avatar avatar--placeholder" aria-hidden="true">
        {(card.displayName ?? card.username).charAt(0).toUpperCase()}
      </div>
    {/if}

    <!-- Name + username -->
    <h1 class="display-name">{card.displayName ?? card.username}</h1>
    {#if card.displayName}
      <p class="username">@{card.username}</p>
    {/if}

    <!-- Bio -->
    {#if card.bio}
      <p class="bio">{card.bio}</p>
    {/if}

    <!-- Platform links -->
    {#if card.links.length > 0}
      <ul class="links" aria-label="Platform links">
        {#each card.links as link}
          <li>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="link-btn"
              style="--accent: {getColor(link.platform)}"
            >
              <span class="link-platform">{getLabel(link)}</span>
              <span class="link-arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty-state">No links added yet.</p>
    {/if}

    <!-- Footer -->
    <footer class="card-footer">
      <a href="/" class="devcard-branding">⚡ DevCard</a>
    </footer>
  </div>
</main>

<style>
  .profile-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background: var(--color-bg, #0f0f1a);
  }

  .card {
    width: 100%;
    max-width: 420px;
    background: var(--color-surface, #1a1a2e);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 2.5rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  /* ── Avatar ── */
  .avatar {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.12);
    margin-bottom: 0.25rem;
  }

  .avatar--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #6c63ff;
    color: #fff;
    font-size: 2rem;
    font-weight: 600;
    width: 88px;
    height: 88px;
  }

  /* ── Text ── */
  .display-name {
    font-size: 1.4rem;
    font-weight: 700;
    color: #fff;
    margin: 0;
    text-align: center;
  }

  .username {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
  }

  .bio {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    margin: 0.25rem 0 0.5rem;
    line-height: 1.5;
    max-width: 320px;
  }

  /* ── Links ── */
  .links {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .link-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1.125rem;
    border-radius: 12px;
    border: 1px solid var(--accent, #555);
    background: transparent;
    color: #fff;
    font-size: 0.9rem;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .link-btn:hover {
    background: var(--accent, #555);
    transform: translateY(-1px);
  }

  .link-arrow {
    font-size: 0.8rem;
    opacity: 0.6;
  }

  .empty-state {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.35);
    margin: 0.5rem 0;
  }

  /* ── Footer ── */
  .card-footer {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    width: 100%;
    text-align: center;
  }

  .devcard-branding {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.3);
    text-decoration: none;
    letter-spacing: 0.03em;
  }

  .devcard-branding:hover {
    color: rgba(255, 255, 255, 0.6);
  }
</style>
