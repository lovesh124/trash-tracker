"use client";

import { useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { UndoType } from "@/lib/supabase/types";

/** Deletes one log/expense/payment after asking for the house 4-digit undo code. */
export function UndoButton({
  type,
  id,
  summary,
  onUndone,
}: {
  type: UndoType;
  id: string;
  /** What's being removed, e.g. "Priya's trash log from Oct 3". */
  summary: string;
  onUndone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleUndo(code: string) {
    if (submitting) return;
    if (!/^\d{4}$/.test(code)) {
      toast.error("Enter the 4-digit code");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, pin: code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't undo that");

      toast.success("Undone");
      setOpen(false);
      setPin("");
      onUndone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPin("");
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Undo"
        className="shrink-0 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Undo2 className="size-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Undo this?</DialogTitle>
          <DialogDescription>
            {summary} will be permanently removed. Enter the house undo code to confirm.
          </DialogDescription>
        </DialogHeader>

        <Input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          // "one-time-code" (rather than "off", which browsers ignore on password
          // fields) keeps phones from offering saved passwords or a "Save password?" prompt.
          autoComplete="one-time-code"
          data-1p-ignore
          data-lpignore="true"
          maxLength={4}
          placeholder="••••"
          aria-label="4-digit undo code"
          value={pin}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 4);
            setPin(next);
            // The iPhone number pad has no Enter key, and the keyboard can cover
            // the Undo button, so submit as soon as the 4th digit is typed.
            if (next.length === 4) void handleUndo(next);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleUndo(pin);
          }}
          // pl balances the trailing letter-spacing so the digits sit centred.
          className="h-12 pl-[0.5em] text-center text-2xl tracking-[0.5em]"
        />

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => void handleUndo(pin)}
            disabled={submitting || pin.length !== 4}
            className="w-full sm:w-auto"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Undo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
