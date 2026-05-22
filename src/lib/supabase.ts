import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  'https://glkuxiseyxvwtduydxkp.supabase.co';

const supabaseAnonKey = 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3V4aXNleXh2d3RkdXlkeGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMzM2MDEsImV4cCI6MjA5MzYwOTYwMX0.3JpJgQoT-02PfwESs6CDGKNGyFXFmcboQ6o5krLcNPo';

// Clean keys from quotes if injected via Netlify
const cleanUrl = supabaseUrl.trim().replace(/^["']|["']$/g, '');
const cleanKey = supabaseAnonKey.trim().replace(/^["']|["']$/g, '');

export const supabase = createClient(cleanUrl, cleanKey);
