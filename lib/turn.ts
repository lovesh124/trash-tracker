import type { Roommate } from "@/lib/supabase/types";

/** Whose turn is next, given the ordered roommate list and whoever last took a turn (or null if nobody has yet). */
export function getNextRoommate(roommates: Roommate[], lastRoommateId: string | null): Roommate {
  if (!lastRoommateId) return roommates[0];
  const lastIndex = roommates.findIndex((r) => r.id === lastRoommateId);
  return roommates[(lastIndex + 1) % roommates.length];
}
