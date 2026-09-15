"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Broom, History, Trash2, type LucideIcon } from "lucide-react";
import { TurnCard } from "@/components/turn-card";
import { LogChoreForm } from "@/components/log-chore-form";
import { ExpensesSection } from "@/components/expenses-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CurrentTurn, Roommate } from "@/lib/supabase/types";

type Chore = "trash" | "sweep";

const CHORE_CONFIG: Record<
  Chore,
  {
    dialLabel: string;
    sectionLabel: string;
    icon: LucideIcon;
    apiPath: string;
    triggerLabel: string;
    dialogTitle: string;
    dialogDescription: string;
    roommateQuestion: string;
    successMessage: string;
  }
> = {
  trash: {
    dialLabel: "Trash",
    sectionLabel: "Trash",
    icon: Trash2,
    apiPath: "/api/logs",
    triggerLabel: "Log a completed turn",
    dialogTitle: "Log trash taken out",
    dialogDescription: "Pick who took it out. Adding a photo is optional.",
    roommateQuestion: "Who took it out?",
    successMessage: "Trash log recorded!",
  },
  sweep: {
    dialLabel: "Sweep",
    sectionLabel: "Sweeping (kitchen + living room)",
    icon: Broom,
    apiPath: "/api/sweep/logs",
    triggerLabel: "Log a completed sweep",
    dialogTitle: "Log kitchen + living room swept",
    dialogDescription: "Pick who swept it. Adding a photo is optional.",
    roommateQuestion: "Who swept it?",
    successMessage: "Sweep log recorded!",
  },
};

function ChoreSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-card py-8 ring-1 ring-foreground/10 sm:py-10">
        <Skeleton className="size-14 rounded-2xl" />
        <Skeleton className="h-3 w-16 rounded-full" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

export default function Home() {
  const [chore, setChore] = useState<Chore>("trash");
  const [trashTurn, setTrashTurn] = useState<CurrentTurn | null>(null);
  const [sweepTurn, setSweepTurn] = useState<CurrentTurn | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [trashTurnRes, sweepTurnRes, roommatesRes] = await Promise.all([
        fetch("/api/turn"),
        fetch("/api/sweep/turn"),
        fetch("/api/roommates"),
      ]);
      if (!trashTurnRes.ok || !sweepTurnRes.ok || !roommatesRes.ok) throw new Error();
      const trashTurnData = await trashTurnRes.json();
      const sweepTurnData = await sweepTurnRes.json();
      const roommatesData = await roommatesRes.json();
      setTrashTurn(trashTurnData);
      setSweepTurn(sweepTurnData);
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

  const turn = chore === "trash" ? trashTurn : sweepTurn;
  const config = CHORE_CONFIG[chore];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-9 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Trash2 className="size-6 text-primary" />
            Trash Tracker
          </h1>
        </div>
        <Button variant="ghost" size="sm" className="h-10 px-3" render={<Link href="/history" />}>
          <History className="size-4" />
          History
        </Button>
      </header>

      {loading && (
        <div role="status" aria-label="Loading tracker">
          <ChoreSkeleton />
        </div>
      )}

      {!loading && error && (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive">
          Couldn&apos;t load the tracker. Check your connection and try again.
        </p>
      )}

      {!loading && !error && turn && (
        <>
          <div className="inline-flex self-start rounded-full bg-muted p-1 ring-1 ring-foreground/10">
            {(Object.keys(CHORE_CONFIG) as Chore[]).map((key) => {
              const Icon = CHORE_CONFIG[key].icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setChore(key)}
                  aria-pressed={chore === key}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                    chore === key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {CHORE_CONFIG[key].dialLabel}
                </button>
              );
            })}
          </div>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {config.sectionLabel}
            </h3>
            <TurnCard turn={turn} icon={config.icon} />
            <LogChoreForm
              key={chore}
              roommates={roommates}
              onLogged={load}
              apiPath={config.apiPath}
              triggerLabel={config.triggerLabel}
              dialogTitle={config.dialogTitle}
              dialogDescription={config.dialogDescription}
              roommateQuestion={config.roommateQuestion}
              successMessage={config.successMessage}
            />
          </section>

          <ExpensesSection roommates={roommates} />
        </>
      )}
    </main>
  );
}
