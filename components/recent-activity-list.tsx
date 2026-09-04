"use client";

import { useState } from "react";
import { HandCoins, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatCents } from "@/lib/money";
import type { ActivityItem } from "@/lib/supabase/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
          <DialogTitle>{label}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static local asset */}
          <img src={proofUrl} alt={label} className="w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RecentActivityList({ activity }: { activity: ActivityItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Recent Activity
      </h3>

      {activity.length === 0 && (
        <p className="rounded-xl border border-dashed border-primary/25 bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
          No expenses yet.
        </p>
      )}

      {activity.length > 0 && (
        <ul className="flex flex-col gap-2">
          {activity.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className="flex items-center gap-3 rounded-xl bg-card p-3.5 shadow-[0_8px_24px_-20px_oklch(0.3_0.06_145)] ring-1 ring-foreground/10 transition-colors hover:bg-card/80"
            >
              {item.type === "settlement" && item.proofUrl ? (
                <SettlementProofThumbnail
                  proofUrl={item.proofUrl}
                  label={`Proof that ${item.from.name} paid ${item.to.name}`}
                />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {item.type === "expense" ? (
                    <Receipt className="size-4" />
                  ) : (
                    <HandCoins className="size-4" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {item.type === "expense" ? (
                  <p className="flex flex-wrap items-center gap-x-1 text-sm">
                    <span className="truncate">
                      <span className="font-medium">{item.payer.name}</span> paid for{" "}
                      {item.description}
                    </span>
                    <Badge variant="accent">{formatCents(item.totalCents)}</Badge>
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
                    <Badge variant="accent">{formatCents(item.amountCents)}</Badge>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
