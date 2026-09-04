import { ArrowRight, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card className="relative items-center overflow-visible border-0 bg-primary py-6 text-center text-primary-foreground shadow-[0_18px_45px_-24px_oklch(0.3_0.12_38)] sm:py-8">
      <div className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-accent" />
      <CardContent className="flex w-full flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-foreground/12 ring-1 ring-primary-foreground/20">
          <Trash2 className="size-7" />
        </div>
        <Badge variant="accent" className="tracking-[0.2em] uppercase">
          Up next
        </Badge>
        <p className="max-w-full text-3xl font-semibold tracking-tight sm:text-4xl">
          {turn.roommate.name}&apos;s turn
        </p>
        {turn.lastLog && (
          <div className="mt-2 flex items-center gap-2 rounded-full bg-primary-foreground/10 py-1 pl-3 pr-1 text-xs text-primary-foreground/75 ring-1 ring-primary-foreground/10">
            <span>Last done by {turn.lastLog.roommate.name}</span>
            <ArrowRight className="size-3" />
            <Badge variant="accent">{formatRelativeTime(turn.lastLog.taken_at)}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
