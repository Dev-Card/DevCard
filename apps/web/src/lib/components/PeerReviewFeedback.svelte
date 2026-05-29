<script lang="ts">
  let showForm = $state(false);
  let feedbackText = $state('');
  let selectTeammate = $state('alice');
  let selectRating = $state(5);
  let reviews = $state([
    { reviewer: 'Alice (Tech Lead)', rating: 5, date: '2026-05-24', comment: 'Exemplary Svelte 5 design. Extremely clean runes implementation and state management.', sentiment: 'positive' },
    { reviewer: 'Bob (PM)', rating: 4, date: '2026-05-22', comment: 'Highly intuitive dashboard updates. Tremendous improvement in DX features.', sentiment: 'positive' },
    { reviewer: 'Charlie (DevOps)', rating: 5, date: '2026-05-18', comment: 'Flawless commit hygiene. PGP signatures and clean rebases make releases a breeze.', sentiment: 'positive' }
  ]);

  let avgRating = $derived((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1));

  function submitFeedback() {
    if (!feedbackText.trim()) return;
    
    const names: Record<string, string> = {
      alice: 'Alice (Tech Lead)',
      bob: 'Bob (PM)',
      charlie: 'Charlie (DevOps)'
    };

    reviews = [
      {
        reviewer: names[selectTeammate] || 'Teammate',
        rating: Number(selectRating),
        date: new Date().toISOString().split('T')[0],
        comment: feedbackText,
        sentiment: 'positive'
      },
      ...reviews
    ];

    feedbackText = '';
    showForm = false;
  }
</script>

<div class="peer-feedback glass">
  <div class="card-header">
    <span class="header-icon">💬</span>
    <div class="title-area">
      <h3>Peer Review Ecosystem</h3>
      <span class="sub">Teammate Sentiment & Feedback Stream</span>
    </div>
  </div>

  <div class="sentiment-summary">
    <div class="rating-display">
      <span class="rating-number">{avgRating}</span>
      <div class="rating-stars-group">
        <span class="stars">⭐⭐⭐⭐⭐</span>
        <span class="label">Avg rating ({reviews.length} reviews)</span>
      </div>
    </div>
    <div class="sentiment-bar-chart">
      <div class="chart-header">
        <span class="pct">92% Positive</span>
        <span class="lbl">Sentiment Sync</span>
      </div>
      <div class="track">
        <div class="fill" style="width: 92%;"></div>
      </div>
    </div>
  </div>

  <div class="reviews-feed">
    {#each reviews as review}
      <div class="review-card">
        <div class="review-header">
          <span class="reviewer-name">{review.reviewer}</span>
          <span class="review-date">{review.date}</span>
        </div>
        <div class="review-rating">
          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
        </div>
        <p class="review-comment">"{review.comment}"</p>
      </div>
    {/each}
  </div>

  <div class="feedback-actions">
    {#if !showForm}
      <button class="request-btn" onclick={() => showForm = true}>
        Request Teammate Review
      </button>
    {:else}
      <div class="feedback-form-box glass">
        <div class="form-header">
          <h4>Request Feedback</h4>
          <button class="close-form-btn" onclick={() => showForm = false}>×</button>
        </div>
        
        <div class="form-group">
          <label for="select-teammate">Recipient</label>
          <select id="select-teammate" bind:value={selectTeammate}>
            <option value="alice">Alice (Tech Lead)</option>
            <option value="bob">Bob (PM)</option>
            <option value="charlie">Charlie (DevOps)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="select-rating">Rating</label>
          <select id="select-rating" bind:value={selectRating}>
            <option value={5}>5 Stars</option>
            <option value={4}>4 Stars</option>
            <option value={3}>3 Stars</option>
          </select>
        </div>

        <div class="form-group">
          <label for="feedback-text">Message Context</label>
          <textarea id="feedback-text" bind:value={feedbackText} placeholder="Provide message context (e.g. recent Svelte refactor reviews)..."></textarea>
        </div>

        <button class="submit-btn" onclick={submitFeedback}>
          Submit Request
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .peer-feedback {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    height: 100%;
    min-height: 380px;
    justify-content: space-between;
    position: relative;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .header-icon {
    font-size: 1.5rem;
  }

  .title-area {
    display: flex;
    flex-direction: column;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .sub {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .sentiment-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
    background: rgba(0, 0, 0, 0.15);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    border: 1px solid rgba(255, 255, 255, 0.03);
  }

  .rating-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rating-number {
    font-size: 2rem;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1;
  }

  .rating-stars-group {
    display: flex;
    flex-direction: column;
  }

  .stars {
    font-size: 0.75rem;
  }

  .label {
    font-size: 0.65rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .sentiment-bar-chart {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.65rem;
    font-weight: 700;
  }

  .chart-header .pct { color: #10b981; }
  .chart-header .lbl { color: var(--text-muted); }

  .track {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 999px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #06b6d4);
    border-radius: 999px;
  }

  .reviews-feed {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    overflow-y: auto;
    max-height: 160px;
    padding-right: 4px;
  }

  .review-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: var(--radius);
    padding: 0.65rem 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: var(--theme-transition);
  }

  .review-card:hover {
    background: rgba(99, 102, 241, 0.03);
    border-color: rgba(99, 102, 241, 0.15);
  }

  .review-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .review-date {
    color: var(--text-muted);
    font-weight: 500;
  }

  .review-rating {
    font-size: 0.7rem;
    color: #facc15;
    letter-spacing: 0.05em;
  }

  .review-comment {
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.35;
    font-style: italic;
  }

  .request-btn {
    width: 100%;
    padding: 0.7rem;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: var(--radius);
    color: var(--primary);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: var(--theme-transition);
  }

  .request-btn:hover {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }

  /* Form overlay/popup */
  .feedback-form-box {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    z-index: 10;
    box-shadow: 0 -10px 25px -10px rgba(0, 0, 0, 0.5);
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .form-header h4 {
    font-size: 0.85rem;
    margin: 0;
  }

  .close-form-btn {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    color: var(--text-muted);
    cursor: pointer;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-group label {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: var(--text-muted);
    font-weight: 700;
  }

  .form-group select, .form-group textarea {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 0.4rem;
    color: var(--text-primary);
    font-size: 0.75rem;
    font-family: inherit;
  }

  .form-group textarea {
    height: 50px;
    resize: none;
  }

  .submit-btn {
    width: 100%;
    padding: 0.55rem;
    background: var(--primary);
    border: none;
    border-radius: var(--radius);
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: var(--theme-transition);
  }

  .submit-btn:hover {
    background: var(--accent);
    transform: translateY(-1px);
  }
</style>
