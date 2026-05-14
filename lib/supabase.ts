import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const postgresUrl  = process.env.POSTGRES_URL!
const isProduction = process.env.NODE_ENV === 'production';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export const sql = postgres(postgresUrl, { ssl: isProduction ? 'require' : false });

// Client server — bypassa RLS, solo in Server Actions / API routes
// NON esportarlo in componenti client (la service key non deve finire nel browser)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})


