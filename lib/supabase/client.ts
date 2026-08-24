import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client: read-only access, writes are enforced server-side via RLS.
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
