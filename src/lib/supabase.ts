import { createClient } from '@supabase/supabase-js';

// Safe environment variable getters for both Vite/ESM and SSR/Node/Netlify/CJS
const getEnvVar = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta?.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {
    // ignore
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://glkuxiseyxvwtduydxkp.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsa3V4aXNleXh2d3RkdXlkeGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMzM2MDEsImV4cCI6MjA5MzYwOTYwMX0.3JpJgQoT-02PfwESs6CDGKNGyFXFmcboQ6o5krLcNPo';

// Clean keys from quotes if injected via Netlify
const cleanUrl = supabaseUrl.trim().replace(/^["']|["']$/g, '');
const cleanKey = supabaseAnonKey.trim().replace(/^["']|["']$/g, '');

export const supabase = createClient(cleanUrl, cleanKey);
