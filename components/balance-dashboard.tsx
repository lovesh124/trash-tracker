"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import type { Balance } from "@/lib/balances";

export function BalanceDashboard({
  balances,
  onSettled,
}: {
  balances: Balance[];
  onSettled: () => void;
}) {
  const [settlingKey, setSettlingKey] = useState<string | null>(null);

  async function handlePayNow(balance: Balance) {
    const key = `${balance.fromRoommate.id}:${balance.toRoommate.id}`;
    setSettlingKey(key);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_roommate_id: balance.fromRoommate.id,
          to_roommate_id: balance.toRoommate.id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast.info("That balance was already settled");
          onSettled();
          return;
        }
        throw new Error(body.error ?? "Failed to record payment");
      }

      toast.success(`${balance.fromRoommate.name} paid ${balance.toRoommate.name}!`);
      onSettled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSettlingKey(null);
    }
  }

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
            const isSettling = settlingKey === key;
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
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSettling}
                    onClick={() => handlePayNow(balance)}
                  >
                    {isSettling && <Loader2 className="size-3.5 animate-spin" />}
                    Pay Now
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
