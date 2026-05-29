/**
 * Utility functions for metrics, trends, and analytical calculations
 */

/**
 * Calculates percentage change between two values
 */
export function calculateTrend(current: number, previous: number): {
  percentage: string;
  isPositive: boolean;
  formatted: string;
} {
  if (previous === 0) {
    return {
      percentage: '0%',
      isPositive: true,
      formatted: '0%'
    };
  }
  
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  const isPositive = pct >= 0;
  const absPct = Math.abs(pct).toFixed(1);
  
  return {
    percentage: `${absPct}%`,
    isPositive,
    formatted: `${isPositive ? '↑' : '↓'} ${absPct}%`
  };
}

/**
 * Formats values to localized currency or compact formats
 */
export function formatMetric(value: number, type: 'currency' | 'number' | 'percent' | 'compact' = 'number'): string {
  if (type === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  }
  
  if (type === 'percent') {
    return `${value.toFixed(1)}%`;
  }
  
  if (type === 'compact') {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  }
  
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Generates standard tooltip content based on axis label, value, and unit
 */
export function generateTooltipText(label: string, value: number | string, unit: string = ''): string {
  const formattedVal = typeof value === 'number' ? formatMetric(value) : value;
  return `${label}: ${formattedVal}${unit ? ' ' + unit : ''}`;
}

/**
 * Determines ranking tier based on score
 */
export function calculateRankTier(score: number): {
  tier: string;
  color: string;
} {
  if (score >= 900) return { tier: 'Diamond', color: '#818cf8' };
  if (score >= 750) return { tier: 'Gold', color: '#facc15' };
  if (score >= 500) return { tier: 'Silver', color: '#94a3b8' };
  return { tier: 'Bronze', color: '#b45309' };
}

/**
 * Computes average of an array of numbers safely
 */
export function calculateAverage(data: number[]): number {
  if (!data || data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}
