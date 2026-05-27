<script lang="ts">
	import SkeletonBlock from './SkeletonBlock.svelte';

	let { linkCount = 3 }: { linkCount?: number } = $props();
</script>

<div class="profile-container" aria-hidden="true">
	<div class="profile-card glass skeleton-card">
		<header class="profile-header">
			<div class="avatar-wrapper">
				<SkeletonBlock class="avatar-skeleton" style="width: 100%; height: 100%;" rounded="32% 68% 63% 37% / 34% 36% 64% 66%" />
			</div>
			<SkeletonBlock style="width: 55%; height: 2rem; margin: 0 auto 0.75rem;" />
			<SkeletonBlock style="width: 38%; height: 1.1rem; margin: 0 auto 1rem;" rounded="999px" />
			<SkeletonBlock style="width: 80%; height: 0.9rem; margin: 0 auto 0.55rem;" />
			<SkeletonBlock style="width: 55%; height: 0.9rem; margin: 0 auto;" />
		</header>

		<div class="links-grid">
			{#each Array(linkCount) as _}
				<div class="link-tile skeleton-tile">
					<SkeletonBlock style="width: 46px; height: 46px; flex-shrink: 0;" rounded="15px" />
					<div class="tile-copy">
						<SkeletonBlock style="width: 45%; height: 0.9rem;" />
						<SkeletonBlock style="width: 30%; height: 0.75rem; opacity: 0.6;" />
					</div>
				</div>
			{/each}
		</div>

		<footer class="card-footer">
			<SkeletonBlock style="width: 112px; height: 0.75rem;" />
			<SkeletonBlock style="width: 72px; height: 0.75rem;" />
		</footer>
	</div>
</div>

<style>
	.profile-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: clamp(2rem, 6vw, 5rem) 1.25rem 3rem;
	}

	.profile-card {
		width: 100%;
		max-width: 540px;
		border-radius: var(--radius-xl);
		padding: 2.5rem 2rem;
		box-shadow: 0 26px 60px -20px rgba(0, 0, 0, 0.55);
		position: relative;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(15, 23, 42, 0.96);
		pointer-events: none;
	}

	.profile-header {
		text-align: center;
		margin-bottom: 2.5rem;
	}

	.avatar-wrapper {
		position: relative;
		width: 120px;
		height: 120px;
		margin: 0 auto 1.75rem;
	}

	.links-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.link-tile {
		display: flex;
		align-items: center;
		padding: 1rem;
		border-radius: calc(var(--radius) * 1.1);
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.06);
		box-shadow: 0 12px 30px -18px rgba(0, 0, 0, 0.35);
	}

	.tile-copy {
		flex: 1;
		margin-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		min-width: 0;
	}

	.card-footer {
		margin-top: 2.5rem;
		padding-top: 1.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		opacity: 0.55;
	}

	@media (max-width: 720px) {
		.profile-card {
			padding: 2rem 1.5rem;
		}

		.profile-header {
			margin-bottom: 2rem;
		}

		.avatar-wrapper {
			width: 108px;
			height: 108px;
			margin-bottom: 1.5rem;
		}

		.card-footer {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 520px) {
		.profile-container {
			padding: 2rem 1rem 2.5rem;
		}

		.link-tile {
			padding: 0.95rem;
		}

		.tile-copy {
			margin-left: 0.9rem;
		}
	}
</style>
