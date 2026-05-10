<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { overview, views, error } = data;

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Analytics Dashboard — DevCard</title>
</svelte:head>

<main class="analytics-container">
	<header class="dashboard-header">
		<div class="header-content">
			<h1>Analytics Dashboard</h1>
			<p class="subtitle">Track your DevCard performance and reach.</p>
		</div>
		<div class="header-actions">
			<a href="/" class="btn-back">← Back to Home</a>
		</div>
	</header>

	{#if error}
		<div class="error-state">
			<div class="error-icon">🔒</div>
			<h2>{error}</h2>
			<p>Accessing the dashboard requires an active session.</p>
			<a href="/" class="btn-primary">Return Home</a>
		</div>
	{:else if overview}
		<!-- KPI Overview -->
		<section class="stats-grid">
			<div class="stat-card">
				<span class="stat-label">Total Views</span>
				<div class="stat-value">{overview.totalViews}</div>
				<div class="stat-footer">Lifetime views</div>
			</div>
			<div class="stat-card accent">
				<span class="stat-label">Views Today</span>
				<div class="stat-value">{overview.viewsToday}</div>
				<div class="stat-footer">Last 24 hours</div>
			</div>
			<div class="stat-card">
				<span class="stat-label">Unique Viewers</span>
				<div class="stat-value">{overview.uniqueViewers}</div>
				<div class="stat-footer">By IP & Account</div>
			</div>
			<div class="stat-card">
				<span class="stat-label">Total Follows</span>
				<div class="stat-value">{overview.totalFollows}</div>
				<div class="stat-footer">Success via engine</div>
			</div>
		</section>

		<div class="dashboard-grid">
			<!-- Recent Views -->
			<section class="content-block">
				<h3>Recent Activity</h3>
				<div class="activity-list">
					{#each overview.recentViews as view}
						<div class="activity-item">
							<div class="activity-avatar">
								{#if view.viewer?.avatarUrl}
									<img src={view.viewer.avatarUrl} alt="" />
								{:else}
									<div class="avatar-placeholder">{view.viewer?.displayName?.charAt(0) || '?'}</div>
								{/if}
							</div>
							<div class="activity-info">
								<span class="viewer-name">{view.viewer?.displayName || 'Anonymous User'}</span>
								<span class="view-source">viewed via {view.source}</span>
							</div>
							<div class="activity-time">{formatDate(view.createdAt)}</div>
						</div>
					{/each}
					{#if overview.recentViews.length === 0}
						<p class="empty-text">No recent activity found.</p>
					{/if}
				</div>
			</section>

			<!-- Detailed Views Table -->
			<section class="content-block table-block">
				<div class="block-header">
					<h3>Detailed View Logs</h3>
					<span class="badge">{views?.meta?.total || 0} Total</span>
				</div>
				<div class="table-container">
					<table>
						<thead>
							<tr>
								<th>Viewer</th>
								<th>Card</th>
								<th>Source</th>
								<th>IP Address</th>
								<th>Date</th>
							</tr>
						</thead>
						<tbody>
							{#each views?.data || [] as view}
								<tr>
									<td>
										<div class="user-cell">
											<span class="name">{view.viewer?.displayName || 'Guest'}</span>
											{#if view.viewer?.username}
												<span class="username">@{view.viewer.username}</span>
											{/if}
										</div>
									</td>
									<td>{view.card?.title || 'Profile'}</td>
									<td><span class="source-tag">{view.source}</span></td>
									<td><code>{view.viewerIp || '—'}</code></td>
									<td>{formatDate(view.createdAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if !views?.data?.length}
						<div class="empty-table">No detailed logs available yet.</div>
					{/if}
				</div>
			</section>
		</div>
	{/if}
</main>

<style>
	.analytics-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		min-height: 100vh;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 3rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 800;
		letter-spacing: -1px;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 1.1rem;
	}

	.btn-back {
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.9rem;
		padding: 0.5rem 1rem;
		border-radius: var(--radius);
		transition: all 0.2s;
	}

	.btn-back:hover {
		color: var(--primary);
		background: var(--bg-secondary);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.stat-card {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		transition: transform 0.2s, border-color 0.2s;
	}

	.stat-card:hover {
		transform: translateY(-4px);
		border-color: var(--primary-light);
	}

	.stat-card.accent {
		border-color: var(--primary);
		background: linear-gradient(to bottom right, var(--bg-card), var(--bg-secondary));
	}

	.stat-label {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		font-size: 2.5rem;
		font-weight: 800;
		color: var(--text-primary);
	}

	.stat-footer {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	/* Dashboard Layout */
	.dashboard-grid {
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 2rem;
	}

	.content-block {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}

	.content-block h3 {
		font-size: 1.2rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
	}

	/* Activity List */
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.activity-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		border-radius: var(--radius);
		background: var(--bg-secondary);
	}

	.activity-avatar img, .avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--bg-elevated);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.activity-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.viewer-name {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.view-source {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.activity-time {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	/* Table */
	.table-block {
		overflow: hidden;
	}

	.block-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.badge {
		background: var(--primary);
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
	}

	.table-container {
		width: 100%;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th {
		text-align: left;
		padding: 1rem;
		border-bottom: 1px solid var(--border);
		color: var(--text-muted);
		font-weight: 600;
		background: var(--bg-secondary);
	}

	td {
		padding: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.user-cell {
		display: flex;
		flex-direction: column;
	}

	.user-cell .name { font-weight: 600; }
	.user-cell .username { font-size: 0.8rem; color: var(--text-muted); }

	.source-tag {
		background: var(--bg-elevated);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	code {
		font-family: monospace;
		color: var(--text-secondary);
		background: var(--bg-secondary);
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
	}

	.empty-text, .empty-table {
		text-align: center;
		color: var(--text-muted);
		padding: 2rem;
		font-style: italic;
	}

	/* Error State */
	.error-state {
		text-align: center;
		padding: 5rem 2rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		max-width: 500px;
		margin: 4rem auto;
	}

	.error-icon { font-size: 4rem; margin-bottom: 1.5rem; }
	.error-state h2 { margin-bottom: 1rem; }
	.error-state p { color: var(--text-secondary); margin-bottom: 2rem; }

	.btn-primary {
		background: var(--primary);
		color: white;
		padding: 0.75rem 2rem;
		border-radius: var(--radius);
		font-weight: 700;
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
	}

	@media (max-width: 1024px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.analytics-container { padding: 1rem; }
		.dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
		h1 { font-size: 2rem; }
	}
</style>
