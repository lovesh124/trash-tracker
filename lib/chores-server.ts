import { supabaseServer } from "@/lib/supabase/server";
import { getNextRoommate } from "@/lib/turn";
import type { ChoreLogWithRoommate, CurrentTurn, Roommate } from "@/lib/supabase/types";

/** Chore log tables all share the same shape (see migration.sql / migration_sweep.sql). */
export type ChoreLogTable = "trash_logs" | "sweep_logs";

export async function getOrderedRoommates() {
  return supabaseServer
    .from("roommates")
    .select("id, name, order_index, email")
    .order("order_index", { ascending: true });
}

/** Whose turn is next for a given chore, plus the most recent log for it (if any). */
export async function getCurrentTurn(
  table: ChoreLogTable
): Promise<{ turn: CurrentTurn } | { error: string }> {
  // No email here — this is a public, unauthenticated GET, and email is only
  // ever needed server-side (see the reminder-email flow after a log POST).
  const { data: roommates, error: roommatesError } = await supabaseServer
    .from("roommates")
    .select("id, name, order_index")
    .order("order_index", { ascending: true });

  if (roommatesError || !roommates || roommates.length === 0) {
    return { error: roommatesError?.message ?? "No roommates configured" };
  }

  const { data: lastLog, error: lastLogError } = await supabaseServer
    .from(table)
    .select("*, roommate:roommates(id, name)")
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastLogError) {
    return { error: lastLogError.message };
  }

  const typedRoommates = roommates as Roommate[];
  const typedLastLog = lastLog as ChoreLogWithRoommate | null;
  const nextRoommate = getNextRoommate(typedRoommates, typedLastLog?.roommate_id ?? null);

  return { turn: { roommate: nextRoommate, lastLog: typedLastLog } };
}
