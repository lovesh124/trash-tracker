import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { computeBalances, type DebtEntry } from "@/lib/balances";
import type { Roommate } from "@/lib/supabase/types";

// The Recent Activity feed is served separately, a page at a time, by /api/activity.
export async function GET() {
  const [roommatesRes, splitsRes, settlementsRes] = await Promise.all([
    supabaseServer.from("roommates").select("id, name"),
    supabaseServer
      .from("expense_splits")
      .select("roommate_id, amount_cents, expense:expenses(payer_id)"),
    // Every settlement ever: dropping older ones would inflate balances.
    supabaseServer.from("settlements").select("from_roommate_id, to_roommate_id, amount_cents"),
  ]);

  if (roommatesRes.error) {
    return NextResponse.json({ error: roommatesRes.error.message }, { status: 500 });
  }
  if (splitsRes.error) {
    return NextResponse.json({ error: splitsRes.error.message }, { status: 500 });
  }
  if (settlementsRes.error) {
    return NextResponse.json({ error: settlementsRes.error.message }, { status: 500 });
  }

  const roommatesById = new Map<string, Pick<Roommate, "id" | "name">>(
    roommatesRes.data.map((r) => [r.id, { id: r.id, name: r.name }])
  );

  type SplitRow = {
    roommate_id: string;
    amount_cents: number;
    expense: { payer_id: string } | { payer_id: string }[] | null;
  };

  const debts: DebtEntry[] = (splitsRes.data as SplitRow[]).flatMap((split) => {
    const expense = Array.isArray(split.expense) ? split.expense[0] : split.expense;
    if (!expense) return [];
    return [{ owerId: split.roommate_id, creditorId: expense.payer_id, amountCents: split.amount_cents }];
  });

  for (const settlement of settlementsRes.data) {
    debts.push({
      owerId: settlement.to_roommate_id,
      creditorId: settlement.from_roommate_id,
      amountCents: settlement.amount_cents,
    });
  }

  return NextResponse.json({ balances: computeBalances(debts, roommatesById) });
}
