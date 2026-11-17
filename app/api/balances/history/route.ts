import { NextResponse } from "next/server";
import { buildPairEntries, pairKey, withRunningBalance } from "@/lib/balances";
import { loadLedger } from "@/lib/ledger-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const ledger = await loadLedger();
  if ("error" in ledger) {
    return NextResponse.json({ error: ledger.error }, { status: 500 });
  }

  const entries = buildPairEntries(ledger.splits, ledger.settlements).get(pairKey(from, to)) ?? [];
  return NextResponse.json({ entries: withRunningBalance(entries, from) });
}
