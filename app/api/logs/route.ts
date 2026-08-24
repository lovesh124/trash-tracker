import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PHOTO_BUCKET, supabaseServer } from "@/lib/supabase/server";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
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
    if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
      return NextResponse.json(
        { error: "Photo must be a JPEG, PNG, or WEBP image" },
        { status: 400 }
      );
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "Photo must be under 5MB" }, { status: 400 });
    }

    const extension = photo.type.split("/")[1];
    const path = `${roommateId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseServer.storage
      .from(PHOTO_BUCKET)
      .upload(path, await photo.arrayBuffer(), {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseServer.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(path);
    photoUrl = publicUrlData.publicUrl;
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
