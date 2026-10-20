"use client";

import { useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/money";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { centsToDollarString, parseDollarsToCents, splitEvenly } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Roommate } from "@/lib/supabase/types";

type SplitMode = "even" | "custom";

export function ExpenseForm({
  roommates,
  onAdded,
}: {
  roommates: Roommate[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [payerId, setPayerId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<SplitMode>("even");
  const [total, setTotal] = useState("");
  // Tracked as who's left *out*, so everyone is included by default.
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setPayerId("");
    setDescription("");
    setMode("even");
    setTotal("");
    setExcludedIds(new Set());
    setAmounts({});
  }

  function toggleIncluded(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalCents = parseDollarsToCents(total);
  const participantIds = roommates.filter((r) => !excludedIds.has(r.id)).map((r) => r.id);
  const evenShares =
    totalCents !== null ? splitEvenly(totalCents, participantIds, payerId) : new Map<string, number>();

  function buildSplits(): { roommate_id: string; amount: string }[] | string {
    if (mode === "custom") {
      const splits = roommates
        .filter((r) => r.id !== payerId)
        .map((r) => ({ roommate_id: r.id, amount: amounts[r.id] ?? "" }))
        .filter((s) => parseDollarsToCents(s.amount) !== null);
      return splits.length > 0 ? splits : "Assign an amount to at least one roommate";
    }

    if (totalCents === null) return "Enter the total amount";
    if (!participantIds.some((id) => id !== payerId)) {
      return "Include at least one roommate besides the payer";
    }
    // Zero-cent shares (a tiny total split many ways) are dropped — the API rejects them.
    const splits = participantIds
      .filter((id) => id !== payerId && (evenShares.get(id) ?? 0) > 0)
      .map((id) => ({ roommate_id: id, amount: centsToDollarString(evenShares.get(id)!) }));
    return splits.length > 0 ? splits : "That total is too small to split";
  }

  async function handleSubmit() {
    if (!payerId) {
      toast.error("Pick who paid");
      return;
    }
    if (!description.trim()) {
      toast.error("Add a description");
      return;
    }

    const splits = buildSplits();
    if (typeof splits === "string") {
      toast.error(splits);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payer_id: payerId, description: description.trim(), splits }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add expense");
      }

      toast.success("Expense added!");
      resetForm();
      setOpen(false);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const owers = roommates.filter((r) => r.id !== payerId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <Button
        size="lg"
        className="w-full shadow-[0_12px_28px_-18px_oklch(0.25_0.08_145)] transition-transform hover:-translate-y-0.5"
        onClick={() => setOpen(true)}
      >
        <Receipt className="size-4" />
        Add an expense
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an expense</DialogTitle>
          <DialogDescription>
            Pick who paid, then split it evenly or enter what each roommate owes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payer">Who paid?</Label>
            <Select
              items={roommates.map((r) => ({ value: r.id, label: r.name }))}
              value={payerId}
              onValueChange={(value) => setPayerId(value ?? "")}
            >
              <SelectTrigger id="payer" className="w-full">
                <SelectValue placeholder="Select a roommate" />
              </SelectTrigger>
              <SelectContent>
                {roommates.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">What was it for?</Label>
            <Input
              id="description"
              placeholder="Groceries, utilities, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {payerId && (
            <div className="flex flex-col gap-3">
              <div className="inline-flex self-start rounded-full bg-muted p-1 ring-1 ring-foreground/10">
                {(
                  [
                    ["even", "Split evenly"],
                    ["custom", "Custom amounts"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    aria-pressed={mode === key}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-medium transition-all",
                      mode === key
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "even" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="total">Total amount</Label>
                    <Input
                      id="total"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={total}
                      onChange={(e) => setTotal(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Split between</Label>
                    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                      {roommates.map((r) => {
                        const included = !excludedIds.has(r.id);
                        const share = evenShares.get(r.id);
                        const isPayer = r.id === payerId;
                        return (
                          <label
                            key={r.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50"
                          >
                            <input
                              type="checkbox"
                              checked={included}
                              onChange={() => toggleIncluded(r.id)}
                              className="size-4 accent-primary"
                            />
                            <span className={cn("flex-1 truncate", !included && "text-muted-foreground")}>
                              {r.name}
                              {isPayer && <span className="text-muted-foreground"> (paid)</span>}
                            </span>
                            {included && share !== undefined && (
                              <span
                                className={cn(
                                  "tabular-nums",
                                  isPayer ? "text-muted-foreground" : "font-medium"
                                )}
                              >
                                {isPayer ? "own share " : "owes "}
                                <Money cents={share} />
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label>Who owes what?</Label>
                  <div className="flex flex-col gap-2">
                    {owers.map((r) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <span className="w-24 shrink-0 truncate text-sm">{r.name}</span>
                        <Input
                          inputMode="decimal"
                          placeholder="0.00"
                          value={amounts[r.id] ?? ""}
                          onChange={(e) =>
                            setAmounts((prev) => ({ ...prev, [r.id]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !payerId}
            className="w-full sm:w-auto"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Add expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
