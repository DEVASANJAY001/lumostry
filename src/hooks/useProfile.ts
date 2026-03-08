import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  username: string | null;
  age: number | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "non_binary" | "prefer_not_to_say" | null;
  preference: "male" | "female" | "everyone" | null;
  bio: string | null;
  avatar_url: string | null;
  photos: string[] | null;
  interests: string[] | null;
  is_online: boolean | null;
  is_verified: boolean | null;
  verification_photo_url: string | null;
  last_seen: string | null;
  profile_complete: boolean | null;
  created_at: string;
  updated_at: string;
};

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
