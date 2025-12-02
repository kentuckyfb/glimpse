import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const FriendRequestManager = () => {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadPendingRequests();

    const channel = supabase
      .channel('friend-requests-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_connections' },
        (payload) => {
          loadPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPendingRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: requests } = await supabase
      .from("friend_connections")
      .select("*")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (requests && requests.length > 0) {
      // Fetch requester profiles
      const requesterIds = requests.map(req => req.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", requesterIds);

      // Merge profile data with requests
      const requestsWithProfiles = requests.map(req => ({
        ...req,
        requester: profiles?.find(p => p.id === req.requester_id)
      }));

      setPendingRequests(requestsWithProfiles);
    } else {
      setPendingRequests([]);
    }
  };

  const respondToRequest = async (connectionId: string, accept: boolean) => {
    const { error } = await supabase
      .from("friend_connections")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", connectionId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Invalidate partner cache when accepting a request
    if (accept) {
      queryClient.invalidateQueries({ queryKey: ["partner"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["unread-media"] });
      queryClient.invalidateQueries({ queryKey: ["recent-post"] });
    }

    toast({ title: accept ? "Partner added!" : "Request declined" });
    loadPendingRequests();
  };

  if (pendingRequests.length === 0) return null;

  return (
    <div className="glass-effect rounded-3xl p-6 border border-white/5">
      <h2 className="text-foreground font-semibold mb-4 text-sm">Pending Partner Request</h2>
      <div className="space-y-3">
        {pendingRequests.map((req) => (
          <div key={req.id} className="flex items-center justify-between bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-foreground font-medium text-sm">@{req.requester?.username || "User"}</span>
            <div className="flex gap-2">
              <Button onClick={() => respondToRequest(req.id, true)} size="sm" className="bg-green-500 hover:bg-green-600 text-white rounded-full h-9 px-3">
                <Check className="w-4 h-4" />
              </Button>
              <Button onClick={() => respondToRequest(req.id, false)} size="sm" variant="destructive" className="rounded-full h-9 px-3">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendRequestManager;
