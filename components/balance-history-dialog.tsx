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
import { Money } from "@/components/money";
import { formatCents } from "@/lib/money";
import {
  splitAtLastSettleUp,
  type Balance,
  type PairHistoryEntryWithRunning,
} from "@/lib/balances";
import { cn } from "@/lib/utils";

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
  const [showSettled, setShowSettled] = useState(false);

  const from = balance.fromRoommate;
  const to = balance.toRoommate;
  // Every entry is between exactly these two people, so ids map to one of them.
  const nameOf = (id: string) => (id === from.id ? from.name : to.name);

  function describe(entry: PairHistoryEntryWithRunning) {
    // For a settlement, creditorId is the payer and owerId the receiver (see the history route).
    return entry.type === "expense"
      ? `${nameOf(entry.creditorId)} paid for ${entry.description}`
      : `${nameOf(entry.creditorId)} paid ${nameOf(entry.owerId)}`;
  }

  function describeRunning(cents: number) {
    if (cents === 0) return "Settled up";
    return cents > 0
      ? `${from.name} owes ${to.name} ${formatCents(cents)}`
      : `${to.name} owes ${from.name} ${formatCents(-cents)}`;
  }

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ from: from.id, to: to.id });
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

  const { settled, current } = splitAtLastSettleUp(entries ?? []);

  function renderRow(entry: PairHistoryEntryWithRunning, isSettled: boolean) {
    const addsToBalance = entry.owerId === from.id;
    return (
      <li
        key={entry.id}
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm",
          isSettled && "opacity-60"
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate">{describe(entry)}</p>
          <p className="text-xs text-muted-foreground">
            {entry.type === "expense" && `${nameOf(entry.owerId)}'s share · `}
            {formatDate(entry.createdAt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-base font-semibold tabular-nums", !addsToBalance && "text-primary")}>
            {addsToBalance ? "+" : "−"}
            <Money cents={entry.amountCents} />
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {describeRunning(entry.runningBalanceCents)}
          </p>
        </div>
      </li>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setEntries(null);
          setShowSettled(false);
        }
      }}
    >
      {/* Load here, not in onOpenChange: Base UI only fires that for its own
          interactions (Escape, outside click), not when `open` is set from outside. */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void load();
        }}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <InitialsAvatar name={from.name} />
        <span className="min-w-0 truncate">
          <span className="font-medium">{from.name}</span>
          <span className="text-muted-foreground"> owes </span>
          <span className="font-medium">{to.name}</span>
        </span>
      </button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {from.name} &rarr; {to.name}
          </DialogTitle>
          <DialogDescription>
            How the current balance of {formatCents(balance.amountCents)} built up
            {settled.length > 0 ? " since you last settled up." : "."}
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
          <div className="flex flex-col gap-2">
            {settled.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSettled((v) => !v)}
                className="self-start text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {showSettled ? "Hide" : "Show"} {settled.length} earlier{" "}
                {settled.length === 1 ? "entry" : "entries"} (already settled)
              </button>
            )}
            <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {showSettled && settled.map((entry) => renderRow(entry, true))}
              {current.map((entry) => renderRow(entry, false))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
