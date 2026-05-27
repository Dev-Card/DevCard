<script lang="ts">
	let {
		class: className = '',
		style = '',
		rounded = '8px'
	}: {
		class?: string;
		style?: string;
		rounded?: string;
	} = $props();
</script>

<span
	class={`skeleton-block ${className}`.trim()}
	style={`border-radius: ${rounded}; ${style}`}
	aria-hidden="true"
></span>

<style>
	@keyframes skeleton-shimmer {
		0% {
			background-position: -200% center;
		}

		100% {
			background-position: 200% center;
		}
	}

	.skeleton-block {
		display: block;
		background: linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.06) 25%,
			rgba(255, 255, 255, 0.14) 50%,
			rgba(255, 255, 255, 0.06) 75%
		);
		background-size: 200% 100%;
		animation: skeleton-shimmer 1.55s ease-in-out infinite;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-block {
			animation: none;
			background-position: center;
		}
	}
</style>
