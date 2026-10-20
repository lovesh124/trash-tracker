"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ChoreLogWithRoommate } from "@/lib/supabase/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function LogHistoryItem({ log }: { log: ChoreLogWithRoommate }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <li className="flex items-center gap-3 rounded-xl bg-[linear-gradient(180deg,var(--card),color-mix(in_oklch,var(--card),var(--muted)_50%))] p-4 shadow-[0_8px_24px_-20px_oklch(0.3_0.06_145)] ring-1 ring-foreground/10 transition-all hover:brightness-97">
        {log.photo_url ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="View proof photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static local asset */}
            <img
              src={log.photo_url}
              alt={`Proof from ${log.roommate.name}`}
              className="size-14 rounded-lg object-cover ring-1 ring-foreground/10"
            />
          </button>
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ImageIcon className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{log.roommate.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(log.taken_at)}
          </p>
        </div>
      </li>

      {log.photo_url && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg" showCloseButton>
            <DialogTitle className="pr-8">{log.roommate.name}&apos;s proof photo</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static local asset */}
            <img
              src={log.photo_url}
              alt={`Proof from ${log.roommate.name}`}
              className="max-h-[75dvh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
