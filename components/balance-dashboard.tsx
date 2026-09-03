import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
              <Card key={key} className="ring-1 ring-foreground/10">
                <CardContent className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
                    <span className="font-medium">{balance.fromRoommate.name}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{balance.toRoommate.name}</span>
                    <span className="ml-1 shrink-0 text-muted-foreground">
                      {formatCents(balance.amountCents)}
                    </span>
                  </div>
                  <PayNowDialog balance={balance} onSettled={onSettled} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
