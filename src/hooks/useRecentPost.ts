import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentPost {
  id: string;
  type: string;
  note_text: string | null;
  note_color: string | null;
  caption: string | null;
  image_path: string | null;
  created_at: string;
  user_id: string;
  isCurrentUser: boolean;
  username: string;
}

/**
 * Fetches the most recent post (note or photo) from user and partner
 */
export const useRecentPost = () => {
  return useQuery({
    queryKey: ["recent-post"],
    queryFn: async (): Promise<RecentPost | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get partner connection
      const { data: connection } = await supabase
        .from("friend_connections")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted")
        .maybeSingle();

      if (!connection) return null;

      const partnerId = connection.requester_id === user.id
        ? connection.addressee_id
        : connection.requester_id;

      // Fetch partner profile
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerId)
        .single();

      // Fetch most recent post
      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!posts || posts.length === 0) return null;

      const post = posts[0];
      const isCurrentUser = post.user_id === user.id;

      return {
        id: post.id,
        type: post.type,
        note_text: post.note_text,
        note_color: post.note_color,
        caption: post.caption,
        image_path: post.image_path,
        created_at: post.created_at,
        user_id: post.user_id,
        isCurrentUser,
        username: isCurrentUser ? 'You' : (partnerProfile?.username || 'Partner'),
      };
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests 2 times
    refetchOnWindowFocus: true, // Refetch when user returns to window
  });
};
