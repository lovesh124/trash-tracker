import { NextResponse } from "next/server";
import { PAYMENT_PROOF_BUCKET, supabaseServer } from "@/lib/supabase/server";
import { computeBalances, findPairBalance, type DebtEntry } from "@/lib/balances";
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

  const [roommatesRes, splitsRes, settlementsRes] = await Promise.all([
    supabaseServer.from("roommates").select("id, name"),
    supabaseServer
      .from("expense_splits")
      .select("roommate_id, amount_cents, expense:expenses(payer_id)"),
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

  if (!roommatesById.has(fromRoommateId) || !roommatesById.has(toRoommateId)) {
    return NextResponse.json({ error: "Unknown roommate" }, { status: 400 });
  }

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
