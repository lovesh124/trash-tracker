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

/** One expense split (ower owes the payer `amountCents` for one expense), flattened from the DB. */
export type SplitRecord = {
  id: string;
  expenseId: string;
  owerId: string;
  payerId: string;
  amountCents: number;
  description: string;
  createdAt: string;
};

/** One settle-up payment: `fromId` paid `toId` `amountCents`. */
export type SettlementRecord = {
  id: string;
  fromId: string;
  toId: string;
  amountCents: number;
  createdAt: string;
};

export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/**
 * Every split and settlement as pair-history entries, grouped by unordered
 * pair (see pairKey) and sorted oldest first. A settlement is recorded as a
 * debt in the opposite direction of the payment, so it nets against the
 * original debt (same convention as computeBalances' callers).
 */
export function buildPairEntries(
  splits: SplitRecord[],
  settlements: SettlementRecord[]
): Map<string, PairHistoryEntry[]> {
  const byPair = new Map<string, PairHistoryEntry[]>();
  const add = (key: string, entry: PairHistoryEntry) => {
    const list = byPair.get(key) ?? [];
    list.push(entry);
    byPair.set(key, list);
  };

  for (const split of splits) {
    if (split.owerId === split.payerId) continue;
    add(pairKey(split.owerId, split.payerId), {
      id: `expense-${split.id}`,
      type: "expense",
      createdAt: split.createdAt,
      description: split.description,
      amountCents: split.amountCents,
      owerId: split.owerId,
      creditorId: split.payerId,
    });
  }
  for (const settlement of settlements) {
    add(pairKey(settlement.fromId, settlement.toId), {
      id: `settlement-${settlement.id}`,
      type: "settlement",
      createdAt: settlement.createdAt,
      description: "Payment",
      amountCents: settlement.amountCents,
      owerId: settlement.toId,
      creditorId: settlement.fromId,
    });
  }

  for (const list of byPair.values()) {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return byPair;
}

/**
 * Ids of the expense splits that have been paid back. Within each pair, debts
 * are matched oldest-first: anything owed the opposite way (a settle-up
 * payment, or an expense the other person paid for) cancels out the oldest
 * outstanding debts first. A split is paid back once it's fully cancelled.
 * Because "Pay Now" always settles the whole balance, a settle-up clears every
 * earlier split between the pair — whatever its category — and this also
 * handles balances that flip direction without ever landing on exactly $0.
 */
export function settledSplitIds(splits: SplitRecord[], settlements: SettlementRecord[]): Set<string> {
  const settled = new Set<string>();
  const markSettled = (entry: PairHistoryEntry) => {
    if (entry.type === "expense") settled.add(entry.id.slice("expense-".length));
  };

  for (const entries of buildPairEntries(splits, settlements).values()) {
    // Outstanding debts, oldest first. They're always all owed in one direction:
    // anything owed the other way is used up cancelling them before it's queued.
    const outstanding: { entry: PairHistoryEntry; remaining: number }[] = [];

    for (const entry of entries) {
      let amount = entry.amountCents;
      while (amount > 0 && outstanding.length > 0 && outstanding[0].entry.owerId !== entry.owerId) {
        const oldest = outstanding[0];
        const used = Math.min(amount, oldest.remaining);
        oldest.remaining -= used;
        amount -= used;
        if (oldest.remaining === 0) {
          outstanding.shift();
          markSettled(oldest.entry);
        }
      }
      // Fully used up cancelling older debts, so this one is settled too.
      if (amount === 0) markSettled(entry);
      else outstanding.push({ entry, remaining: amount });
    }
  }
  return settled;
}

/** The ledger as debts for computeBalances: a settlement is a debt in the opposite direction of the payment. */
export function ledgerToDebts(splits: SplitRecord[], settlements: SettlementRecord[]): DebtEntry[] {
  return [
    ...splits.map((s) => ({ owerId: s.owerId, creditorId: s.payerId, amountCents: s.amountCents })),
    ...settlements.map((s) => ({ owerId: s.toId, creditorId: s.fromId, amountCents: s.amountCents })),
  ];
}
