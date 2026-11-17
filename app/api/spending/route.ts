import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { TRACKED_CATEGORIES, isExpenseCategory } from "@/lib/categories";
import type { Roommate, SpendingExpense } from "@/lib/supabase/types";

type NamedRoommate = Pick<Roommate, "id" | "name">;
const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

// A little over 6 months back: the page shows the last 6 calendar months, and
// grouping happens in the browser's local time, so allow for the edges.
const LOOKBACK_DAYS = 200;

/** Recent Electricity/Walmart expenses with each person's share, for monthly totals. */
export async function GET() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabaseServer
    .from("expenses")
    .select("id, category, created_at, total_cents, payer:roommates(id, name), splits:expense_splits(amount_cents, roommate:roommates(id, name))")
    .in("category", TRACKED_CATEGORIES.map((c) => c.key))
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    category: string;
    created_at: string;
    total_cents: number | null;
    payer: NamedRoommate | NamedRoommate[] | null;
    splits: { amount_cents: number; roommate: NamedRoommate | NamedRoommate[] | null }[];
  };

  const expenses: SpendingExpense[] = (data as Row[]).map((row) => {
    const owed = row.splits.flatMap((s) => {
      const roommate = one(s.roommate);
      return roommate ? [{ roommate, cents: s.amount_cents }] : [];
    });
    const owedCents = owed.reduce((sum, s) => sum + s.cents, 0);
    const payer = one(row.payer);
    // The payer's own share is only known when the full bill total was stored.
    const payerShare = row.total_cents !== null ? row.total_cents - owedCents : 0;
    return {
      id: row.id,
      category: isExpenseCategory(row.category) ? row.category : "other",
      createdAt: row.created_at,
      totalCents: row.total_cents ?? owedCents,
      shares: payer && payerShare > 0 ? [{ roommate: payer, cents: payerShare }, ...owed] : owed,
    };
  });

  return NextResponse.json({ expenses });
}
