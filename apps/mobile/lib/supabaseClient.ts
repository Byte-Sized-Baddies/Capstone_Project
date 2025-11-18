import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.manifest?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.manifest?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase env variables');

export const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);