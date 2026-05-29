<script lang="ts">
  let { 
    velocityScore = 1240,
    growthPercentage = '+28%',
    predictedScore = 1450,
    confidence = 'High',
    status = 'Surging'
  } = $props<{
    velocityScore?: number;
    growthPercentage?: string;
    predictedScore?: number;
    confidence?: string;
    status?: string;
  }>();
</script>

<div class="velocity-card glass">
  <div class="header">
    <div class="title-group">
      <h3>Contribution Velocity</h3>
      <span class="status-badge {status.toLowerCase()}">{status}</span>
    </div>
    <div class="growth">
      {growthPercentage}
    </div>
  </div>

  <div class="score-display">
    <div class="current-score">
      <span class="number">{velocityScore}</span>
      <span class="label">Current Momentum</span>
    </div>
    
    <div class="divider"></div>

    <div class="predicted-score">
      <span class="number gradient-text">{predictedScore}</span>
      <span class="label">Predicted (30d)</span>
    </div>
  </div>

  <div class="footer">
    <div class="confidence">
      <span class="pulse-dot"></span>
      AI Confidence: <strong>{confidence}</strong>
    </div>
  </div>
</div>

<style>
  .velocity-card {
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: relative;
    overflow: hidden;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .title-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  h3 {
    font-size: 1.125rem;
    color: var(--text-primary);
    margin: 0;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    width: max-content;
  }

  .status-badge.surging { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
  .status-badge.stable { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }

  .growth {
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }

  .score-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius);
    padding: 1.5rem;
  }

  .current-score, .predicted-score {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .number {
    font-size: 2.25rem;
    font-weight: 800;
    font-family: 'Outfit', sans-serif;
    color: var(--text-primary);
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .divider {
    width: 1px;
    height: 40px;
    background: rgba(255, 255, 255, 0.1);
  }

  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .confidence {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .confidence strong {
    color: var(--text-primary);
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background-color: #8b5cf6;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
  }
</style>
