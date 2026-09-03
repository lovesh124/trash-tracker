import { HandCoins, Receipt } from "lucide-react";
import { formatCents } from "@/lib/money";
import type { ActivityItem } from "@/lib/supabase/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
              className="flex items-center gap-3 rounded-xl bg-card p-3.5 shadow-[0_8px_24px_-20px_oklch(0.3_0.06_145)] ring-1 ring-foreground/10"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {item.type === "expense" ? (
                  <Receipt className="size-4" />
                ) : (
                  <HandCoins className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {item.type === "expense" ? (
                  <p className="truncate text-sm">
                    <span className="font-medium">{item.payer.name}</span> paid for{" "}
                    {item.description} —{" "}
                    <span className="font-medium">{formatCents(item.totalCents)}</span>
                    {item.owerNames.length > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        split with {item.owerNames.join(", ")}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="truncate text-sm">
                    <span className="font-medium">{item.from.name}</span> paid{" "}
                    <span className="font-medium">{item.to.name}</span>{" "}
                    {formatCents(item.amountCents)}
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
