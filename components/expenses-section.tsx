"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { ExpenseForm } from "@/components/expense-form";
import { BalanceDashboard } from "@/components/balance-dashboard";
import { RecentActivityList } from "@/components/recent-activity-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { Balance } from "@/lib/balances";
import type { ActivityItem, Roommate } from "@/lib/supabase/types";

export function ExpensesSection({ roommates }: { roommates: Roommate[] }) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/balances");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBalances(data.balances);
      setActivity(data.activity);
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
    <section className="flex flex-col gap-6 border-t border-border pt-8">
      <h2 className="font-heading flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Wallet className="size-6 text-primary" />
        Household Expenses
      </h2>

      {loading && (
        <div className="flex flex-col gap-6" role="status" aria-label="Loading expenses">
          <Skeleton className="h-11 w-full rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      )}

      {!loading && error && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive">
          Couldn&apos;t load expenses. Check your connection and try again.
        </p>
      )}

      {!loading && !error && (
        <>
          <ExpenseForm roommates={roommates} onAdded={load} />
          <BalanceDashboard balances={balances} onSettled={load} />
          <RecentActivityList activity={activity} />
        </>
      )}
    </section>
  );
}
