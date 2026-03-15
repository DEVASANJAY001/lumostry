export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      follow_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string | null
          sender_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id?: string | null
          sender_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string | null
          sender_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string | null
          follower_id: string | null
          following_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string | null
          following_id?: string | null
          id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          points_required: number
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          points_required?: number
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          points_required?: number
          user_id?: string
        }
        Relationships: []
      }
      highlight_items: {
        Row: {
          created_at: string | null
          highlight_id: string
          id: string
          story_id: string
        }
        Insert: {
          created_at?: string | null
          highlight_id: string
          id?: string
          story_id: string
        }
        Update: {
          created_at?: string | null
          highlight_id?: string
          id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_items_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "highlights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_items_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          cover_url: string | null
          created_at: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          is_super: boolean | null
          liked_id: string
          liker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_super?: boolean | null
          liked_id: string
          liker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_super?: boolean | null
          liked_id?: string
          liker_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string
          receiver_id: string
          sender_id: string
          shared_post_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          receiver_id: string
          sender_id: string
          shared_post_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          receiver_id?: string
          sender_id?: string
          shared_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_shared_post"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      note_likes: {
        Row: {
          created_at: string | null
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_likes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          related_user_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_user_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_user_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_unlocks: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          points_spent: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          points_spent?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          points_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_unlocks_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "gallery_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      point_packages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          offer_label: string | null
          points: number
          price_inr: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          offer_label?: string | null
          points: number
          price_inr: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          offer_label?: string | null
          points?: number
          price_inr?: number
          sort_order?: number
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          created_at: string | null
          hashtags: string[] | null
          id: string
          media_type: string
          media_url: string
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          media_type?: string
          media_url: string
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profile_boosts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          points_spent: number
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          points_spent?: number
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          points_spent?: number
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_visitors: {
        Row: {
          id: string
          profile_user_id: string
          visited_at: string
          visitor_user_id: string
        }
        Insert: {
          id?: string
          profile_user_id: string
          visited_at?: string
          visitor_user_id: string
        }
        Update: {
          id?: string
          profile_user_id?: string
          visited_at?: string
          visitor_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          interests: string[] | null
          is_online: boolean | null
          is_private: boolean | null
          is_verified: boolean | null
          last_seen: string | null
          name: string
          photos: string[] | null
          preference: Database["public"]["Enums"]["preference_type"] | null
          profile_complete: boolean | null
          show_online_status: boolean | null
          updated_at: string
          user_id: string
          username: string | null
          verification_photo_url: string | null
          verified_until: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          interests?: string[] | null
          is_online?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          last_seen?: string | null
          name?: string
          photos?: string[] | null
          preference?: Database["public"]["Enums"]["preference_type"] | null
          profile_complete?: boolean | null
          show_online_status?: boolean | null
          updated_at?: string
          user_id: string
          username?: string | null
          verification_photo_url?: string | null
          verified_until?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          interests?: string[] | null
          is_online?: boolean | null
          is_private?: boolean | null
          is_verified?: boolean | null
          last_seen?: string | null
          name?: string
          photos?: string[] | null
          preference?: Database["public"]["Enums"]["preference_type"] | null
          profile_complete?: boolean | null
          show_online_status?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verification_photo_url?: string | null
          verified_until?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_url: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string
          user_id?: string
        }
        Relationships: []
      }
      story_mentions: {
        Row: {
          created_at: string | null
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_mentions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string | null
          viewed_at: string | null
          viewer_id: string | null
        }
        Insert: {
          id?: string
          story_id?: string | null
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Update: {
          id?: string
          story_id?: string | null
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          last_daily_bonus_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          last_daily_bonus_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          last_daily_bonus_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watched_stories: {
        Row: {
          id: string
          story_id: string | null
          viewed_at: string | null
          viewer_id: string | null
        }
        Insert: {
          id?: string
          story_id?: string | null
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Update: {
          id?: string
          story_id?: string | null
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watched_stories_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      gender_type: "male" | "female" | "non_binary" | "prefer_not_to_say"
      preference_type: "male" | "female" | "everyone"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      gender_type: ["male", "female", "non_binary", "prefer_not_to_say"],
      preference_type: ["male", "female", "everyone"],
    },
  },
} as const
