import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, Copy, Check, X } from "lucide-react";
import FriendRequestManager from "@/components/FriendRequestManager";

const Friends = () => {
  const navigate = useNavigate();
  const [friendCode, setFriendCode] = useState("");
  const [myFriendCode, setMyFriendCode] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    loadMyProfile();
    loadConnections();

    const channel = supabase
      .channel('friend-connections')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_connections' },
        () => {
          loadConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMyProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("friend_code")
      .eq("id", user.id)
      .single();
    
    if (data) setMyFriendCode(data.friend_code);
  };

  const loadConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;


    const { data: accepted } = await supabase
      .from("friend_connections")
      .select(`
        *,
        requester:profiles!requester_id(username, friend_code),
        addressee:profiles!addressee_id(username, friend_code)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted")
      .limit(1); // Only allow one partner

    setFriends(accepted || []);
  };

  const addFriend = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Check if user already has a partner
      const { data: existingConnection } = await supabase
        .from("friend_connections")
        .select("id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted")
        .maybeSingle();

      if (existingConnection) {
        toast({ 
          title: "You already have a partner", 
          description: "This app is designed for sharing between 2 people only",
          variant: "destructive" 
        });
        return;
      }

      let targetUserId = null;

      if (searchInput.includes("@")) {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", searchInput.replace("@", ""))
          .maybeSingle();
        targetUserId = data?.id;
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("friend_code", searchInput.toUpperCase())
          .maybeSingle();
        targetUserId = data?.id;
      }

      if (!targetUserId) {
        toast({ title: "User not found", variant: "destructive" });
        return;
      }

      // Check if target user already has a partner
      const { data: targetUserConnection } = await supabase
        .from("friend_connections")
        .select("id")
        .or(`requester_id.eq.${targetUserId},addressee_id.eq.${targetUserId}`)
        .eq("status", "accepted")
        .maybeSingle();

      if (targetUserConnection) {
        toast({ 
          title: "Unable to send request", 
          description: "This user is already in a partnership.",
          variant: "destructive" 
        });
        return;
      }

      const { error } = await supabase
        .from("friend_connections")
        .insert({
          requester_id: user.id,
          addressee_id: targetUserId,
        });

      if (error) throw error;

      toast({ title: "Partner request sent!" });
      setSearchInput("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };


  const copyCode = () => {
    navigator.clipboard.writeText(myFriendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] safe-area-inset">
      <header className="flex items-center justify-between mb-6 p-4 sm:p-6 pt-safe">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center hover:bg-white/10 text-foreground">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
        <h1 className="funky-text text-xl sm:text-2xl text-foreground">Partner</h1>
        <div className="w-10 sm:w-12" />
      </header>

      <div className="max-w-md mx-auto space-y-6 px-4 sm:px-6">
        <div className="glass-effect rounded-3xl p-6 border border-white/[0.08] transition-all">
          <h2 className="text-foreground font-semibold mb-3 text-sm">Your Friend Code</h2>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 rounded-2xl px-4 py-3 text-foreground font-mono text-sm border border-white/5">
              {myFriendCode}
            </div>
            <Button onClick={copyCode} variant="ghost" size="icon" className="text-foreground w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center flex-shrink-0">
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <div className="glass-effect rounded-3xl p-6 border border-white/[0.08] transition-all">
          <h2 className="text-foreground font-semibold mb-2 text-sm">Add Your Partner</h2>
          <p className="text-muted-foreground text-xs mb-4 font-mono">
            This app is designed for sharing between 2 people
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="@username or friend code"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-white/5 border-white/5 text-foreground placeholder:text-muted-foreground/50 rounded-2xl h-11 px-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <Button onClick={addFriend} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full w-11 h-11 p-0 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <FriendRequestManager />

        {friends.length > 0 && (
          <div className="glass-effect rounded-3xl p-6 border border-white/[0.08] transition-all">
            <h2 className="text-foreground font-semibold mb-4 text-sm">Your Partner</h2>
            <div className="space-y-2">
              {friends.map((friend) => (
                <div key={friend.id} className="bg-white/5 rounded-2xl p-3 text-foreground border border-white/5">
                  @{friend.requester?.username || friend.addressee?.username || "User"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
