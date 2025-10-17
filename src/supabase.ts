import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE!;

export const supa = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false }
});

