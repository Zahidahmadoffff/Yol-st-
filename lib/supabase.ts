import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://hwbylvuwmtvnesvqytae.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3YnlsdnV3bXR2bmVzdnF5dGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDE1OTEsImV4cCI6MjA5NTExNzU5MX0.r5trG_N6y06Ro_VbnywsDbLallCvT-PVTzq2fZWXkL8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)