interface Point {
  x: number;
  y: number;
}

/**
 * Convert an array of points into a smooth SVG path string
 * using Catmull-Rom to cubic bezier conversion.
 * The resulting curve passes through every input point.
 */
export function catmullRomToSvgPath(points: Point[], tension = 0.3): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

/**
 * Convert percentage-based map positions to SVG viewBox coordinates.
 */
export function mapPositionToSvg(
  pos: { x: number; y: number },
  viewBoxWidth: number,
  viewBoxHeight: number
): Point {
  return {
    x: (pos.x / 100) * viewBoxWidth,
    y: (pos.y / 100) * viewBoxHeight,
  };
}

/**
 * Get the total length of an SVG path element.
 * Must be called after the element is mounted in the DOM.
 */
export function getPathLength(pathRef: SVGPathElement | null): number {
  return pathRef?.getTotalLength() ?? 0;
}
