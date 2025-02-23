
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
        }
      }
      articles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          url: string
          content: string | null
          image_url: string | null
          verified: boolean
          user_id: string
          source_id: string | null
          published_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          url: string
          content?: string | null
          image_url?: string | null
          verified?: boolean
          user_id: string
          source_id?: string | null
          published_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          url?: string
          content?: string | null
          image_url?: string | null
          verified?: boolean
          user_id?: string
          source_id?: string | null
          published_at?: string | null
        }
      }
      sources: {
        Row: {
          id: string
          created_at: string
          name: string
          url: string
          rss_url: string
          description: string | null
          logo_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          url: string
          rss_url: string
          description?: string | null
          logo_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          url?: string
          rss_url?: string
          description?: string | null
          logo_url?: string | null
        }
      }
      user_sources: {
        Row: {
          id: string
          created_at: string
          user_id: string
          source_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          source_id: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          source_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
