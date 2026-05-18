export function formatReceiptNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid receipt year: ${year}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Invalid receipt sequence: ${sequence}`);
  }

  return `RC-${year}-${String(sequence).padStart(4, "0")}`;
}

