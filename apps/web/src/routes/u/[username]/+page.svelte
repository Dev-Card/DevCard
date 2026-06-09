<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;
</script>

{#if data?.error}
  <div>{data.error}</div>
{:else if data?.profile}
  <div>{data.profile.displayName}</div>
  <img src={data.profile.avatarUrl} alt="avatar" />
{/if}
