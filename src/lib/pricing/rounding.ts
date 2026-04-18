/**
 * Arrotonda un numero per eccesso al multiplo più vicino.
 * roundUpTo(187.5, 10) === 190
 * roundUpTo(2990, 50) === 3000
 */
export function roundUpTo(value: number, multiple: number): number {
  if (multiple <= 0) return value;
  return Math.ceil(value / multiple) * multiple;
}
