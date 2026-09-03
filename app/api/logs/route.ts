import { NextResponse } from "next/server";
import { PHOTO_BUCKET, supabaseServer } from "@/lib/supabase/server";
import { PhotoValidationError, uploadProofPhoto } from "@/lib/supabase/photo-upload";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(0, Number(searchParams.get("page") ?? "0") || 0);

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabaseServer
    .from("trash_logs")
    .select("*, roommate:roommates(id, name)", { count: "exact" })
    .order("taken_at", { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    logs: data,
    hasMore: count !== null && to + 1 < count,
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const roommateId = formData.get("roommate_id");
  const photo = formData.get("photo");

  if (typeof roommateId !== "string" || roommateId.length === 0) {
    return NextResponse.json({ error: "roommate_id is required" }, { status: 400 });
  }

  const { data: roommate, error: roommateError } = await supabaseServer
    .from("roommates")
    .select("id")
    .eq("id", roommateId)
    .maybeSingle();

  if (roommateError) {
    return NextResponse.json({ error: roommateError.message }, { status: 500 });
  }
  if (!roommate) {
    return NextResponse.json({ error: "Unknown roommate" }, { status: 400 });
  }

  let photoUrl: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    try {
      photoUrl = await uploadProofPhoto(PHOTO_BUCKET, roommateId, photo);
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

  const { data: log, error: insertError } = await supabaseServer
    .from("trash_logs")
    .insert({ roommate_id: roommateId, photo_url: photoUrl })
    .select("*, roommate:roommates(id, name)")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ log }, { status: 201 });
}
