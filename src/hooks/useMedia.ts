import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MediaItem {
  id: string;
  imageUrl: string;
  caption: string | null;
  created_at: string;
  username: string;
  isCurrentUser: boolean;
  type: string;
  note_text?: string | null;
  note_color?: string | null;
  note_text_color?: string | null;
}

interface PartnerConnection {
  requester_id: string;
  addressee_id: string;
}

/**
 * Fetches the current user's partner connection
 */
const fetchPartnerConnection = async (userId: string): Promise<PartnerConnection | null> => {
  const { data, error } = await supabase
    .from("friend_connections")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Fetches partner profile information
 */
const fetchPartnerProfile = async (partnerId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", partnerId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Fetches all media posts (photos and notes) from user and partner
 */
const fetchMediaPosts = async (userId: string, partnerId: string, limit?: number) => {
  let query = supabase
    .from("posts")
    .select("*")
    .in("type", ["photo", "note"])
    .or(`user_id.eq.${userId},user_id.eq.${partnerId}`)
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Processes media posts and adds public URLs
 */
const processMediaPosts = async (
  posts: any[],
  userId: string,
  partnerUsername: string
): Promise<MediaItem[]> => {
  const mediaWithUrls = await Promise.all(
    posts.map(async (post) => {
      try {
        // Determine username based on user_id
        const isCurrentUser = post.user_id === userId;
        const username = isCurrentUser ? 'You' : partnerUsername;

        // Handle photos
        if (post.type === 'photo') {
          // Skip posts without image_path
          if (!post.image_path) return null;

          // Get public URL for the image
          const { data: { publicUrl } } = supabase.storage
            .from('glimpses')
            .getPublicUrl(post.image_path);

          return {
            id: post.id,
            imageUrl: publicUrl,
            caption: post.caption,
            created_at: post.created_at,
            username,
            isCurrentUser,
            type: post.type
          };
        }

        // Handle notes
        if (post.type === 'note') {
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
            id: post.id,
            imageUrl: '', // Empty for notes
            caption: post.caption,
            created_at: post.created_at,
            username,
            isCurrentUser,
            type: post.type,
            note_text: post.note_text,
            note_color: bgColor,
            note_text_color: textColor
          };
        }

        return null;
      } catch (error) {
        console.error('Error processing media:', error);
        return null;
      }
    })
  );

  // Filter out null values
  return mediaWithUrls.filter((item): item is MediaItem => item !== null);
};

/**
 * Custom hook to fetch all shared media with caching
 * Implements proper caching, error handling, and loading states
 */
export const useMedia = () => {
  return useQuery({
    queryKey: ["media"],
    queryFn: async (): Promise<MediaItem[]> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get partner connection
      const connection = await fetchPartnerConnection(user.id);
      if (!connection) return [];

      // Determine partner ID
      const partnerId = connection.requester_id === user.id
        ? connection.addressee_id
        : connection.requester_id;

      // Fetch partner profile and posts in parallel
      const [partnerProfile, posts] = await Promise.all([
        fetchPartnerProfile(partnerId),
        fetchMediaPosts(user.id, partnerId)
      ]);

      // Process and return media items
      return processMediaPosts(posts, user.id, partnerProfile.username || 'Unknown');
    },
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests 2 times
    refetchOnWindowFocus: true, // Refetch when user returns to window
  });
};

/**
 * Custom hook to fetch recent media (limited) with caching
 * Used for homepage thumbnails
 */
export const useRecentMedia = (limit: number = 6) => {
  return useQuery({
    queryKey: ["media", "recent", limit],
    queryFn: async (): Promise<MediaItem[]> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get partner connection
      const connection = await fetchPartnerConnection(user.id);
      if (!connection) return [];

      // Determine partner ID
      const partnerId = connection.requester_id === user.id
        ? connection.addressee_id
        : connection.requester_id;

      // Fetch partner profile and posts in parallel
      const [partnerProfile, posts] = await Promise.all([
        fetchPartnerProfile(partnerId),
        fetchMediaPosts(user.id, partnerId, limit)
      ]);

      // Process and return media items
      return processMediaPosts(posts, user.id, partnerProfile.username || 'Unknown');
    },
    staleTime: 1000 * 60 * 2, // Cache data for 2 minutes (shorter for recent media)
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    retry: 2,
    refetchOnWindowFocus: true,
  });
};

/**
 * Custom hook to invalidate media cache
 * Call this after uploading new media
 * Returns a stable callback function using useCallback
 */
export const useInvalidateMedia = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["media"] });
  }, [queryClient]);
};
