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
