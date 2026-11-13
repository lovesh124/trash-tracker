import { NextResponse } from "next/server";
import {
  PAYMENT_PROOF_BUCKET,
  PHOTO_BUCKET,
  SWEEP_PHOTO_BUCKET,
  supabaseServer,
} from "@/lib/supabase/server";
import { deleteProofPhoto } from "@/lib/supabase/photo-upload";
import { checkUndoPin } from "@/lib/undo-pin";
import type { UndoType } from "@/lib/supabase/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TARGETS: Record<UndoType, { table: string; photo?: { column: string; bucket: string } }> = {
  trash: { table: "trash_logs", photo: { column: "photo_url", bucket: PHOTO_BUCKET } },
  sweep: { table: "sweep_logs", photo: { column: "photo_url", bucket: SWEEP_PHOTO_BUCKET } },
  // expense_splits rows are removed with it (on delete cascade).
  expense: { table: "expenses" },
  settlement: { table: "settlements", photo: { column: "proof_url", bucket: PAYMENT_PROOF_BUCKET } },
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const type = body?.type;
  const id = body?.id;

  if (typeof type !== "string" || !Object.hasOwn(TARGETS, type)) {
    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  }
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Check the code before touching the record, so nothing is revealed without it.
  const pinCheck = await checkUndoPin(body?.pin);
  if (!pinCheck.ok) {
    return NextResponse.json({ error: pinCheck.error }, { status: pinCheck.status });
  }

  const target = TARGETS[type as UndoType];
  const { data: deleted, error } = await supabaseServer
    .from(target.table)
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!deleted) {
    return NextResponse.json({ error: "That was already removed" }, { status: 404 });
  }

  const photoUrl = target.photo ? deleted[target.photo.column] : null;
  if (target.photo && typeof photoUrl === "string") {
    await deleteProofPhoto(target.photo.bucket, photoUrl);
  }

  return NextResponse.json({ ok: true });
}
