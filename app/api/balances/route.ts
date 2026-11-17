import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { computeBalances, ledgerToDebts } from "@/lib/balances";
import { loadLedger } from "@/lib/ledger-server";
import type { Roommate } from "@/lib/supabase/types";

// The Recent Activity feed is served separately, a page at a time, by /api/activity.
export async function GET() {
  const [roommatesRes, ledger] = await Promise.all([
    supabaseServer.from("roommates").select("id, name"),
    loadLedger(),
  ]);

  if (roommatesRes.error) {
    return NextResponse.json({ error: roommatesRes.error.message }, { status: 500 });
  }
  if ("error" in ledger) {
    return NextResponse.json({ error: ledger.error }, { status: 500 });
  }

  const roommatesById = new Map<string, Pick<Roommate, "id" | "name">>(
    roommatesRes.data.map((r) => [r.id, { id: r.id, name: r.name }])
  );

  return NextResponse.json({
    balances: computeBalances(ledgerToDebts(ledger.splits, ledger.settlements), roommatesById),
  });
}
