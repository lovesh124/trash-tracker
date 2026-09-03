import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { computeBalances, type DebtEntry } from "@/lib/balances";
import type { ActivityItem, Roommate } from "@/lib/supabase/types";

const ACTIVITY_LIMIT = 20;

export async function GET() {
  const [roommatesRes, splitsRes, settlementsRes, expensesRes] = await Promise.all([
    supabaseServer.from("roommates").select("id, name"),
    supabaseServer
      .from("expense_splits")
      .select("roommate_id, amount_cents, expense:expenses(payer_id)"),
    supabaseServer
      .from("settlements")
      .select("id, from_roommate_id, to_roommate_id, amount_cents, proof_url, created_at, from:roommates!settlements_from_roommate_id_fkey(id, name), to:roommates!settlements_to_roommate_id_fkey(id, name)")
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
    supabaseServer
      .from("expenses")
      .select("id, description, created_at, payer:roommates(id, name), splits:expense_splits(amount_cents, roommate:roommates(id, name))")
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_LIMIT),
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
  if (expensesRes.error) {
    return NextResponse.json({ error: expensesRes.error.message }, { status: 500 });
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

  const balances = computeBalances(debts, roommatesById);

  type ExpenseRow = {
    id: string;
    description: string;
    created_at: string;
    payer: Pick<Roommate, "id" | "name"> | Pick<Roommate, "id" | "name">[] | null;
    splits: { amount_cents: number; roommate: Pick<Roommate, "id" | "name"> | Pick<Roommate, "id" | "name">[] | null }[];
  };

  const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

  const expenseActivity: ActivityItem[] = (expensesRes.data as ExpenseRow[]).flatMap((expense) => {
    const payer = one(expense.payer);
    if (!payer) return [];
    return [
      {
        type: "expense" as const,
        id: expense.id,
        createdAt: expense.created_at,
        payer,
        description: expense.description,
        totalCents: expense.splits.reduce((sum, s) => sum + s.amount_cents, 0),
        owerNames: expense.splits.flatMap((s) => {
          const roommate = one(s.roommate);
          return roommate ? [roommate.name] : [];
        }),
      },
    ];
  });

  type SettlementRow = {
    id: string;
    amount_cents: number;
    proof_url: string | null;
    created_at: string;
    from: Pick<Roommate, "id" | "name"> | Pick<Roommate, "id" | "name">[] | null;
    to: Pick<Roommate, "id" | "name"> | Pick<Roommate, "id" | "name">[] | null;
  };

  const settlementActivity: ActivityItem[] = (settlementsRes.data as SettlementRow[]).flatMap(
    (settlement) => {
      const from = one(settlement.from);
      const to = one(settlement.to);
      if (!from || !to) return [];
      return [
        {
          type: "settlement" as const,
          id: settlement.id,
          createdAt: settlement.created_at,
          from,
          to,
          amountCents: settlement.amount_cents,
          proofUrl: settlement.proof_url,
        },
      ];
    }
  );

  const activity = [...expenseActivity, ...settlementActivity]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, ACTIVITY_LIMIT);

  return NextResponse.json({ balances, activity });
}
