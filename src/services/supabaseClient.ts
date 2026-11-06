import { createClient } from '@supabase/supabase-js';
import { mockSupabase, MockSupabaseClient } from './mockSupabase';
import { Database } from '../types/database.types';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseUrl = rawSupabaseUrl
  ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const isTestMode = import.meta.env.MODE === 'test' || import.meta.env.VITE_USE_MOCK_DB === 'true';

export const isMockDb = isTestMode || !supabaseUrl || !supabaseAnonKey;

export const supabase: MockSupabaseClient = isMockDb
  ? mockSupabase
  : (createClient<Database>(supabaseUrl!, supabaseAnonKey!) as unknown as MockSupabaseClient);

export default supabase;
