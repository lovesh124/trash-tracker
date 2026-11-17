"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Money } from "@/components/money";
import { CATEGORY_ICONS } from "@/components/category-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { TRACKED_CATEGORIES } from "@/lib/categories";
import type { SpendingExpense } from "@/lib/supabase/types";

const MONTHS_SHOWN = 6;

type MonthTotal = {
  key: string;
  label: string;
  totalCents: number;
  shares: { name: string; cents: number }[];
};

/** The last MONTHS_SHOWN calendar months (local time), newest first, with totals for one category. */
function monthlyTotals(expenses: SpendingExpense[], category: string): MonthTotal[] {
  const now = new Date();
  const months: MonthTotal[] = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString(undefined, { month: "short", year: "numeric" }),
      totalCents: 0,
      shares: [],
    };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));

  for (const expense of expenses) {
    if (expense.category !== category) continue;
    const d = new Date(expense.createdAt);
    const month = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (!month) continue;
    month.totalCents += expense.totalCents;
    for (const { roommate, cents } of expense.shares) {
      const share = month.shares.find((s) => s.name === roommate.name);
      if (share) share.cents += cents;
      else month.shares.push({ name: roommate.name, cents });
    }
  }
  for (const month of months) month.shares.sort((a, b) => b.cents - a.cents);
  return months;
}

export function CategorySpending({ refreshKey }: { refreshKey: number }) {
  const [result, setResult] = useState<{ expenses: SpendingExpense[]; failed: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/spending")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Request failed"))))
      .then((data: { expenses: SpendingExpense[] }) => {
        if (!cancelled) setResult({ expenses: data.expenses, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult((prev) => ({ expenses: prev?.expenses ?? [], failed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Monthly spending
      </h3>

      {!result && <Skeleton className="h-40 w-full rounded-xl" />}

      {result?.failed && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
          Couldn&apos;t load monthly spending.
        </p>
      )}

      {result && !result.failed && (
        <div className="stagger-children grid gap-3 sm:grid-cols-2">
          {TRACKED_CATEGORIES.map(({ key, label }) => {
            const Icon = CATEGORY_ICONS[key];
            const months = monthlyTotals(result.expenses, key);
            const anySpending = months.some((m) => m.totalCents > 0);
            return (
              <section
                key={key}
                aria-label={`${label} spending`}
                className="rounded-xl bg-[linear-gradient(180deg,var(--card),color-mix(in_oklch,var(--card),var(--muted)_50%))] p-4 ring-1 ring-foreground/10"
              >
                <h4 className="mb-2 flex items-center gap-2 font-medium">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  {label}
                </h4>

                {!anySpending && (
                  <p className="py-2 text-sm text-muted-foreground">Nothing logged in the last {MONTHS_SHOWN} months.</p>
                )}

                {anySpending && (
                  <ul className="divide-y divide-foreground/10">
                    {months.map((month) =>
                      month.totalCents > 0 ? (
                        <li key={month.key}>
                          <details className="group py-2">
                            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
                              <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
                              <span className="flex-1">{month.label}</span>
                              <span className="font-semibold tabular-nums">
                                <Money cents={month.totalCents} />
                              </span>
                            </summary>
                            <ul className="mt-1.5 flex flex-col gap-1 pl-5.5 text-xs text-muted-foreground">
                              {month.shares.map((share) => (
                                <li key={share.name} className="flex justify-between gap-3">
                                  <span className="truncate">{share.name}</span>
                                  <Money cents={share.cents} />
                                </li>
                              ))}
                            </ul>
                          </details>
                        </li>
                      ) : (
                        <li key={month.key} className="flex items-center gap-2 py-2 pl-5.5 text-sm text-muted-foreground">
                          <span className="flex-1">{month.label}</span>
                          <span>—</span>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
