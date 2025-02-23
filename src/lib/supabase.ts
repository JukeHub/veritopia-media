
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = 'https://ncbfzjrqmndadbvigdeu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jYmZ6anJxbW5kYWRidmlnZGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk0OTg3NzYsImV4cCI6MjAyNTA3NDc3Nn0.QtNxqL-z5CVRb6XpENKBPwJrfrs1sNC9HsrsOWozf9k';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
};
