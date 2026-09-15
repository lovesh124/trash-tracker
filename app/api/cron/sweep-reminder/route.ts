import { NextResponse } from "next/server";
import { getCurrentTurn, isReminderDue, recordReminderSent } from "@/lib/chores-server";
import { sendTurnReminderEmail } from "@/lib/email";

// Never statically cache/optimize this route — it must run fresh on every
// invocation and has side effects (sending an email).
export const dynamic = "force-dynamic";

/**
 * Periodic nudge for whoever's currently up for sweeping, spaced out to a
 * real 5-day gap via `chore_reminders` (see migration_chore_reminders.sql)
 * rather than a fixed calendar cron schedule — cron syntax can't express
 * "every 5 days" precisely across month boundaries, so this route is meant
 * to be called more often (daily, per vercel.json) and only actually sends
 * once the cooldown has elapsed. Gated on CRON_SECRET since it's meant to be
 * called by the scheduler, not a browser.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await isReminderDue("sweep");
  if (!due) {
    return NextResponse.json({ sent: false, reason: "Not due yet" });
  }

  const result = await getCurrentTurn("sweep_logs", { includeEmail: true });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const { roommate } = result.turn;
  if (!roommate.email) {
    return NextResponse.json({ sent: false, reason: `No email on file for ${roommate.name}` });
  }

  try {
    await sendTurnReminderEmail(roommate.email, roommate.name, "sweep the kitchen + living room");
    await recordReminderSent("sweep");
    return NextResponse.json({ sent: true, roommate: roommate.name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send reminder" },
      { status: 500 }
    );
  }
}
