"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera, Loader2, X } from "lucide-react";
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
import { formatCents } from "@/lib/money";
import type { Balance } from "@/lib/balances";

export function PayNowDialog({
  balance,
  onSettled,
}: {
  balance: Balance;
  onSettled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    setCompressing(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        maxIteration: 3,
        initialQuality: 0.8,
        useWebWorker: false,
        signal: controller.signal,
      });
      setPhoto(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch (error) {
      toast.error(
        controller.signal.aborted
          ? "That photo took too long to process. Try a smaller image."
          : error instanceof Error
            ? error.message
            : "Couldn't process that photo, try a different one"
      );
    } finally {
      window.clearTimeout(timeoutId);
      setCompressing(false);
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("from_roommate_id", balance.fromRoommate.id);
      formData.set("to_roommate_id", balance.toRoommate.id);
      if (photo) formData.set("proof", photo);

      const res = await fetch("/api/settlements", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast.info("That balance was already settled");
          resetForm();
          setOpen(false);
          onSettled();
          return;
        }
        throw new Error(body.error ?? "Failed to record payment");
      }

      toast.success(`${balance.fromRoommate.name} paid ${balance.toRoommate.name}!`);
      resetForm();
      setOpen(false);
      onSettled();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Pay Now
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm payment</DialogTitle>
          <DialogDescription>
            Mark {balance.fromRoommate.name}&apos;s{" "}
            <span className="tabular-nums">{formatCents(balance.amountCents)}</span> to{" "}
            {balance.toRoommate.name} as paid. Adding a screenshot is optional.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Payment proof (optional)</p>
          {photoPreview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a remote asset */}
              <img
                src={photoPreview}
                alt="Selected proof"
                className="h-32 w-32 rounded-lg object-cover ring-1 ring-foreground/10"
              />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute -top-2 -right-2 rounded-full bg-background p-1 ring-1 ring-foreground/10"
                aria-label="Remove photo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={compressing}
              onClick={() => fileInputRef.current?.click()}
            >
              {compressing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {compressing ? "Processing..." : "Add a screenshot"}
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || compressing}
            className="w-full sm:w-auto"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Confirm payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
