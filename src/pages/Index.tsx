import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Settings, Grid3x3, Sparkles, UserPlus, Image as ImageIcon, Send, User, Bell, Copy, Check, X, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [partner, setPartner] = useState<any>(null);
  const [recentMedia, setRecentMedia] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'requests'>('profile');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myFriendCode, setMyFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadPartner();
    loadCurrentUser();
    loadPendingRequests();

    const channel = supabase
      .channel('friend-requests-home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_connections' },
        () => {
          loadPendingRequests();
          loadPartner();
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, friend_code")
      .eq("id", user.id)
      .single();

    if (profile) {
      setCurrentUser(profile);
      setMyFriendCode(profile.friend_code);
    }
  };

  const loadPendingRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("No user found");
      return;
    }

    console.log("Loading pending requests for user:", user.id);

    const { data: requests, error } = await supabase
      .from("friend_connections")
      .select("*")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    console.log("Pending requests:", requests);
    console.log("Error:", error);

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

      console.log("Requests with profiles:", requestsWithProfiles);
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

    toast({ title: accept ? "Partner added!" : "Request declined" });
    loadPendingRequests();
    loadPartner();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(myFriendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadPartner = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log("Loading partner for user:", user.id);

    // Get partner connection
    const { data: connection, error } = await supabase
      .from("friend_connections")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();

    console.log("Partner connection:", connection);
    console.log("Partner error:", error);

    if (connection) {
      const partnerId = connection.requester_id === user.id 
        ? connection.addressee_id 
        : connection.requester_id;
      
      // Fetch partner profile
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", partnerId)
        .single();

      console.log("Partner profile:", partnerProfile);

      setPartner({ id: partnerId, username: partnerProfile?.username });

      // Load recent media from both
      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .eq("type", "photo")
        .in("user_id", [user.id, partnerId])
        .order("created_at", { ascending: false })
        .limit(6);

      if (posts) {
        const mediaWithUrls = await Promise.all(
          posts.map(async (post) => {
            const { data: urlData } = supabase.storage
              .from("glimpses")
              .getPublicUrl(post.image_path);
            return { ...post, imageUrl: urlData.publicUrl };
          })
        );
        setRecentMedia(mediaWithUrls);
      }
    } else {
      // No partner connection found, clear partner state
      setPartner(null);
      setRecentMedia([]);
    }
  };

  const addPartner = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: existingConnection } = await supabase
        .from("friend_connections")
        .select("id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted")
        .maybeSingle();

      if (existingConnection) {
        toast({ title: "You already have a partner", variant: "destructive" });
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

      await supabase.from("friend_connections").insert({
        requester_id: user.id,
        addressee_id: targetUserId,
      });

      toast({ title: "Partner request sent!" });
      setSearchInput("");
      setShowAddPartner(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex flex-col h-screen safe-area-inset">
        {/* Header */}
        <header className="flex-shrink-0 p-4 sm:p-6 pb-4 pt-safe">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="funky-text text-3xl sm:text-4xl text-foreground mb-1">Glimpse</h1>
              <p className="text-muted-foreground text-xs sm:text-sm font-mono">Share with your partner</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-foreground hover:bg-muted/20"
                onClick={() => {
                  setShowProfileDialog(true);
                  setActiveTab('requests');
                }}
              >
                <Bell className="w-6 h-6" />
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-foreground hover:bg-muted/20"
                onClick={() => {
                  setShowProfileDialog(true);
                  setActiveTab('profile');
                }}
              >
                <UserCircle className="w-6 h-6" />
              </Button>
              <div className="text-right">
                <div className="funky-text text-2xl sm:text-3xl text-foreground font-mono">{formatTime(currentTime)}</div>
                <div className="text-muted-foreground text-xs font-mono">{currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Profile & Requests Dialog */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="glass-effect border-border bg-card max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground font-display">
                {activeTab === 'profile' ? 'Your Profile' : 'Friend Requests'}
              </DialogTitle>
            </DialogHeader>
            
            {/* Tab Headers */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                  activeTab === 'profile'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all relative ${
                  activeTab === 'requests'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <Bell className="w-4 h-4 inline mr-2" />
                Requests
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm text-muted-foreground mb-2">Username</h3>
                  <div className="bg-muted/40 rounded-lg px-4 py-3 text-foreground font-mono">
                    @{currentUser?.username || 'Loading...'}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm text-muted-foreground mb-2">Friend Code</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/40 rounded-lg px-4 py-3 text-foreground font-mono">
                      {myFriendCode || 'Loading...'}
                    </div>
                    <Button onClick={copyCode} variant="ghost" size="icon" className="text-foreground">
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-3">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No pending requests</p>
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between bg-muted/20 rounded-lg p-3">
                      <span className="text-foreground font-medium">@{req.requester?.username || "User"}</span>
                      <div className="flex gap-2">
                        <Button onClick={() => respondToRequest(req.id, true)} size="sm" className="bg-green-500 hover:bg-green-600">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => respondToRequest(req.id, false)} size="sm" variant="destructive">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            {/* Partner Status */}
            <div className="glass-effect p-4 sm:p-6 rounded-3xl animate-slide-down">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary/60" />
                  {partner ? `Connected to @${partner.username}` : 'No Partner Yet'}
                </h2>
                {!partner && (
                  <Dialog open={showAddPartner} onOpenChange={setShowAddPartner}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-effect border-border bg-card">
                      <DialogHeader>
                        <DialogTitle className="text-foreground font-display">Add Your Partner</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="@username or friend code"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          className="bg-muted/50 border-border text-foreground"
                        />
                        <Button onClick={addPartner} className="w-full">Add Partner</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {partner && recentMedia.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {recentMedia.slice(0, 3).map((media) => (
                    <div key={media.id} className="aspect-square rounded-lg overflow-hidden glass-effect cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/media')}>
                      <img src={media.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/media')} className="flex-1 bg-muted/20 border-border hover:bg-muted/40">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  View Media
                </Button>
                <Button size="sm" onClick={() => navigate('/camera')} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Send className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => navigate('/camera')}
                className="h-32 sm:h-36 bg-gradient-to-br from-primary/20 to-primary/5 border border-border hover:border-primary/50 rounded-3xl flex-col gap-3 animate-slide-up backdrop-blur-xl group"
                variant="ghost"
              >
                <Camera className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
                <span className="font-display font-medium text-foreground/80 group-hover:text-foreground">Capture</span>
              </Button>

              <Button
                onClick={() => navigate('/feed')}
                className="h-32 sm:h-36 bg-gradient-to-br from-muted/40 to-muted/10 border border-border hover:border-primary/50 rounded-3xl flex-col gap-3 animate-slide-up backdrop-blur-xl group"
                style={{ animationDelay: '100ms' }}
                variant="ghost"
              >
                <Grid3x3 className="w-8 h-8 text-foreground/80 group-hover:text-foreground transition-colors" />
                <span className="font-display font-medium text-foreground/80 group-hover:text-foreground">Feed</span>
              </Button>
            </div>

            {/* Settings Button */}
            <Button
              onClick={() => navigate('/settings')}
              className="w-full glass-effect p-4 rounded-2xl hover:bg-muted/20 animate-slide-up border-border"
              style={{ animationDelay: '200ms' }}
              variant="ghost"
            >
              <Settings className="w-5 h-5 text-muted-foreground mr-3" />
              <span className="font-display text-foreground">Settings</span>
            </Button>

            {/* Status */}
            <div className="glass-effect p-3 rounded-xl animate-slide-up text-center" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-muted-foreground text-xs font-mono">
                  {partner ? 'Connected' : 'Waiting for connection'}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
