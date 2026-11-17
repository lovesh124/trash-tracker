import { supabaseServer } from "@/lib/supabase/server";
import type { SettlementRecord, SplitRecord } from "@/lib/balances";

/** Every expense split and settlement, flattened — the raw ledger behind balances and paid-back status. */
export async function loadLedger(): Promise<
  { splits: SplitRecord[]; settlements: SettlementRecord[] } | { error: string }
> {
  const [splitsRes, settlementsRes] = await Promise.all([
    supabaseServer
      .from("expense_splits")
      .select("id, roommate_id, amount_cents, expense:expenses(id, description, created_at, payer_id)"),
    supabaseServer.from("settlements").select("id, from_roommate_id, to_roommate_id, amount_cents, created_at"),
  ]);

  if (splitsRes.error) return { error: splitsRes.error.message };
  if (settlementsRes.error) return { error: settlementsRes.error.message };

  type ExpenseJoin = { id: string; description: string; created_at: string; payer_id: string };
  type SplitRow = {
    id: string;
    roommate_id: string;
    amount_cents: number;
    expense: ExpenseJoin | ExpenseJoin[] | null;
  };

  const splits = (splitsRes.data as SplitRow[]).flatMap((row) => {
    const expense = Array.isArray(row.expense) ? row.expense[0] : row.expense;
    if (!expense) return [];
    return [
      {
        id: row.id,
        expenseId: expense.id,
        owerId: row.roommate_id,
        payerId: expense.payer_id,
        amountCents: row.amount_cents,
        description: expense.description,
        createdAt: expense.created_at,
      },
    ];
  });

  const settlements = settlementsRes.data.map((row) => ({
    id: row.id,
    fromId: row.from_roommate_id,
    toId: row.to_roommate_id,
    amountCents: row.amount_cents,
    createdAt: row.created_at,
  }));

  return { splits, settlements };
}
