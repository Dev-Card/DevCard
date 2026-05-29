export interface Coordinate {
  x: number;
  y: number;
}

/**
 * Calculates X/Y coordinates for a point on a radar chart
 */
export function getRadarCoordinates(
  value: number,
  index: number,
  sides: number,
  center: number,
  radius: number
): Coordinate {
  // Handle edge case of 0 sides
  if (sides === 0) return { x: center, y: center };
  
  const angle = (Math.PI * 2) / sides;
  const r = (value / 100) * radius;
  // -Math.PI/2 to start drawing from the top
  const theta = index * angle - Math.PI / 2;
  
  return {
    x: center + r * Math.cos(theta),
    y: center + r * Math.sin(theta)
  };
}

/**
 * Generates an SVG polygon points string for a data series
 */
export function generateRadarPoints(
  dataValues: number[],
  center: number,
  radius: number
): string {
  const sides = dataValues.length;
  if (sides === 0) return '';
  
  return dataValues
    .map((val, i) => {
      const { x, y } = getRadarCoordinates(val, i, sides, center, radius);
      return `${x},${y}`;
    })
    .join(' ');
}

/**
 * Generates an SVG polygon points string for a background grid level
 */
export function getGridPolygon(
  level: number,
  sides: number,
  center: number,
  radius: number
): string {
  if (sides === 0) return '';
  
  return Array.from({ length: sides })
    .map((_, i) => {
      const { x, y } = getRadarCoordinates(level, i, sides, center, radius);
      return `${x},${y}`;
    })
    .join(' ');
}

/**
 * Generates label coordinates pushed further out from the radar edges
 */
export function generateLabelCoordinates(
  data: { label: string; value: number }[],
  center: number,
  radius: number,
  pushFactor: number = 120
): (Coordinate & { text: string })[] {
  const sides = data.length;
  if (sides === 0) return [];
  
  return data.map((d, i) => {
    const { x, y } = getRadarCoordinates(pushFactor, i, sides, center, radius);
    return { x, y, text: d.label };
  });
}
