<script lang="ts">
  import { generateVCard, type PublicProfile } from '@devcard/shared';
  import { page } from '$app/stores';

  let { profile }: { profile: PublicProfile } = $props();

  let loading = $state(false);
  let errorMsg = $state('');

  function handleSaveContact() {
    loading = true;
    errorMsg = '';
    
    try {
      const devcardUrl = $page.url.href;
      
      const vcardContent = generateVCard({
        displayName: profile.displayName,
        username: profile.username,
        bio: profile.bio,
        pronouns: profile.pronouns,
        role: profile.role,
        company: profile.company,
        avatarUrl: profile.avatarUrl,
        links: profile.links,
        devcardUrl,
      });

      const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${profile.username || 'contact'}.vcf`);
      
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate contact card:', err);
      errorMsg = 'Failed to generate contact card.';
    } finally {
      loading = false;
    }
  }
</script>

<button
  type="button"
  class="save-contact-btn glass"
  onclick={handleSaveContact}
  disabled={loading}
  aria-label="Save {profile.displayName}'s contact information to your device"
>
  {#if loading}
    <span class="spinner" aria-hidden="true"></span>
    Saving...
  {:else}
    <span class="icon" aria-hidden="true">📥</span>
    Save Contact
  {/if}
</button>

{#if errorMsg}
  <p class="error-text" role="alert">{errorMsg}</p>
{/if}

<style>
  .save-contact-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border-glass);
    color: var(--text-primary);
    transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
    margin-top: 1rem;
    width: 100%;
    max-width: 240px;
  }

  .save-contact-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(99, 102, 241, 0.35);
    transform: translateY(-2px);
  }

  .save-contact-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .save-contact-btn:focus-visible {
    outline: 3px solid var(--primary-glow);
    outline-offset: 3px;
  }

  .save-contact-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .icon {
    font-size: 1.1rem;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-text {
    color: #ef4444;
    font-size: 0.85rem;
    margin-top: 0.5rem;
    font-weight: 500;
  }
</style>
