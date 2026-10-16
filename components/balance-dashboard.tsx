import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BalanceHistoryDialog } from "@/components/balance-history-dialog";
import { PayNowDialog } from "@/components/pay-now-dialog";
import { formatCents } from "@/lib/money";
import type { Balance } from "@/lib/balances";

export function BalanceDashboard({
  balances,
  onSettled,
}: {
  balances: Balance[];
  onSettled: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Balances
      </h3>

      {balances.length === 0 && (
        <p className="rounded-xl border border-dashed border-primary/25 bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
          All settled up!
        </p>
      )}

      {balances.length > 0 && (
        <div className="flex flex-col gap-2">
          {balances.map((balance) => {
            const key = `${balance.fromRoommate.id}:${balance.toRoommate.id}`;
            return (
              <Card
                key={key}
                className="bg-[linear-gradient(180deg,var(--card),color-mix(in_oklch,var(--card),var(--muted)_50%))] ring-1 ring-foreground/10 transition-all hover:brightness-97"
              >
                <CardContent className="flex items-center justify-between gap-3">
                  <BalanceHistoryDialog balance={balance} />
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="accent" className="h-6 px-2.5 text-sm font-semibold tabular-nums">
                      {formatCents(balance.amountCents)}
                    </Badge>
                    <PayNowDialog balance={balance} onSettled={onSettled} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
