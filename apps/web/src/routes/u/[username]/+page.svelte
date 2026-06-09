<script lang="ts">
  export let data: { profile?: { displayName: string; avatarUrl: string }; error?: string };
</script>

{#if data?.error}
  <div>{data.error}</div>
{:else if data?.profile}
  <div>{data.profile.displayName}</div>
  <img src={data.profile.avatarUrl} alt="avatar" />
{/if}
