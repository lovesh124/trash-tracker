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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Roommate } from "@/lib/supabase/types";

export function LogChoreForm({
  roommates,
  onLogged,
  apiPath,
  triggerLabel,
  dialogTitle,
  dialogDescription,
  roommateQuestion,
  successMessage,
}: {
  roommates: Roommate[];
  onLogged: () => void;
  apiPath: string;
  triggerLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  roommateQuestion: string;
  successMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [roommateId, setRoommateId] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setRoommateId("");
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
    if (!roommateId) {
      toast.error("Pick who's logging this");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("roommate_id", roommateId);
      if (photo) formData.set("photo", photo);

      const res = await fetch(apiPath, { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to submit log");
      }

      toast.success(successMessage);
      resetForm();
      setOpen(false);
      onLogged();
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
      <Button
        size="lg"
        className="w-full shadow-[0_12px_28px_-18px_oklch(0.25_0.08_145)] transition-transform hover:-translate-y-0.5"
        onClick={() => setOpen(true)}
      >
        <Camera className="size-4" />
        {triggerLabel}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="roommate">{roommateQuestion}</Label>
            <Select
              items={roommates.map((r) => ({ value: r.id, label: r.name }))}
              value={roommateId}
              onValueChange={(value) => setRoommateId(value ?? "")}
            >
              <SelectTrigger id="roommate" className="w-full">
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
            <Label htmlFor="photo">Proof photo (optional)</Label>
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
                {compressing ? "Processing..." : "Add a photo"}
              </Button>
            )}
            <input
              ref={fileInputRef}
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || compressing || !roommateId}
            className="w-full sm:w-auto"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Submit log
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
