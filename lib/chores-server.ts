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

/**
 * Whose turn is next for a given chore, plus the most recent log for it (if any).
 *
 * `includeEmail` defaults to false because this also backs the public,
 * unauthenticated `/api/turn` and `/api/sweep/turn` GET routes — only pass
 * true from server-only, non-public callers (e.g. the cron reminder route)
 * that actually need to email the roommate.
 */
export async function getCurrentTurn(
  table: ChoreLogTable,
  options?: { includeEmail?: boolean }
): Promise<{ turn: CurrentTurn } | { error: string }> {
  // Two literal .select() calls (rather than one call with a computed string)
  // so Supabase's type-level query parser can still infer each shape.
  const { data: roommates, error: roommatesError } = options?.includeEmail
    ? await supabaseServer
        .from("roommates")
        .select("id, name, order_index, email")
        .order("order_index", { ascending: true })
    : await supabaseServer
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

const REMINDER_INTERVAL_DAYS = 5;

/**
 * Records that a turn-reminder email was just sent for a chore, resetting its
 * cooldown clock — called from both the immediate "you're up next" email
 * (fired right after someone logs a turn) and the periodic cron reminder, so
 * the two never stack (e.g. an immediate email followed two days later by a
 * periodic nag). `chore` is a free-form key ("sweep", "trash", ...), one row
 * per chore.
 */
export async function recordReminderSent(chore: string): Promise<void> {
  await supabaseServer.from("chore_reminders").upsert({ chore, last_sent_at: new Date().toISOString() });
}

/** Whether at least REMINDER_INTERVAL_DAYS have passed since the last reminder for this chore (true if none was ever sent). */
export async function isReminderDue(chore: string): Promise<boolean> {
  const { data } = await supabaseServer
    .from("chore_reminders")
    .select("last_sent_at")
    .eq("chore", chore)
    .maybeSingle();

  if (!data) return true;

  const daysSinceLastReminder = (Date.now() - new Date(data.last_sent_at).getTime()) / 86_400_000;
  return daysSinceLastReminder >= REMINDER_INTERVAL_DAYS;
}
