const DOLLAR_AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

/** Parses a trusted dollar string (e.g. "12.5") into positive integer cents, or null if invalid/non-positive. */
export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!DOLLAR_AMOUNT_RE.test(trimmed)) return null;

  const [dollars, cents = ""] = trimmed.split(".");
  const totalCents = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  return totalCents > 0 ? totalCents : null;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}
