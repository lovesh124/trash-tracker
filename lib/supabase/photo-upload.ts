import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class PhotoValidationError extends Error {}

/** Validates and uploads a proof photo to Supabase Storage, returning its public URL. */
export async function uploadProofPhoto(
  bucket: string,
  pathPrefix: string,
  photo: File
): Promise<string> {
  if (!ALLOWED_PHOTO_TYPES.has(photo.type)) {
    throw new PhotoValidationError("Photo must be a JPEG, PNG, or WEBP image");
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    throw new PhotoValidationError("Photo must be under 5MB");
  }

  const extension = photo.type.split("/")[1];
  const path = `${pathPrefix}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabaseServer.storage
    .from(bucket)
    .upload(path, await photo.arrayBuffer(), {
      contentType: photo.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabaseServer.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort removal of a proof photo by its public URL. Failures are logged, never thrown. */
export async function deleteProofPhoto(bucket: string, publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(publicUrl.slice(index + marker.length));
  const { error } = await supabaseServer.storage.from(bucket).remove([path]);
  if (error) console.error("Failed to delete proof photo:", error.message);
}
