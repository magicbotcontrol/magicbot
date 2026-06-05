import { createClient } from '@supabase/supabase-js';
import { DEFAULT_WORKSPACE_SLUG } from '../../constants/defaultWorkspace';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function getWorkspaceSlug() {
  return import.meta.env.VITE_SUPABASE_WORKSPACE_SLUG || DEFAULT_WORKSPACE_SLUG;
}
