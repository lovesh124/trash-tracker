import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatCents } from "@/lib/money";
import { totalOwedPerRoommate, type Balance } from "@/lib/balances";

export function NetTotals({ balances }: { balances: Balance[] }) {
  const totals = totalOwedPerRoommate(balances);
  if (totals.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Totals owed
      </h3>
      <ul className="flex flex-col divide-y divide-foreground/10 rounded-xl bg-[linear-gradient(180deg,var(--card),color-mix(in_oklch,var(--card),var(--muted)_50%))] ring-1 ring-foreground/10">
        {totals.map(({ roommate, owedCents }) => (
          <li key={roommate.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <InitialsAvatar name={roommate.name} />
            <span className="min-w-0 flex-1 truncate font-medium">{roommate.name}</span>
            <span className="text-muted-foreground">is owed</span>
            <span className="min-w-20 text-right text-base font-semibold tabular-nums text-primary">
              {formatCents(owedCents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
