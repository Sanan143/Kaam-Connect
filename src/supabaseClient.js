import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://vciutbyykldojgsyomye.supabase.co"
const supabaseKey = "sb_publishable_Kxli9f6aL6x7xFPCqK2Ipg_ELEHidCy"

export const supabase = createClient(supabaseUrl, supabaseKey)