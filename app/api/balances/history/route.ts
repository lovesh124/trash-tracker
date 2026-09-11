import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { withRunningBalance, type PairHistoryEntry } from "@/lib/balances";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const [splitsRes, settlementsRes] = await Promise.all([
    supabaseServer
      .from("expense_splits")
      .select("id, roommate_id, amount_cents, expense:expenses(id, description, created_at, payer_id)"),
    supabaseServer
      .from("settlements")
      .select("id, from_roommate_id, to_roommate_id, amount_cents, created_at"),
  ]);

  if (splitsRes.error) {
    return NextResponse.json({ error: splitsRes.error.message }, { status: 500 });
  }
  if (settlementsRes.error) {
    return NextResponse.json({ error: settlementsRes.error.message }, { status: 500 });
  }

  type SplitRow = {
    id: string;
    roommate_id: string;
    amount_cents: number;
    expense:
      | { id: string; description: string; created_at: string; payer_id: string }
      | { id: string; description: string; created_at: string; payer_id: string }[]
      | null;
  };

  const entries: PairHistoryEntry[] = [];

  for (const split of splitsRes.data as SplitRow[]) {
    const expense = Array.isArray(split.expense) ? split.expense[0] : split.expense;
    if (!expense) continue;

    const isPair =
      (split.roommate_id === from && expense.payer_id === to) ||
      (split.roommate_id === to && expense.payer_id === from);
    if (!isPair) continue;

    entries.push({
      id: `expense-${split.id}`,
      type: "expense",
      createdAt: expense.created_at,
      description: expense.description,
      amountCents: split.amount_cents,
      owerId: split.roommate_id,
      creditorId: expense.payer_id,
    });
  }

  for (const settlement of settlementsRes.data) {
    const isPair =
      (settlement.from_roommate_id === from && settlement.to_roommate_id === to) ||
      (settlement.from_roommate_id === to && settlement.to_roommate_id === from);
    if (!isPair) continue;

    // Mirrors the /api/balances debt convention: a settlement is a debt in the
    // opposite direction of the payment, so it nets against the original debt.
    entries.push({
      id: `settlement-${settlement.id}`,
      type: "settlement",
      createdAt: settlement.created_at,
      description: "Payment",
      amountCents: settlement.amount_cents,
      owerId: settlement.to_roommate_id,
      creditorId: settlement.from_roommate_id,
    });
  }

  entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return NextResponse.json({ entries: withRunningBalance(entries, from) });
}
