import type { Roommate } from "@/lib/supabase/types";

export type NamedRoommate = Pick<Roommate, "id" | "name">;

export type DebtEntry = {
  /** The roommate who owes money. */
  owerId: string;
  /** The roommate who is owed money. */
  creditorId: string;
  amountCents: number;
};

export type Balance = {
  fromRoommate: NamedRoommate;
  toRoommate: NamedRoommate;
  amountCents: number;
};

/**
 * Nets a list of signed debts (expense splits owed to a payer, minus settlement
 * payments) down to one balance per pair, so bidirectional debts collapse into
 * a single non-zero amount instead of showing both directions at once.
 */
export function computeBalances(
  debts: DebtEntry[],
  roommatesById: Map<string, NamedRoommate>
): Balance[] {
  const ledger = new Map<string, Map<string, number>>();

  for (const { owerId, creditorId, amountCents } of debts) {
    if (!ledger.has(owerId)) ledger.set(owerId, new Map());
    const row = ledger.get(owerId)!;
    row.set(creditorId, (row.get(creditorId) ?? 0) + amountCents);
  }

  const seenPairs = new Set<string>();
  const balances: Balance[] = [];

  for (const [owerId, row] of ledger) {
    for (const creditorId of row.keys()) {
      const pairKey = [owerId, creditorId].sort().join(":");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const aOwesB = ledger.get(owerId)?.get(creditorId) ?? 0;
      const bOwesA = ledger.get(creditorId)?.get(owerId) ?? 0;
      const net = aOwesB - bOwesA;

      if (net === 0) continue;

      const [owerFinal, creditorFinal] = net > 0 ? [owerId, creditorId] : [creditorId, owerId];
      const owerRoommate = roommatesById.get(owerFinal);
      const creditorRoommate = roommatesById.get(creditorFinal);
      if (!owerRoommate || !creditorRoommate) continue;

      balances.push({
        fromRoommate: owerRoommate,
        toRoommate: creditorRoommate,
        amountCents: Math.abs(net),
      });
    }
  }

  return balances;
}

/** Finds the current net balance for one specific (ower -> creditor) pair, if any. */
export function findPairBalance(
  balances: Balance[],
  fromRoommateId: string,
  toRoommateId: string
): Balance | undefined {
  return balances.find(
    (b) => b.fromRoommate.id === fromRoommateId && b.toRoommate.id === toRoommateId
  );
}

/** One expense split or settlement between exactly two roommates, in chronological order. */
export type PairHistoryEntry = {
  id: string;
  type: "expense" | "settlement";
  createdAt: string;
  description: string;
  amountCents: number;
  owerId: string;
  creditorId: string;
};

export type PairHistoryEntryWithRunning = PairHistoryEntry & {
  /** Signed running total of what `fromRoommateId` owes the other person, after this entry. */
  runningBalanceCents: number;
};

/**
 * Annotates a pair's chronological transaction history with a running balance,
 * so each entry shows what the net debt was immediately after it happened —
 * letting a settled-up bill's individual contributions be traced back.
 */
export function withRunningBalance(
  entries: PairHistoryEntry[],
  fromRoommateId: string
): PairHistoryEntryWithRunning[] {
  let running = 0;
  return entries.map((entry) => {
    running += entry.owerId === fromRoommateId ? entry.amountCents : -entry.amountCents;
    return { ...entry, runningBalanceCents: running };
  });
}

/**
 * Splits a pair's history at the last moment they were fully settled up
 * (running balance back to 0). `current` is only what the outstanding
 * balance is made of; `settled` is everything already paid off before that.
 */
export function splitAtLastSettleUp(entries: PairHistoryEntryWithRunning[]): {
  settled: PairHistoryEntryWithRunning[];
  current: PairHistoryEntryWithRunning[];
} {
  let lastZero = -1;
  entries.forEach((entry, i) => {
    if (entry.runningBalanceCents === 0) lastZero = i;
  });
  return { settled: entries.slice(0, lastZero + 1), current: entries.slice(lastZero + 1) };
}

export type RoommateTotal = { roommate: NamedRoommate; owedCents: number };

/**
 * How much each roommate is owed in total: the sum of every balance where
 * they're the one owed money. What they themselves owe others is ignored.
 * Each pair is already netted (same as the Balances list), so this matches
 * adding up that person's rows there. Roommates owed nothing are left out;
 * sorted most-owed first.
 */
export function totalOwedPerRoommate(balances: Balance[]): RoommateTotal[] {
  const byId = new Map<string, RoommateTotal>();
  for (const { toRoommate, amountCents } of balances) {
    const entry = byId.get(toRoommate.id) ?? { roommate: toRoommate, owedCents: 0 };
    entry.owedCents += amountCents;
    byId.set(toRoommate.id, entry);
  }
  return [...byId.values()].sort((a, b) => b.owedCents - a.owedCents);
}
