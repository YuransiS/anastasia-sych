import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mfyrftpdhprjyouyjecd.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Anon client for public interactions (respects RLS)
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Admin service role client for backend APIs (bypasses RLS securely)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  supabaseServiceKey ? { auth: { persistSession: false, autoRefreshToken: false } } : undefined
);
