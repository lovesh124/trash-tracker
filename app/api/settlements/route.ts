import { NextResponse } from "next/server";
import { PAYMENT_PROOF_BUCKET, supabaseServer } from "@/lib/supabase/server";
import { computeBalances, findPairBalance, ledgerToDebts } from "@/lib/balances";
import { loadLedger } from "@/lib/ledger-server";
import { PhotoValidationError, uploadProofPhoto } from "@/lib/supabase/photo-upload";
import type { Roommate } from "@/lib/supabase/types";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fromRoommateId = formData.get("from_roommate_id");
  const toRoommateId = formData.get("to_roommate_id");
  const proof = formData.get("proof");

  if (typeof fromRoommateId !== "string" || fromRoommateId.length === 0) {
    return NextResponse.json({ error: "from_roommate_id is required" }, { status: 400 });
  }
  if (typeof toRoommateId !== "string" || toRoommateId.length === 0) {
    return NextResponse.json({ error: "to_roommate_id is required" }, { status: 400 });
  }
  if (fromRoommateId === toRoommateId) {
    return NextResponse.json({ error: "Can't settle a debt with yourself" }, { status: 400 });
  }

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

  if (!roommatesById.has(fromRoommateId) || !roommatesById.has(toRoommateId)) {
    return NextResponse.json({ error: "Unknown roommate" }, { status: 400 });
  }

  const balances = computeBalances(ledgerToDebts(ledger.splits, ledger.settlements), roommatesById);
  const pairBalance = findPairBalance(balances, fromRoommateId, toRoommateId);

  if (!pairBalance) {
    return NextResponse.json({ error: "This balance is already settled" }, { status: 409 });
  }

  let proofUrl: string | null = null;

  if (proof instanceof File && proof.size > 0) {
    try {
      proofUrl = await uploadProofPhoto(PAYMENT_PROOF_BUCKET, fromRoommateId, proof);
    } catch (err) {
      if (err instanceof PhotoValidationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Upload failed" },
        { status: 500 }
      );
    }
  }

  const { data: settlement, error: insertError } = await supabaseServer
    .from("settlements")
    .insert({
      from_roommate_id: fromRoommateId,
      to_roommate_id: toRoommateId,
      amount_cents: pairBalance.amountCents,
      proof_url: proofUrl,
    })
    .select(
      "*, from:roommates!settlements_from_roommate_id_fkey(id, name), to:roommates!settlements_to_roommate_id_fkey(id, name)"
    )
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ settlement }, { status: 201 });
}
