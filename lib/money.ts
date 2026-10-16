const DOLLAR_AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

/** Parses a trusted dollar string (e.g. "12.5") into positive integer cents, or null if invalid/non-positive. */
export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!DOLLAR_AMOUNT_RE.test(trimmed)) return null;

  const [dollars, cents = ""] = trimmed.split(".");
  const totalCents = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  return totalCents > 0 ? totalCents : null;
}

/**
 * Splits `totalCents` evenly across `participantIds` (the payer may be one of
 * them). Leftover cents from rounding go one each to the non-payers first, so
 * the payer is never the one shortchanged by rounding.
 */
export function splitEvenly(
  totalCents: number,
  participantIds: string[],
  payerId: string
): Map<string, number> {
  const shares = new Map<string, number>();
  if (participantIds.length === 0) return shares;

  const base = Math.floor(totalCents / participantIds.length);
  let remainder = totalCents - base * participantIds.length;
  const order = [
    ...participantIds.filter((id) => id !== payerId),
    ...participantIds.filter((id) => id === payerId),
  ];
  for (const id of order) {
    const extra = remainder > 0 ? 1 : 0;
    shares.set(id, base + extra);
    remainder -= extra;
  }
  return shares;
}

/** Cents to the plain "12.34" string format the expenses API expects. */
export function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}
