/**
 * Generates an SVG line path string for sequential data
 */
export function getPathData(
  data: number[],
  maxVal: number,
  width: number,
  height: number
): string {
  if (!data || data.length === 0) return '';
  // Avoid division by zero
  if (data.length === 1) return `M 0 ${height - (data[0] / maxVal) * height}`;
  
  const stepX = width / (data.length - 1);
  const safeMax = maxVal > 0 ? maxVal : 1; // Prevent division by zero
  
  return data.map((val, i) => {
    const x = i * stepX;
    const y = height - (val / safeMax) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}

/**
 * Generates an SVG area path string (filled down to baseline) for sequential data
 */
export function getAreaPathData(
  data: number[],
  maxVal: number,
  width: number,
  height: number
): string {
  if (!data || data.length === 0) return '';
  const linePath = getPathData(data, maxVal, width, height);
  // Complete the path by drawing to bottom right, then bottom left, then close
  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
}

/**
 * Generates an array of coordinates for interactive points
 */
export function generatePointCoordinates(
  data: number[],
  maxVal: number,
  width: number,
  height: number
): { cx: number; cy: number }[] {
  if (!data || data.length === 0) return [];
  if (data.length === 1) return [{ cx: 0, cy: height - (data[0] / maxVal) * height }];
  
  const stepX = width / (data.length - 1);
  const safeMax = maxVal > 0 ? maxVal : 1;
  
  return data.map((val, i) => ({
    cx: i * stepX,
    cy: height - (val / safeMax) * height
  }));
}

/**
 * Calculates Y-axis grid values
 */
export function calculateYAxisGrid(
  data: number[],
  numLines: number
): number[] {
  const maxVal = Math.max(...data, 1);
  const step = maxVal / numLines;
  return Array.from({ length: numLines + 1 }, (_, i) => Math.round(i * step));
}
