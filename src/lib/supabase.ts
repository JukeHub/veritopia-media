
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = 'https://ncbfzjrqmndadbvigdeu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jYmZ6anJxbW5kYWRidmlnZGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNDA5NDUsImV4cCI6MjA1NTkxNjk0NX0.7Rrm1r6QQWq_cK50C8A60M_uCZGlTZlJro3DpsOMnn8';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};
