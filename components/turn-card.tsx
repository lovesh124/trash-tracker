import { ArrowRight, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CurrentTurn } from "@/lib/supabase/types";

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function TurnCard({ turn }: { turn: CurrentTurn }) {
  return (
    <Card className="relative items-center overflow-visible border-0 bg-primary py-8 text-center text-primary-foreground shadow-[0_18px_45px_-24px_oklch(0.25_0.08_145)] sm:py-10">
      <div className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-accent" />
      <CardContent className="flex w-full flex-col items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-foreground/12 ring-1 ring-primary-foreground/20">
          <Trash2 className="size-8" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
          Up next
        </p>
        <p className="max-w-full text-4xl font-semibold tracking-tight sm:text-5xl">
          {turn.roommate.name}&apos;s turn
        </p>
        {turn.lastLog && (
          <div className="mt-2 flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs text-primary-foreground/75 ring-1 ring-primary-foreground/10">
            <span>Last done by {turn.lastLog.roommate.name}</span>
            <ArrowRight className="size-3" />
            <span>{formatRelativeTime(turn.lastLog.taken_at)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
