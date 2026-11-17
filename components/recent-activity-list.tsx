"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UndoButton } from "@/components/undo-button";
import { CATEGORY_ICONS } from "@/components/category-icon";
import { EXPENSE_CATEGORIES, categoryLabel, type ExpenseCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/lib/supabase/types";

/** How many page numbers are shown at once, around the current page. */
const PAGE_WINDOW = 3;

type Filter = "all" | ExpenseCategory;

function PaidBackStatus({ settled, total }: { settled: number; total: number }) {
  if (total === 0) return null;
  if (settled === total) {
    return (
      <span className="inline-flex items-center gap-0.5 font-medium text-primary">
        <Check className="size-3" /> Paid back
      </span>
    );
  }
  if (settled === 0) return <span>Still owed</span>;
  return (
    <span>
      {settled} of {total} paid back
    </span>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ActivityIcon({ item }: { item: ActivityItem }) {
  const tracked = item.type === "expense" && item.category !== "other";
  const Icon = item.type === "expense" ? CATEGORY_ICONS[item.category] : HandCoins;
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        tracked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}
      title={item.type === "expense" ? categoryLabel(item.category) : "Payment"}
    >
      <Icon className="size-4" />
    </div>
  );
}

function SettlementProofThumbnail({ proofUrl, label }: { proofUrl: string; label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label="View payment proof"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static local asset */}
        <img
          src={proofUrl}
          alt={label}
          className="size-9 rounded-lg object-cover ring-1 ring-foreground/10"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogTitle className="pr-8">{label}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static local asset */}
          <img src={proofUrl} alt={label} className="max-h-[75dvh] w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RecentActivityList({
  refreshKey,
  onChanged,
}: {
  /** Changes whenever balances reload (new expense, payment, undo), to refetch the current page. */
  refreshKey: number;
  onChanged: () => void;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [result, setResult] = useState<{
    key: string;
    items: ActivityItem[];
    totalPages: number;
    failed: boolean;
  } | null>(null);

  // "Loading" is derived (what's shown isn't for this page/refresh yet), so the
  // effect never has to set state synchronously.
  const requestKey = `${filter}:${page}:${refreshKey}`;
  const loading = result?.key !== requestKey;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page) });
    if (filter !== "all") params.set("category", filter);
    fetch(`/api/activity?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Request failed"))))
      .then((data: { items: ActivityItem[]; totalPages: number }) => {
        if (cancelled) return;
        // e.g. an undo emptied the last page: step back to the new last page.
        if (page > data.totalPages) {
          setPage(data.totalPages);
          return;
        }
        setResult({ key: requestKey, items: data.items, totalPages: data.totalPages, failed: false });
      })
      .catch(() => {
        if (cancelled) return;
        setResult((prev) => ({
          key: requestKey,
          items: prev?.items ?? [],
          totalPages: prev?.totalPages ?? 1,
          failed: true,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [page, filter, requestKey]);

  const items = result?.items ?? [];
  const totalPages = result?.totalPages ?? 1;
  const firstShown = Math.max(1, Math.min(page - 1, totalPages - PAGE_WINDOW + 1));
  const shownPages = Array.from({ length: Math.min(PAGE_WINDOW, totalPages) }, (_, i) => firstShown + i);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Recent Activity
      </h3>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="inline-flex rounded-full bg-muted p-1 ring-1 ring-foreground/10">
          {([{ key: "all", label: "All" }, ...EXPENSE_CATEGORIES] as const).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-all",
                filter === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!result && (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading recent activity">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {result?.failed && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
          Couldn&apos;t load activity. Check your connection and try again.
        </p>
      )}

      {result && !result.failed && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-primary/25 bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
          {filter === "all" ? "No expenses yet." : `No ${categoryLabel(filter)} expenses yet.`}
        </p>
      )}

      {items.length > 0 && (
        <ul className={cn("stagger-children flex flex-col gap-2 transition-opacity", loading && "opacity-60")}>
          {items.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 rounded-xl bg-[linear-gradient(180deg,var(--card),color-mix(in_oklch,var(--card),var(--muted)_50%))] p-4 shadow-[0_8px_24px_-20px_oklch(0.3_0.06_145)] ring-1 ring-foreground/10 transition-all hover:brightness-97"
            >
              {item.type === "settlement" && item.proofUrl ? (
                <SettlementProofThumbnail
                  proofUrl={item.proofUrl}
                  label={`Proof that ${item.from.name} paid ${item.to.name}`}
                />
              ) : (
                <ActivityIcon item={item} />
              )}
              <div className="min-w-0 flex-1">
                {item.type === "expense" ? (
                  <p className="flex flex-wrap items-center gap-x-1 text-sm">
                    <span className="truncate">
                      <span className="font-medium">{item.payer.name}</span> paid for{" "}
                      {item.description}
                    </span>
                    <Badge variant="accent" className="tabular-nums">
                      <Money cents={item.totalCents} />
                    </Badge>
                    {item.owerNames.length > 0 && (
                      <span className="text-muted-foreground">
                        split with {item.owerNames.join(", ")}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="flex flex-wrap items-center gap-x-1 text-sm">
                    <span className="font-medium">{item.from.name}</span>
                    <span>paid</span>
                    <span className="font-medium">{item.to.name}</span>
                    <Badge variant="accent" className="tabular-nums">
                      <Money cents={item.amountCents} />
                    </Badge>
                  </p>
                )}
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <span>{formatDateTime(item.createdAt)}</span>
                  {item.type === "expense" && item.paidBack.total > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <PaidBackStatus {...item.paidBack} />
                    </>
                  )}
                </p>
              </div>
              <UndoButton
                type={item.type}
                id={item.id}
                summary={
                  item.type === "expense"
                    ? `${item.payer.name}'s expense "${item.description}"`
                    : `${item.from.name}'s payment to ${item.to.name}`
                }
                onUndone={onChanged}
              />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Recent activity pages" className="flex flex-col items-center gap-1.5 pt-1">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {shownPages.map((n) => (
              <Button
                key={n}
                type="button"
                size="icon-sm"
                variant={n === page ? "default" : "outline"}
                aria-current={n === page ? "page" : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 px-3"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        </nav>
      )}
    </div>
  );
}
