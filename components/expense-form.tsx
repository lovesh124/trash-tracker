"use client";

import { useState } from "react";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { parseDollarsToCents } from "@/lib/money";
import type { Roommate } from "@/lib/supabase/types";

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
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setPayerId("");
    setDescription("");
    setAmounts({});
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

    const splits = roommates
      .filter((r) => r.id !== payerId)
      .map((r) => ({ roommate_id: r.id, amount: amounts[r.id] ?? "" }))
      .filter((s) => parseDollarsToCents(s.amount) !== null);

    if (splits.length === 0) {
      toast.error("Assign an amount to at least one roommate");
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
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        <Receipt className="size-4" />
        Add an expense
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an expense</DialogTitle>
          <DialogDescription>
            Pick who paid, then enter how much each roommate owes them.
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
