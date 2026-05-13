import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const postgresUrl  = process.env.POSTGRES_URL!
const isProduction = process.env.NODE_ENV === 'production';

export const supabase = createClient(supabaseUrl, supabaseKey)

export const sql = postgres(postgresUrl, { ssl: isProduction ? 'require' : false });

