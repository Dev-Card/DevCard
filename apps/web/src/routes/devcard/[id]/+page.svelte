<script lang="ts">
	let { data } = $props();
	const card = $derived(data.card);

	function getPlatformColor(platform: string) {
		const colors: Record<string, string> = {
			github: '#181717',
			linkedin: '#0A66C2',
			twitter: '#000000',
			instagram: '#E4405F',
			youtube: '#FF0000',
			devto: '#0A0A0A',
			hashnode: '#2962FF'
		};
		return colors[platform.toLowerCase()] || '#6366F1';
	}

	function handlePlatformClick(link: any) {
		window.open(link.url, '_blank');
	}
</script>

<svelte:head>
	<title>{card.title} | {card.owner.displayName}</title>
	<meta name="description" content="View the DevCard of {card.owner.displayName}" />
</svelte:head>

<div class="page-container">
	<div class="card-wrapper">
		<!-- Premium Obsidian Card -->
		<div class="premium-card">
			<div class="card-glass"></div>
			
			<div class="card-top">
				<div class="brand-row">
					<div class="mini-chip"></div>
					<span class="brand-text">DevCard PRO</span>
				</div>
				<span class="contactless">📶</span>
			</div>

			<div class="card-mid">
				<div class="avatar-container">
					{#if card.owner.avatarUrl}
						<img src={card.owner.avatarUrl} alt={card.owner.displayName} class="avatar" />
					{:else}
						<div class="avatar-placeholder" style="background: {card.owner.accentColor || '#6366F1'}">
							{card.owner.displayName.charAt(0).toUpperCase()}
						</div>
					{/if}
				</div>
				<div class="main-info">
					<h1>{card.owner.displayName}</h1>
					<p class="role">
						{card.owner.role || 'Developer'}{card.owner.company ? ` @ ${card.owner.company}` : ''}
					</p>
					{#if card.owner.pronouns}
						<p class="pronouns">{card.owner.pronouns}</p>
					{/if}
				</div>
			</div>

			<div class="card-bottom">
				<div class="bio-container">
					{#if card.owner.bio}
						<p class="bio-text">{card.owner.bio}</p>
					{/if}
				</div>
				<div class="card-badge">
					<span>PLATINUM</span>
				</div>
			</div>
		</div>

		<!-- Action Section -->
		<div class="action-section">
			<h2>Connections</h2>
			<div class="platform-grid">
				{#each card.links as link}
					<button 
						class="platform-tile" 
						onclick={() => handlePlatformClick(link)}
						style="--brand-color: {getPlatformColor(link.platform)}"
					>
						<div class="tile-icon">
							{link.platform.charAt(0).toUpperCase()}
						</div>
						<div class="tile-info">
							<span class="platform-name">{link.platform}</span>
							<span class="username">@{link.username}</span>
						</div>
						<div class="tile-arrow">→</div>
					</button>
				{/each}
			</div>
		</div>
		
		<footer class="footer">
			<p>Powered by <a href="/">DevCard</a> ⚡</p>
		</footer>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		background: radial-gradient(circle at top, rgba(99, 102, 241, 0.08), transparent 20%), #0f1222;
		font-family: 'Inter', -apple-system, sans-serif;
		color: #f8fafc;
	}

	.page-container {
		min-height: 100vh;
		display: flex;
		justify-content: center;
		padding: clamp(2rem, 6vw, 4rem) 1.25rem;
	}

	.card-wrapper {
		width: 100%;
		max-width: 560px;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	/* Premium Card Styles */
	.premium-card {
		background: rgba(15, 23, 42, 0.96);
		border-radius: 32px;
		padding: 34px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		position: relative;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 32px 80px -28px rgba(0, 0, 0, 0.65);
		min-height: 520px;
	}

	.card-glass {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
		pointer-events: none;
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.brand-row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: rgba(255, 255, 255, 0.68);
	}

	.mini-chip {
		width: 40px;
		height: 24px;
		background: rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
	}

	.brand-text {
		font-weight: 800;
	}

	.contactless {
		font-size: 22px;
		opacity: 0.35;
	}

	.card-mid {
		display: flex;
		align-items: center;
		gap: 22px;
		margin-top: 1.75rem;
	}

	.avatar {
		width: 92px;
		height: 92px;
		border-radius: 28px;
		border: 2px solid rgba(255, 255, 255, 0.12);
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 92px;
		height: 92px;
		border-radius: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.2rem;
		font-weight: 800;
		color: white;
		background: rgba(99, 102, 241, 0.18);
	}

	.main-info h1 {
		margin: 0;
		font-size: clamp(2.1rem, 4vw, 2.5rem);
		font-weight: 800;
		letter-spacing: -0.6px;
	}

	.role {
		margin: 0.45rem 0 0;
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.76);
		font-weight: 500;
	}

	.pronouns {
		margin: 0.35rem 0 0;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.62);
		font-style: italic;
	}

	.card-bottom {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		margin-top: 2rem;
		flex-wrap: wrap;
	}

	.bio-text {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.75;
		color: rgba(255, 255, 255, 0.72);
		max-width: 320px;
	}

	.card-badge {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		padding: 8px 14px;
		border-radius: 14px;
	}

	.card-badge span {
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		color: rgba(255, 255, 255, 0.72);
		text-transform: uppercase;
	}

	/* Action Section */
	h2 {
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.2em;
		color: rgba(148, 163, 184, 0.95);
		margin: 0 0 0.85rem;
	}

	.platform-grid {
		display: flex;
		flex-direction: column;
		gap: 0.95rem;
	}

	.platform-tile {
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		padding: 16px;
		display: flex;
		align-items: center;
		width: 100%;
		cursor: pointer;
		transition: transform 0.24s ease, background-color 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;
	}

	.platform-tile:hover {
		transform: translateY(-2px);
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(99, 102, 241, 0.3);
		box-shadow: 0 18px 30px -18px rgba(0, 0, 0, 0.55);
	}

	.platform-tile:focus-visible {
		outline: 3px solid rgba(99, 102, 241, 0.18);
		outline-offset: 3px;
	}

	.tile-icon {
		width: 44px;
		height: 44px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--brand-color);
		color: #fff;
		font-size: 1.05rem;
		font-weight: 800;
		box-shadow: 0 10px 20px -12px rgba(0, 0, 0, 0.4);
	}

	.tile-info {
		flex: 1;
		margin-left: 16px;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.platform-name {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: #f8fafc;
	}

	.username {
		font-size: 0.91rem;
		color: rgba(148, 163, 184, 0.95);
		margin-top: 0.2rem;
	}

	.tile-arrow {
		font-size: 1.35rem;
		color: rgba(148, 163, 184, 0.8);
		transition: transform 0.24s ease, opacity 0.24s ease;
	}

	.platform-tile:hover .tile-arrow {
		transform: translateX(5px);
		opacity: 1;
	}

	.footer {
		text-align: center;
		margin-top: 24px;
		font-size: 0.92rem;
		color: rgba(148, 163, 184, 0.95);
	}

	.footer a {
		color: #6366F1;
		font-weight: 700;
		text-decoration: none;
	}

	@media (max-width: 780px) {
		.card-wrapper { max-width: 100%; }
		.premium-card { min-height: auto; padding: 28px; }
		.card-mid { flex-direction: column; align-items: flex-start; }
		.card-bottom { flex-direction: column; align-items: flex-start; }
	}

	@media (max-width: 560px) {
		.page-container { padding: 2rem 1rem; }
		.main-info h1 { font-size: 2rem; }
		.tile-icon { width: 42px; height: 42px; }
		.platform-tile { padding: 14px; }
	}
</style>
