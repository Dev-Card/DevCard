<script lang="ts">
	import type { PageData } from './$types';
	import { dev } from '$app/environment';

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

	function isValidAvatar(url: string | null | undefined): boolean {
		if (!url) return false;
		try {
			const lowerUrl = url.toLowerCase().trim();
			if (lowerUrl.startsWith('javascript:')) return false;
			return lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://') || lowerUrl.startsWith('/') || lowerUrl.startsWith('data:image/');
		} catch {
			return false;
		}
	}

	const dailyViewsData = (() => {
		if (!views?.data) return [];
		const days = Array.from({ length: 7 }, (_, i) => {
			const d = new Date();
			d.setDate(d.getDate() - i);
			return d.toISOString().split('T')[0];
		}).reverse();

		const counts = days.reduce((acc, day) => {
			acc[day] = 0;
			return acc;
		}, {} as Record<string, number>);

		views.data.forEach(v => {
			if (!v.createdAt) return;
			const day = v.createdAt.split('T')[0];
			if (day in counts) {
				counts[day]++;
			}
		});

		return days.map(day => ({
			label: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
			count: counts[day]
		}));
	})();

	const maxViews = Math.max(...dailyViewsData.map(d => d.count), 5);

	const chartPoints = dailyViewsData.map((d, i) => {
		const x = (i / 6) * 440 + 30;
		const y = 170 - (d.count / maxViews) * 120;
		return { x, y, ...d };
	});

	const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
	const areaPath = chartPoints.length ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} 170 L ${chartPoints[0].x} 170 Z` : '';

	const platformClicks = (() => {
		if (!views?.data) return [];
		const counts = {} as Record<string, number>;
		views.data.forEach(v => {
			const src = v.source || 'Direct';
			counts[src] = (counts[src] || 0) + 1;
		});
		return Object.entries(counts)
			.map(([platform, count]) => ({ platform, count }))
			.sort((a, b) => b.count - a.count);
	})();

	function downloadCSV() {
		if (!views?.data) return;
		const headers = ['Viewer Name', 'Username', 'Card Title', 'Source', 'IP Address', 'Date'];
		const rows = views.data.map(v => [
			v.viewer?.displayName || 'Guest',
			v.viewer?.username ? `@${v.viewer.username}` : '',
			v.card?.title || 'Profile',
			v.source,
			v.viewerIp || '',
			v.createdAt
		]);
		const csvContent = [headers, ...rows]
			.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
			.join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', `devcard_analytics_${new Date().toISOString().split('T')[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
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
			<div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
				<a href="/" class="btn-secondary" style="border: 1px solid var(--border); padding: 0.75rem 1.5rem; border-radius: var(--radius); text-decoration: none; color: var(--text-secondary);">Return Home</a>
				{#if dev}
					<a href="http://localhost:3000/auth/dev-login" class="btn-primary" style="background: var(--primary); color: white; padding: 0.75rem 1.5rem; border-radius: var(--radius); text-decoration: none; font-weight: 600; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);">Dev Login Bypass</a>
				{/if}
			</div>
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

		<!-- Visual Insights: Daily Chart & Platform Clicks -->
		<div class="insights-grid">
			<section class="content-block chart-block">
				<div class="block-header">
					<h3>Daily Views (Last 7 Days)</h3>
					<span class="badge secondary">Interactive</span>
				</div>
				<div class="chart-container">
					{#if dailyViewsData.length > 0}
						<svg viewBox="0 0 500 200" class="chart-svg">
							<defs>
								<linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="var(--primary)" stop-opacity="0.25"/>
									<stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0"/>
								</linearGradient>
							</defs>
							<!-- Grid horizontal lines -->
							<line x1="20" y1="40" x2="480" y2="40" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3" />
							<line x1="20" y1="90" x2="480" y2="90" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3" />
							<line x1="20" y1="140" x2="480" y2="140" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 3" />
							<line x1="20" y1="170" x2="480" y2="170" stroke="var(--border)" stroke-width="1" />

							<!-- Polyline Area (Fill) -->
							{#if areaPath}
								<path d={areaPath} fill="url(#chart-grad)" />
							{/if}

							<!-- Polyline Path (Line) -->
							{#if linePath}
								<path d={linePath} fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
							{/if}

							<!-- Interactive Data points -->
							{#each chartPoints as pt}
								<g class="chart-point-group">
									<circle cx={pt.x} cy={pt.y} r="5" fill="var(--bg-card)" stroke="var(--primary)" stroke-width="3" class="chart-point" />
									<text x={pt.x} y={pt.y - 12} text-anchor="middle" class="chart-value" font-size="10" font-weight="700" fill="var(--text-primary)">
										{pt.count}
									</text>
								</g>
							{/each}

							<!-- X-Axis Labels -->
							{#each chartPoints as pt}
								<text x={pt.x} y="190" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-muted)">
									{pt.label}
								</text>
							{/each}
						</svg>
					{:else}
						<div class="empty-text">No view statistics available yet.</div>
					{/if}
				</div>
			</section>

			<section class="content-block platform-block">
				<div class="block-header">
					<h3>Platform Click Rankings</h3>
					<span class="badge secondary">Real-time</span>
				</div>
				<div class="platform-list">
					{#each platformClicks as item, index}
						<div class="platform-row">
							<div class="platform-meta">
								<span class="platform-name">
									<span class="rank">#{index + 1}</span> {item.platform}
								</span>
								<span class="platform-count">{item.count} clicks</span>
							</div>
							<div class="progress-bar-container">
								<div class="progress-bar-fill" style="width: {(item.count / Math.max(...platformClicks.map(p => p.count), 1)) * 100}%; background: linear-gradient(to right, var(--primary), var(--primary-light));"></div>
							</div>
						</div>
					{/each}
					{#if platformClicks.length === 0}
						<p class="empty-text">No platform click details available yet.</p>
					{/if}
				</div>
			</section>
		</div>

		<div class="dashboard-grid">
			<!-- Recent Views -->
			<section class="content-block">
				<h3>Recent Activity</h3>
				<div class="activity-list">
					{#each overview.recentViews as view}
						<div class="activity-item">
							<div class="activity-avatar">
								{#if isValidAvatar(view.viewer?.avatarUrl)}
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
				<div class="block-header table-header">
					<div class="title-meta">
						<h3>Detailed View Logs</h3>
						<span class="badge">{views?.meta?.total || 0} Total</span>
					</div>
					<button onclick={downloadCSV} class="btn-csv-download" title="Export current logs as CSV">
						<svg class="csv-icon" viewBox="0 0 24 24" width="16" height="16">
							<path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
						</svg>
						Export CSV
					</button>
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

	/* Insights Row Grid */
	.insights-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.chart-block, .platform-block {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		transition: border-color 0.2s;
	}

	.chart-block:hover, .platform-block:hover {
		border-color: var(--primary-light);
	}

	.chart-container {
		width: 100%;
		padding-top: 1rem;
	}

	.chart-svg {
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.chart-point {
		transition: r 0.2s ease, stroke-width 0.2s ease;
		cursor: pointer;
	}

	.chart-point-group:hover .chart-point {
		r: 7;
		stroke-width: 4px;
	}

	.chart-value {
		opacity: 0;
		transition: opacity 0.2s ease, transform 0.2s ease;
		pointer-events: none;
	}

	.chart-point-group:hover .chart-value {
		opacity: 1;
	}

	/* Platform Progress Clicks */
	.platform-list {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-top: 0.5rem;
	}

	.platform-row {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.platform-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
		align-items: center;
	}

	.platform-name {
		font-weight: 700;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.rank {
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 800;
		background: rgba(99, 102, 241, 0.1);
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
	}

	.platform-count {
		font-weight: 600;
		color: var(--text-muted);
	}

	.progress-bar-container {
		width: 100%;
		height: 8px;
		background: var(--bg-secondary);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		border-radius: 4px;
		transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* CSV Export Button */
	.btn-csv-download {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		padding: 0.5rem 1rem;
		border-radius: var(--radius);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-csv-download:hover {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
		box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
	}

	.csv-icon {
		transition: transform 0.2s;
	}

	.btn-csv-download:hover .csv-icon {
		transform: translateY(1px);
	}

	.badge.secondary {
		background: rgba(99, 102, 241, 0.1);
		color: var(--primary);
		border: 1px solid rgba(99, 102, 241, 0.2);
	}

	.title-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.table-header {
		margin-bottom: 1.5rem;
	}

	@media (max-width: 1024px) {
		.insights-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
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
