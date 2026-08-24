"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">🗑️ Trash Tracker</h1>
        <Button variant="ghost" size="sm" render={<Link href="/history" />}>
          <History className="size-4" />
          History
        </Button>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <p className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
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
