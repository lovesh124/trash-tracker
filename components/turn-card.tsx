import { Trash2 } from "lucide-react";
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
    <Card className="items-center py-8 text-center">
      <CardContent className="flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Trash2 className="size-7 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">It&apos;s currently</p>
        <p className="text-3xl font-semibold tracking-tight">
          {turn.roommate.name}&apos;s turn
        </p>
        {turn.lastLog && (
          <p className="text-xs text-muted-foreground">
            Last taken out by {turn.lastLog.roommate.name} ·{" "}
            {formatRelativeTime(turn.lastLog.taken_at)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
