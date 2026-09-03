import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { parseDollarsToCents } from "@/lib/money";

const MAX_DESCRIPTION_LENGTH = 200;

type SplitInput = { roommate_id: unknown; amount: unknown };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const payerId = body?.payer_id;
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const splitsInput: SplitInput[] = Array.isArray(body?.splits) ? body.splits : [];

  if (typeof payerId !== "string" || payerId.length === 0) {
    return NextResponse.json({ error: "payer_id is required" }, { status: 400 });
  }
  if (description.length === 0) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json({ error: "Description is too long" }, { status: 400 });
  }
  if (splitsInput.length === 0) {
    return NextResponse.json(
      { error: "Add at least one roommate who owes something" },
      { status: 400 }
    );
  }

  const splits: { roommate_id: string; amount_cents: number }[] = [];
  const seenRoommateIds = new Set<string>();

  for (const split of splitsInput) {
    if (typeof split.roommate_id !== "string" || split.roommate_id.length === 0) {
      return NextResponse.json({ error: "Invalid roommate in splits" }, { status: 400 });
    }
    if (split.roommate_id === payerId) {
      return NextResponse.json(
        { error: "The payer can't also owe themselves" },
        { status: 400 }
      );
    }
    if (seenRoommateIds.has(split.roommate_id)) {
      return NextResponse.json(
        { error: "Each roommate can only appear once in a split" },
        { status: 400 }
      );
    }
    seenRoommateIds.add(split.roommate_id);

    const amountCents =
      typeof split.amount === "string" ? parseDollarsToCents(split.amount) : null;
    if (amountCents === null) {
      return NextResponse.json({ error: "Invalid split amount" }, { status: 400 });
    }

    splits.push({ roommate_id: split.roommate_id, amount_cents: amountCents });
  }

  const { data: payer, error: payerError } = await supabaseServer
    .from("roommates")
    .select("id")
    .eq("id", payerId)
    .maybeSingle();

  if (payerError) {
    return NextResponse.json({ error: payerError.message }, { status: 500 });
  }
  if (!payer) {
    return NextResponse.json({ error: "Unknown payer" }, { status: 400 });
  }

  const { data: expense, error: insertExpenseError } = await supabaseServer
    .from("expenses")
    .insert({ payer_id: payerId, description })
    .select("id")
    .single();

  if (insertExpenseError) {
    return NextResponse.json({ error: insertExpenseError.message }, { status: 500 });
  }

  const { error: insertSplitsError } = await supabaseServer.from("expense_splits").insert(
    splits.map((split) => ({
      expense_id: expense.id,
      roommate_id: split.roommate_id,
      amount_cents: split.amount_cents,
    }))
  );

  if (insertSplitsError) {
    await supabaseServer.from("expenses").delete().eq("id", expense.id);
    return NextResponse.json({ error: insertSplitsError.message }, { status: 500 });
  }

  const { data: fullExpense, error: fetchError } = await supabaseServer
    .from("expenses")
    .select("*, payer:roommates(id, name), splits:expense_splits(id, amount_cents, roommate:roommates(id, name))")
    .eq("id", expense.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({ expense: fullExpense }, { status: 201 });
}
