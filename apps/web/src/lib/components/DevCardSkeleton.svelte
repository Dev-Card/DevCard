<script lang="ts">
	import SkeletonBlock from './SkeletonBlock.svelte';

	let { linkCount = 3 }: { linkCount?: number } = $props();
</script>

<div class="card-wrapper" aria-hidden="true">
	<div class="premium-card skeleton-premium">
		<div class="card-glass"></div>

		<div class="card-top">
			<div class="brand-row">
				<SkeletonBlock style="width: 40px; height: 24px;" rounded="8px" />
				<SkeletonBlock style="width: 82px; height: 0.75rem;" />
			</div>
			<SkeletonBlock style="width: 24px; height: 24px; opacity: 0.35;" rounded="6px" />
		</div>

		<div class="card-mid">
			<SkeletonBlock class="avatar-skeleton" style="width: 92px; height: 92px; flex-shrink: 0;" rounded="28px" />
			<div class="main-info">
				<SkeletonBlock style="width: 62%; height: 2.2rem; margin-bottom: 0.65rem;" />
				<SkeletonBlock style="width: 48%; height: 0.9rem; margin-bottom: 0.45rem;" />
				<SkeletonBlock style="width: 26%; height: 0.8rem; opacity: 0.6;" />
			</div>
		</div>

		<div class="card-bottom">
			<div class="bio-lines">
				<SkeletonBlock style="width: 90%; height: 0.85rem;" />
				<SkeletonBlock style="width: 66%; height: 0.85rem;" />
			</div>
			<SkeletonBlock style="width: 82px; height: 36px;" rounded="14px" />
		</div>
	</div>

	<div class="action-section">
		<SkeletonBlock style="width: 104px; height: 0.75rem; margin-bottom: 0.85rem;" />
		<div class="platform-grid">
			{#each Array(linkCount) as _}
				<div class="platform-tile skeleton-tile">
					<SkeletonBlock style="width: 44px; height: 44px; flex-shrink: 0;" rounded="16px" />
					<div class="tile-copy">
						<SkeletonBlock style="width: 42%; height: 0.9rem;" />
						<SkeletonBlock style="width: 30%; height: 0.75rem; opacity: 0.6;" />
					</div>
				</div>
			{/each}
		</div>
	</div>

	<footer class="footer">
		<SkeletonBlock style="width: 144px; height: 0.85rem; margin: 0 auto; opacity: 0.55;" />
	</footer>
</div>

<style>
	.card-wrapper {
		width: 100%;
		max-width: 560px;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

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
		pointer-events: none;
	}

	.card-glass {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
		pointer-events: none;
	}

	.card-top,
	.card-mid,
	.card-bottom {
		position: relative;
		z-index: 1;
	}

	.card-top,
	.brand-row,
	.card-mid,
	.platform-tile {
		display: flex;
		align-items: center;
	}

	.card-top {
		justify-content: space-between;
		gap: 1rem;
	}

	.brand-row {
		gap: 0.85rem;
	}

	.card-mid {
		gap: 22px;
		margin-top: 1.75rem;
	}

	.main-info {
		width: 100%;
		min-width: 0;
	}

	.card-bottom {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 1rem;
		margin-top: 2rem;
		flex-wrap: wrap;
	}

	.bio-lines {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		min-width: 180px;
	}

	.platform-grid {
		display: flex;
		flex-direction: column;
		gap: 0.95rem;
	}

	.platform-tile {
		width: 100%;
		border-radius: 20px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.08);
		pointer-events: none;
	}

	.tile-copy {
		flex: 1;
		margin-left: 16px;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 0;
	}

	.footer {
		text-align: center;
		margin-top: 24px;
	}

	@media (max-width: 780px) {
		.card-wrapper {
			max-width: 100%;
		}

		.premium-card {
			min-height: auto;
			padding: 28px;
		}

		.card-mid,
		.card-bottom {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 560px) {
		.platform-tile {
			padding: 14px;
		}
	}
</style>
