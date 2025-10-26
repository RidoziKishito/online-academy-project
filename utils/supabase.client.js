import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Since you're using Supabase as your main database, we can derive the URL from your connection
const supabaseUrl = process.env.SUPABASE_URL || `https://${process.env.HOST?.replace('.pooler.supabase.com', '')}.supabase.co`;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// For now, we'll use polling instead of real-time replication
// This gives us near real-time updates without requiring Supabase replication
console.log('Using polling-based real-time updates (no Supabase replication required)');

// Client for frontend (uses anon key) - optional for future use
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Admin client for backend (uses service key) - optional for future use
export const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Check if Supabase is configured (optional for polling approach)
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export default supabase;
