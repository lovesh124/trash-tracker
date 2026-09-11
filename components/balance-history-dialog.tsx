"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatCents } from "@/lib/money";
import type { Balance, PairHistoryEntryWithRunning } from "@/lib/balances";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BalanceHistoryDialog({ balance }: { balance: Balance }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<PairHistoryEntryWithRunning[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        from: balance.fromRoommate.id,
        to: balance.toRoommate.id,
      });
      const res = await fetch(`/api/balances/history?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.entries);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          void load();
        } else {
          setEntries(null);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <InitialsAvatar name={balance.fromRoommate.name} />
        <span className="min-w-0 truncate">
          <span className="font-medium">{balance.fromRoommate.name}</span>
          <span className="text-muted-foreground"> owes </span>
          <span className="font-medium">{balance.toRoommate.name}</span>
        </span>
      </button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {balance.fromRoommate.name} &rarr; {balance.toRoommate.name}
          </DialogTitle>
          <DialogDescription>
            How the current balance of {formatCents(balance.amountCents)} built up.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <p className="py-2 text-center text-sm text-destructive">Couldn&apos;t load history.</p>
        )}

        {!loading && !error && entries && entries.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">No history yet.</p>
        )}

        {!loading && !error && entries && entries.length > 0 && (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {entries.map((entry) => {
              const addsToBalance = entry.owerId === balance.fromRoommate.id;
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`tabular-nums font-medium ${addsToBalance ? "" : "text-primary"}`}>
                      {addsToBalance ? "+" : "−"}
                      {formatCents(entry.amountCents)}
                    </p>
                    <p className="tabular-nums text-xs text-muted-foreground">
                      bal {formatCents(Math.abs(entry.runningBalanceCents))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
