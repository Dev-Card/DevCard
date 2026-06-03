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
		background: #0f0f1a;
		font-family: 'Inter', -apple-system, sans-serif;
		color: #f8fafc;
	}

	.page-container {
		min-height: 100vh;
		display: flex;
		justify-content: center;
		padding: 40px 20px;
	}

	.card-wrapper {
		width: 100%;
		max-width: 500px;
	}

	/* Premium Card Styles */
	.premium-card {
		background: #0f172a;
		aspect-ratio: 1.58;
		border-radius: 24px;
		padding: 32px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		position: relative;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.2);
		margin-bottom: 48px;
	}

	.card-glass {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
		pointer-events: none;
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.brand-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.mini-chip {
		width: 36px;
		height: 24px;
		background: #94a3b8;
		opacity: 0.4;
		border-radius: 4px;
	}

	.brand-text {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.5);
	}

	.contactless {
		font-size: 20px;
		opacity: 0.3;
	}

	.card-mid {
		display: flex;
		align-items: center;
		gap: 24px;
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 40px;
		border: 2px solid rgba(255, 255, 255, 0.1);
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 80px;
		height: 80px;
		border-radius: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 36px;
		font-weight: 800;
		color: white;
	}

	.main-info h1 {
		margin: 0;
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.5px;
	}

	.role {
		margin: 4px 0 0 0;
		font-size: 14px;
		color: #94a3b8;
		font-weight: 500;
	}

	.pronouns {
		margin: 4px 0 0 0;
		font-size: 10px;
		color: #64748b;
		font-style: italic;
	}

	.card-bottom {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}

	.bio-text {
		margin: 0;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.4);
		max-width: 250px;
		line-height: 1.4;
	}

	.card-badge {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 4px 10px;
		border-radius: 6px;
	}

	.card-badge span {
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 1.5px;
		color: rgba(255, 255, 255, 0.6);
	}

	/* Action Section */
	h2 {
		font-size: 14px;
		text-transform: uppercase;
		letter-spacing: 1.5px;
		color: #64748b;
		margin-bottom: 16px;
	}

	.platform-grid {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.platform-tile {
		background: #16213e;
		border: 1px solid #1e293b;
		border-radius: 16px;
		padding: 16px;
		display: flex;
		align-items: center;
		cursor: pointer;
		transition: transform 0.2s, background-color 0.2s;
		color: inherit;
		text-align: left;
		width: 100%;
	}

	.platform-tile:hover {
		background: #1a2a4a;
		transform: translateY(-2px);
	}

	.tile-icon {
		width: 44px;
		height: 44px;
		background: var(--brand-color);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		font-weight: 800;
		color: white;
	}

	.tile-info {
		flex: 1;
		margin-left: 16px;
		display: flex;
		flex-direction: column;
	}

	.platform-name {
		font-size: 16px;
		font-weight: 700;
	}

	.username {
		font-size: 13px;
		color: #94a3b8;
		margin-top: 2px;
	}

	.tile-arrow {
		font-size: 18px;
		color: #334155;
	}

	.footer {
		text-align: center;
		margin-top: 60px;
		font-size: 11px;
		color: #334155;
	}

	.footer a {
		color: #6366F1;
		text-decoration: none;
		font-weight: 600;
	}
</style>
