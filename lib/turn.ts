/** Whoever comes right after `lastRoommateId` in house order (the first roommate if nobody has gone yet). */
export function getRoommateAfter<R extends { id: string }>(roommates: R[], lastRoommateId: string | null): R {
  if (!lastRoommateId) return roommates[0];
  const lastIndex = roommates.findIndex((r) => r.id === lastRoommateId);
  return roommates[(lastIndex + 1) % roommates.length];
}

/**
 * Fair rotation: whoever has done the chore the fewest times (in
 * `logRoommateIds`) is up next. Ties go in house order starting from
 * `startRoommateId`, so when nobody covers for anyone this is the plain
 * rotation — but doing someone else's turn credits you, and you're skipped
 * later so it evens out, instead of the line jumping to whoever logged last.
 */
export function getNextRoommate<R extends { id: string }>(
  roommates: R[],
  logRoommateIds: string[],
  startRoommateId: string | null
): R {
  const counts = new Map(roommates.map((r) => [r.id, 0]));
  for (const id of logRoommateIds) {
    const count = counts.get(id);
    if (count !== undefined) counts.set(id, count + 1);
  }

  const startIndex = Math.max(0, roommates.findIndex((r) => r.id === startRoommateId));
  const rotation = [...roommates.slice(startIndex), ...roommates.slice(0, startIndex)];
  const fewest = Math.min(...counts.values());
  return rotation.find((r) => counts.get(r.id) === fewest)!;
}
