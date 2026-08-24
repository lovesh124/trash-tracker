import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-only client using the service role key — bypasses RLS, never import this in client components.
export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export const PHOTO_BUCKET = "trash-proof-photos";
