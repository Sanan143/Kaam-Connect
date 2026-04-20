import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vciutbyykldojgsyomye.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Kxli9f6aL6x7xFPCqK2Ipg_ELEHidCy';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
