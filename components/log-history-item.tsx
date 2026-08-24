"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { TrashLogWithRoommate } from "@/lib/supabase/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function LogHistoryItem({ log }: { log: TrashLogWithRoommate }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <li className="flex items-center gap-3 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
        {log.photo_url ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0"
            aria-label="View proof photo"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static local asset */}
            <img
              src={log.photo_url}
              alt={`Proof from ${log.roommate.name}`}
              className="size-12 rounded-md object-cover ring-1 ring-foreground/10"
            />
          </button>
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <span className="text-xs">No photo</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{log.roommate.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(log.taken_at)}
          </p>
        </div>
      </li>

      {log.photo_url && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg" showCloseButton>
            <DialogTitle>{log.roommate.name}&apos;s proof photo</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase Storage URL, not a static local asset */}
            <img
              src={log.photo_url}
              alt={`Proof from ${log.roommate.name}`}
              className="w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
