"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock3, Loader2 } from "lucide-react";
import { LogHistoryItem } from "@/components/log-history-item";
import { Button } from "@/components/ui/button";
import type { TrashLogWithRoommate } from "@/lib/supabase/types";

export default function HistoryPage() {
  const [logs, setLogs] = useState<TrashLogWithRoommate[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (pageToLoad: number) => {
    try {
      const res = await fetch(`/api/logs?page=${pageToLoad}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLogs((prev) =>
        pageToLoad === 0 ? data.logs : [...prev, ...data.logs]
      );
      setHasMore(data.hasMore);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load(0).finally(() => setLoading(false));
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    await load(nextPage);
    setPage(nextPage);
    setLoadingMore(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-7 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          render={<Link href="/" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Clock3 className="size-3.5" /> Household record
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        </div>
      </header>

      {loading && (
        <div className="flex flex-col gap-3 py-10" role="status" aria-label="Loading history">
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {!loading && error && (
        <p className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
          Couldn&apos;t load history. Check your connection and try again.
        </p>
      )}

      {!loading && !error && logs.length === 0 && (
        <p className="rounded-xl border border-dashed border-primary/25 bg-card/60 px-6 py-16 text-center text-sm text-muted-foreground">
          No logs yet. Be the first to take out the trash!
        </p>
      )}

      {!loading && !error && logs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {logs.map((log) => (
            <LogHistoryItem key={log.id} log={log} />
          ))}
        </ul>
      )}

      {!loading && hasMore && (
        <Button variant="outline" className="h-11 w-full" onClick={loadMore} disabled={loadingMore}>
          {loadingMore && <Loader2 className="size-4 animate-spin" />}
          Load more
        </Button>
      )}
    </main>
  );
}
