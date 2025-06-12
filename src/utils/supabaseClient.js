
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppkjkggvhodueokfczay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwa2prZ2d2aG9kdWVva2ZjemF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5ODY0NTMsImV4cCI6MjA2MzU2MjQ1M30.ioexifOOaQ3mhR0QFEfcAtSOrNGWHglBbuVPrc7v_YE'
const supabase = createClient(supabaseUrl, supabaseKey)

export { supabase };