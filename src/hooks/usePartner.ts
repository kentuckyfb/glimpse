import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Partner {
  id: string;
  username: string | null;
}

/**
 * Fetches partner connection and profile information
 */
const fetchPartner = async (userId: string): Promise<Partner | null> => {
  // Get partner connection
  const { data: connection, error: connectionError } = await supabase
    .from("friend_connections")
    .select("requester_id, addressee_id")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (connectionError) throw connectionError;
  if (!connection) return null;

  // Determine partner ID
  const partnerId = connection.requester_id === userId
    ? connection.addressee_id
    : connection.requester_id;

  // Fetch partner profile
  const { data: partnerProfile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", partnerId)
    .single();

  if (profileError) throw profileError;

  return {
    id: partnerId,
    username: partnerProfile?.username || null
  };
};

/**
 * Custom hook to fetch partner information with caching
 */
export const usePartner = () => {
  return useQuery({
    queryKey: ["partner"],
    queryFn: async (): Promise<Partner | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      return fetchPartner(user.id);
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes (partner doesn't change often)
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: 2,
    refetchOnWindowFocus: false, // Don't refetch on window focus for partner data
  });
};

/**
 * Hook to invalidate partner cache (e.g., after accepting friend request)
 * Returns a stable callback function using useCallback
 */
export const useInvalidatePartner = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["partner"] });
  }, [queryClient]);
};
