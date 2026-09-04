import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
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
                className="ring-1 ring-foreground/10 transition-colors hover:bg-muted/30"
              >
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <InitialsAvatar name={balance.fromRoommate.name} />
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{balance.fromRoommate.name}</span>
                      <span className="text-muted-foreground"> owes </span>
                      <span className="font-medium">{balance.toRoommate.name}</span>
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="accent">{formatCents(balance.amountCents)}</Badge>
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
