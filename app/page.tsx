"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { TurnCard } from "@/components/turn-card";
import { LogTrashForm } from "@/components/log-trash-form";
import { Button } from "@/components/ui/button";
import type { CurrentTurn, Roommate } from "@/lib/supabase/types";

export default function Home() {
  const [turn, setTurn] = useState<CurrentTurn | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [turnRes, roommatesRes] = await Promise.all([
        fetch("/api/turn"),
        fetch("/api/roommates"),
      ]);
      if (!turnRes.ok || !roommatesRes.ok) throw new Error();
      const turnData = await turnRes.json();
      const roommatesData = await roommatesRes.json();
      setTurn(turnData);
      setRoommates(roommatesData.roommates);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    void load();
  }, [load]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">🗑️ Trash Tracker</h1>
        </div>
        <Button variant="ghost" size="sm" className="h-10 px-3" render={<Link href="/history" />}>
          <History className="size-4" />
          History
        </Button>
      </header>

      {loading && (
        <div className="flex flex-col gap-4 py-10" role="status" aria-label="Loading tracker">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="mx-auto h-4 w-32 animate-pulse rounded-full bg-muted" />
        </div>
      )}

      {!loading && error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive">
          Couldn&apos;t load the tracker. Check your connection and try again.
        </p>
      )}

      {!loading && !error && turn && (
        <>
          <TurnCard turn={turn} />
          <LogTrashForm roommates={roommates} onLogged={load} />
        </>
      )}
    </main>
  );
}
