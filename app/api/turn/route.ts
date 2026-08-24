import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Roommate, TrashLogWithRoommate } from "@/lib/supabase/types";

export async function GET() {
  const { data: roommates, error: roommatesError } = await supabaseServer
    .from("roommates")
    .select("*")
    .order("order_index", { ascending: true });

  if (roommatesError || !roommates || roommates.length === 0) {
    return NextResponse.json(
      { error: roommatesError?.message ?? "No roommates configured" },
      { status: 500 }
    );
  }

  const { data: lastLog, error: lastLogError } = await supabaseServer
    .from("trash_logs")
    .select("*, roommate:roommates(id, name)")
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastLogError) {
    return NextResponse.json({ error: lastLogError.message }, { status: 500 });
  }

  const typedRoommates = roommates as Roommate[];
  const typedLastLog = lastLog as TrashLogWithRoommate | null;

  const nextIndex = typedLastLog
    ? (typedRoommates.findIndex((r) => r.id === typedLastLog.roommate_id) + 1) %
      typedRoommates.length
    : 0;

  return NextResponse.json({
    roommate: typedRoommates[nextIndex],
    lastLog: typedLastLog,
  });
}
