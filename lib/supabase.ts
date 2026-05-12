import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase URL / Anon Key belum diisi. Buat file .env berdasarkan .env.example",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
