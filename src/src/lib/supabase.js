import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || 'https://erstuajvfklxmmvoxijq.supabase.co';
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyc3R1YWp2ZmtseG1tdm94aWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTIxNzQsImV4cCI6MjA4Nzg2ODE3NH0.iyIFm2TlES4cu68wCZkcoxHtLytauiQD943s5eSNeUI';

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const isConnected = () => !!supabase;
