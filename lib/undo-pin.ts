import { timingSafeEqual } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

const MAX_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

export type PinCheck = { ok: true } | { ok: false; status: number; error: string };

/**
 * Checks the house undo code against the UNDO_PIN env var. A 4-digit code is
 * trivially brute-forced on its own, so after MAX_FAILURES wrong codes within
 * LOCKOUT_MINUTES every attempt is refused until the window passes. The
 * lockout is global (not per device) — simplest, and it can't be dodged by
 * spoofing request headers.
 */
export async function checkUndoPin(pin: unknown): Promise<PinCheck> {
  const expected = process.env.UNDO_PIN;
  if (!expected || !/^\d{4}$/.test(expected)) {
    return { ok: false, status: 503, error: "Undo isn't set up yet (no valid UNDO_PIN configured)" };
  }

  const windowStart = new Date(Date.now() - LOCKOUT_MINUTES * 60_000).toISOString();
  const { count, error } = await supabaseServer
    .from("undo_pin_failures")
    .select("id", { count: "exact", head: true })
    .gte("created_at", windowStart);

  if (error) return { ok: false, status: 500, error: error.message };

  const recentFailures = count ?? 0;
  if (recentFailures >= MAX_FAILURES) {
    return {
      ok: false,
      status: 429,
      error: `Too many wrong codes. Undo is locked for up to ${LOCKOUT_MINUTES} minutes.`,
    };
  }

  const valid =
    typeof pin === "string" &&
    /^\d{4}$/.test(pin) &&
    timingSafeEqual(Buffer.from(pin), Buffer.from(expected));

  if (!valid) {
    await supabaseServer.from("undo_pin_failures").insert({ created_at: new Date().toISOString() });
    const remaining = MAX_FAILURES - recentFailures - 1;
    return {
      ok: false,
      status: 401,
      error:
        remaining > 0
          ? `Wrong code. ${remaining} ${remaining === 1 ? "try" : "tries"} left.`
          : `Wrong code. Undo is locked for ${LOCKOUT_MINUTES} minutes.`,
    };
  }

  return { ok: true };
}
