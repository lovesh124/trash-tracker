"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <header className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          render={<Link href="/" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold tracking-tight">History</h1>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && error && (
        <p className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
          Couldn&apos;t load history. Check your connection and try again.
        </p>
      )}

      {!loading && !error && logs.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No logs yet. Be the first to take out the trash!
        </p>
      )}

      {!loading && !error && logs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <LogHistoryItem key={log.id} log={log} />
          ))}
        </ul>
      )}

      {!loading && hasMore && (
        <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
          {loadingMore && <Loader2 className="size-4 animate-spin" />}
          Load more
        </Button>
      )}
    </main>
  );
}
