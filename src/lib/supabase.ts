import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = rawUrl
  ? String(rawUrl).trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
  : undefined;
const supabaseAnonKey = rawKey ? String(rawKey).trim() : undefined;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!client && supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
    try {
      client = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.warn('[Supabase Client] Falha ao instanciar cliente Supabase:', e);
      client = null;
    }
  }
  return client;
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);
