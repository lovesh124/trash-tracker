import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { settledSplitIds } from "@/lib/balances";
import { isExpenseCategory } from "@/lib/categories";
import { loadLedger } from "@/lib/ledger-server";
import type { ActivityItem, Roommate } from "@/lib/supabase/types";

const PAGE_SIZE = 10;
// Supabase returns at most 1,000 rows per query by default, which caps how deep
// this can page (100 pages of 10 — years of household history).
const MAX_ROWS = 1000;
const MAX_PAGES = MAX_ROWS / PAGE_SIZE;

type NamedRoommate = Pick<Roommate, "id" | "name">;
const one = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

/**
 * One page of Recent Activity (expenses and payments, newest first). The two
 * live in separate tables, so page N takes the newest N×PAGE_SIZE rows of
 * each, merges them by date, and slices out that page — exact, since no item
 * on page N can come from further down either table.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = Math.floor(Number(searchParams.get("page"))) || 1;
  const page = Math.min(Math.max(1, requested), MAX_PAGES);
  const rowsNeeded = page * PAGE_SIZE;

  // Optional category filter. Payments aren't tied to a category (a settle-up
  // pays everything at once), so a filtered feed shows only expenses.
  const categoryParam = searchParams.get("category");
  if (categoryParam !== null && !isExpenseCategory(categoryParam)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }
  const category = categoryParam;

  const expenseCountQuery = supabaseServer.from("expenses").select("id", { count: "exact", head: true });
  const expensesQuery = supabaseServer
    .from("expenses")
    .select("id, description, created_at, total_cents, category, payer:roommates(id, name), splits:expense_splits(id, amount_cents, roommate:roommates(id, name))")
    .order("created_at", { ascending: false })
    .limit(rowsNeeded);

  const [expenseCountRes, settlementCountRes, expensesRes, settlementsRes, ledger] = await Promise.all([
    category ? expenseCountQuery.eq("category", category) : expenseCountQuery,
    category
      ? Promise.resolve({ count: 0, error: null })
      : supabaseServer.from("settlements").select("id", { count: "exact", head: true }),
    category ? expensesQuery.eq("category", category) : expensesQuery,
    category
      ? Promise.resolve({ data: [], error: null })
      : supabaseServer
          .from("settlements")
          .select("id, amount_cents, proof_url, created_at, from:roommates!settlements_from_roommate_id_fkey(id, name), to:roommates!settlements_to_roommate_id_fkey(id, name)")
          .order("created_at", { ascending: false })
          .limit(rowsNeeded),
    loadLedger(),
  ]);

  for (const res of [expenseCountRes, settlementCountRes, expensesRes, settlementsRes]) {
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  }
  if ("error" in ledger) {
    return NextResponse.json({ error: ledger.error }, { status: 500 });
  }
  const settled = settledSplitIds(ledger.splits, ledger.settlements);

  type ExpenseRow = {
    id: string;
    description: string;
    created_at: string;
    total_cents: number | null;
    category: string;
    payer: NamedRoommate | NamedRoommate[] | null;
    splits: { id: string; amount_cents: number; roommate: NamedRoommate | NamedRoommate[] | null }[];
  };

  const expenseItems: ActivityItem[] = (expensesRes.data as ExpenseRow[]).flatMap((expense) => {
    const payer = one(expense.payer);
    if (!payer) return [];
    return [
      {
        type: "expense" as const,
        id: expense.id,
        createdAt: expense.created_at,
        payer,
        description: expense.description,
        // Older expenses have no stored total; the sum of what's owed is the best we have.
        totalCents: expense.total_cents ?? expense.splits.reduce((sum, s) => sum + s.amount_cents, 0),
        category: isExpenseCategory(expense.category) ? expense.category : "other",
        owers: expense.splits.flatMap((s) => {
          const roommate = one(s.roommate);
          return roommate
            ? [{ name: roommate.name, amountCents: s.amount_cents, paidBack: settled.has(s.id) }]
            : [];
        }),
      },
    ];
  });

  type SettlementRow = {
    id: string;
    amount_cents: number;
    proof_url: string | null;
    created_at: string;
    from: NamedRoommate | NamedRoommate[] | null;
    to: NamedRoommate | NamedRoommate[] | null;
  };

  const settlementItems: ActivityItem[] = (settlementsRes.data as SettlementRow[]).flatMap((settlement) => {
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
  });

  const total = (expenseCountRes.count ?? 0) + (settlementCountRes.count ?? 0);
  const totalPages = Math.min(Math.max(1, Math.ceil(total / PAGE_SIZE)), MAX_PAGES);
  const items = [...expenseItems, ...settlementItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return NextResponse.json({ items, page, totalPages });
}
