import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UnreadMediaItem {
  id: string;
  type: 'photo' | 'note';
  image_path?: string;
  imageUrl?: string;
  note_text?: string;
  note_color?: string;
  note_text_color?: string;
  caption?: string;
  created_at: string;
  sender_username: string;
}

/**
 * Helper to get viewed media IDs from localStorage
 */
const getViewedMediaIds = (userId: string): Set<string> => {
  try {
    const stored = localStorage.getItem(`viewed_media_${userId}`);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Helper to mark media as viewed in localStorage
 */
const markMediaAsViewed = (userId: string, mediaIds: string[]) => {
  try {
    const viewed = getViewedMediaIds(userId);
    mediaIds.forEach(id => viewed.add(id));
    localStorage.setItem(`viewed_media_${userId}`, JSON.stringify(Array.from(viewed)));
  } catch (error) {
    console.error('Error saving viewed media:', error);
  }
};

/**
 * Hook to fetch unread media from partner
 * Returns only media that the current user hasn't opened yet
 */
export const useUnreadMedia = () => {
  return useQuery({
    queryKey: ["unread-media"],
    queryFn: async (): Promise<UnreadMediaItem[]> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get partner connection
      const { data: connection } = await supabase
        .from("friend_connections")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();

      if (!connection) return [];

      // Determine partner ID
      const partnerId = connection.requester_id === user.id
        ? connection.addressee_id
        : connection.requester_id;

      // Get partner's profile
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerId)
        .single();

      // Fetch posts from partner from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", partnerId)
        .in("type", ["photo", "note"])
        .gte("created_at", oneDayAgo)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Get viewed media IDs for this user
      const viewedIds = getViewedMediaIds(user.id);

      // Filter out already viewed posts
      const unviewedPosts = posts.filter(post => !viewedIds.has(post.id));

      // Process unviewed posts
      const unreadItems: UnreadMediaItem[] = await Promise.all(
        unviewedPosts.map(async (post) => {
          const baseItem = {
            id: post.id,
            type: post.type as 'photo' | 'note',
            caption: post.caption,
            created_at: post.created_at,
            sender_username: partnerProfile?.username || 'Partner',
          };

          if (post.type === 'photo' && post.image_path) {
            const { data: { publicUrl } } = supabase.storage
              .from('glimpses')
              .getPublicUrl(post.image_path);

            return {
              ...baseItem,
              image_path: post.image_path,
              imageUrl: publicUrl,
            };
          } else if (post.type === 'note') {
            // Parse color data from caption (can be JSON or plain color string for backward compatibility)
            let bgColor = '#ffffff';
            let textColor = '#000000';

            try {
              const colorData = JSON.parse(post.caption || '{}');
              bgColor = colorData.bg || '#ffffff';
              textColor = colorData.text || '#000000';
            } catch {
              // Fallback for old format where caption was just a color string
              bgColor = post.caption || '#ffffff';
              textColor = '#000000';
            }

            return {
              ...baseItem,
              note_text: post.note_text,
              note_color: bgColor,
              note_text_color: textColor,
            };
          }

          return null;
        })
      );

      return unreadItems.filter((item): item is UnreadMediaItem => item !== null);
    },
    staleTime: 1000 * 30, // Cache for 30 seconds
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    retry: 2, // Retry failed requests 2 times
    refetchInterval: 1000 * 60, // Refetch every minute to check for new media
    refetchOnWindowFocus: true, // Refetch when user returns to check for new media
  });
};

/**
 * Hook to mark media as read
 */
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return async (mediaIds: string[]) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark media as viewed in localStorage
    markMediaAsViewed(user.id, mediaIds);

    // Invalidate the unread media query to refresh
    queryClient.invalidateQueries({ queryKey: ["unread-media"] });
  };
};
