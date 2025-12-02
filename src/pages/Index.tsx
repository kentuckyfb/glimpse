import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Settings, Grid3x3, Sparkles, UserPlus, Image as ImageIcon, Send, User, Bell, Copy, Check, X, UserCircle, Menu, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useRecentMedia } from "@/hooks/useMedia";
import { usePartner, useInvalidatePartner } from "@/hooks/usePartner";
import { useRecentPost } from "@/hooks/useRecentPost";
import { formatDistanceToNow, differenceInMonths } from "date-fns";
import { UnreadMediaWidget } from "@/components/UnreadMediaWidget";

const Index = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchInput, setSearchInput] = useState("");
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'requests'>('profile');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myFriendCode, setMyFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Use custom hooks for cached data
  const { data: partner } = usePartner();
  const { data: recentMedia = [] } = useRecentMedia(6);
  const { data: recentPost } = useRecentPost();
  const invalidatePartner = useInvalidatePartner();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadCurrentUser();
    loadPendingRequests();

    const channel = supabase
      .channel('friend-requests-home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_connections' },
        () => {
          loadPendingRequests();
          invalidatePartner(); // Invalidate partner cache on friend connection changes
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - invalidatePartner is stable

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
    if (!user) return;

    const { data: requests, error } = await supabase
      .from("friend_connections")
      .select("*")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error loading pending requests:", error);
      return;
    }

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

    toast({ title: accept ? "Partner added!" : "Request declined" });
    loadPendingRequests();
    invalidatePartner(); // Invalidate partner cache
  };

  const copyCode = () => {
    navigator.clipboard.writeText(myFriendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // Check if today is an anniversary (1st of the month, after June 1, 2025)
  const isAnniversary = () => {
    const today = new Date();
    const anniversaryStart = new Date('2025-06-01');
    return today >= anniversaryStart && today.getDate() === 1;
  };

  // Calculate months together since June 1, 2025
  const getMonthsTogether = () => {
    const anniversaryStart = new Date('2025-06-01');
    const today = new Date();
    return differenceInMonths(today, anniversaryStart);
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col h-screen safe-area-inset">
        {/* Header */}
        <header className="flex-shrink-0 p-4 sm:p-6 pb-4 pt-safe">
          <div className="flex items-center justify-between">
            {/* Left side icons */}
            <div className="flex items-center gap-2">
              {/* Mobile menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-white/10 transition-all"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-[#0d1117] backdrop-blur-xl border-r border-white/[0.08] p-0">
                  {/* Menu Header */}
                  <div className="p-6 border-b border-white/10">
                    <h2 className="text-2xl font-display font-bold text-foreground funky-text">Glimpse</h2>
                    <p className="text-xs text-muted-foreground mt-1">@{currentUser?.username || 'user'}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col gap-2 p-4">
                    <Button
                      variant="ghost"
                      className="justify-start gap-3 h-12 rounded-xl hover:bg-white/5 transition-all group"
                      onClick={() => {
                        setShowProfileDialog(true);
                        setActiveTab('profile');
                      }}
                    >
                      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                        <UserCircle className="w-5 h-5 text-foreground/70 group-hover:text-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">Profile</span>
                    </Button>

                    <Button
                      variant="ghost"
                      className="justify-start gap-3 h-12 rounded-xl hover:bg-white/5 transition-all group"
                      onClick={() => {
                        setShowProfileDialog(true);
                        setActiveTab('requests');
                      }}
                    >
                      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all relative">
                        <Bell className="w-5 h-5 text-foreground/70 group-hover:text-foreground" />
                        {pendingRequests.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                            {pendingRequests.length}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">Notifications</span>
                    </Button>

                    <Button
                      variant="ghost"
                      className="justify-start gap-3 h-12 rounded-xl hover:bg-white/5 transition-all group"
                      onClick={() => navigate('/settings')}
                    >
                      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                        <Settings className="w-5 h-5 text-foreground/70 group-hover:text-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">Settings</span>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop icons */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex w-10 h-10 rounded-full items-center justify-center text-foreground hover:bg-white/10 transition-all"
                onClick={() => navigate('/settings')}
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex w-10 h-10 rounded-full items-center justify-center text-foreground hover:bg-white/10 transition-all"
                onClick={() => {
                  setShowProfileDialog(true);
                  setActiveTab('profile');
                }}
              >
                <UserCircle className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex w-10 h-10 rounded-full items-center justify-center relative text-foreground hover:bg-white/10 transition-all"
                onClick={() => {
                  setShowProfileDialog(true);
                  setActiveTab('requests');
                }}
              >
                <Bell className="w-5 h-5" />
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </Button>
            </div>

            {/* Right side - Clock */}
            <div className="text-right">
              <div className="funky-text text-2xl sm:text-3xl text-foreground font-mono">{formatTime(currentTime)}</div>
              <div className="text-muted-foreground text-xs font-mono">{currentTime.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
            </div>
          </div>
        </header>

        {/* Profile & Requests Dialog */}
        <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
          <DialogContent className="glass-effect border border-white/[0.08] bg-[#0d1117]/98 backdrop-blur-xl rounded-3xl w-[90vw] max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-foreground font-display text-center">
                {activeTab === 'profile' ? 'Your Profile' : 'Friend Requests'}
              </DialogTitle>
            </DialogHeader>

            {/* Tab Headers */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2.5 px-4 rounded-full font-medium text-sm transition-all ${
                  activeTab === 'profile'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2.5 px-4 rounded-full font-medium text-sm transition-all relative ${
                  activeTab === 'requests'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                <Bell className="w-4 h-4 inline mr-2" />
                Requests
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm text-muted-foreground mb-2 font-medium">Username</h3>
                  <div className="bg-white/[0.04] rounded-2xl px-4 py-3 text-foreground font-mono text-sm border border-white/[0.08]">
                    @{currentUser?.username || 'Loading...'}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm text-muted-foreground mb-2 font-medium">Friend Code</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/[0.04] rounded-2xl px-4 py-3 text-foreground font-mono text-sm border border-white/[0.08]">
                      {myFriendCode || 'Loading...'}
                    </div>
                    <Button onClick={copyCode} variant="ghost" size="icon" className="text-foreground w-10 h-10 rounded-full hover:bg-white/[0.08] flex items-center justify-center flex-shrink-0">
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
                    <div className="w-16 h-16 rounded-full bg-white/[0.04] mx-auto mb-3 flex items-center justify-center border border-white/[0.08]">
                      <Bell className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="text-sm">No pending requests</p>
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between bg-white/[0.04] rounded-2xl p-3 border border-white/[0.08]">
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
                  ))
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            {/* Anniversary Message */}
            {isAnniversary() && partner && (
              <div className="glass-effect p-5 rounded-3xl border border-blue-500/30 animate-slide-down bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-base text-foreground mb-1">
                      Happy {getMonthsTogether()} {getMonthsTogether() === 1 ? 'month' : 'months'} anniversary &lt;3
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      with @{partner.username}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Unread Media Widget */}
            {partner && <UnreadMediaWidget />}

            {/* Partner Status */}
            <div className="glass-effect p-5 sm:p-6 rounded-3xl animate-slide-down transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
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
                    <DialogContent className="glass-effect border border-white/[0.08] bg-[#0d1117]/98 backdrop-blur-xl rounded-3xl w-[90vw] max-w-md p-6">
                      <DialogHeader>
                        <DialogTitle className="text-foreground font-display text-center text-lg">Add Your Partner</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div>
                          <h3 className="text-sm text-muted-foreground mb-2 font-medium">Enter username or friend code</h3>
                          <Input
                            placeholder="@username or friend code"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="bg-white/[0.04] border-white/[0.08] text-foreground rounded-2xl h-11 px-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <Button onClick={addPartner} className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-11 font-medium transition-all">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Partner
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {partner && recentMedia.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {recentMedia.slice(0, 3).map((media) => (
                    <div key={media.id} className="aspect-square rounded-xl overflow-hidden glass-effect cursor-pointer hover:scale-105 transition-all duration-200 active:scale-95 border border-white/[0.08]" onClick={() => navigate('/media')}>
                      {media.type === 'photo' ? (
                        <img src={media.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center p-2"
                          style={{ backgroundColor: media.note_color || "#1a1a2e" }}
                        >
                          <p className="text-white text-[10px] line-clamp-3 text-center font-medium">
                            {media.note_text}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate('/media')} className="flex-1 bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-foreground rounded-full h-10 font-medium">
                  <ImageIcon className="w-4 h-4 mr-1.5" />
                  View Media
                </Button>
                <Button size="sm" onClick={() => navigate('/camera')} className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-full h-10 font-medium">
                  <Send className="w-4 h-4 mr-1.5" />
                  Share
                </Button>
              </div>
            </div>

            {/* Recent Post/Note */}
            {partner && recentPost && (
              <div className="glass-effect p-5 sm:p-6 rounded-3xl animate-slide-up transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    Latest Shared
                  </h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatDistanceToNow(new Date(recentPost.created_at), { addSuffix: true })}
                  </span>
                </div>

                {recentPost.type === 'note' && recentPost.note_text ? (
                  <div
                    className="rounded-2xl p-4 mb-2"
                    style={{ backgroundColor: recentPost.note_color || '#1a1a2e' }}
                  >
                    <p className="text-white text-sm line-clamp-3">{recentPost.note_text}</p>
                  </div>
                ) : recentPost.type === 'photo' && recentPost.image_path ? (
                  <div className="rounded-2xl overflow-hidden mb-2">
                    <img
                      src={supabase.storage.from('glimpses').getPublicUrl(recentPost.image_path).data.publicUrl}
                      alt={recentPost.caption || ''}
                      className="w-full h-40 object-cover"
                    />
                    {recentPost.caption && (
                      <p className="text-foreground text-sm mt-2 px-1">{recentPost.caption}</p>
                    )}
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>from {recentPost.username}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate('/feed')}
                    className="h-7 text-xs"
                  >
                    View All
                  </Button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => navigate('/camera')}
                className="h-32 sm:h-36 bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-white/[0.08] hover:border-blue-500/50 rounded-3xl flex-col gap-3 animate-slide-up backdrop-blur-xl group transition-all duration-300 hover:scale-105 active:scale-95"
                variant="ghost"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                  <Camera className="w-7 h-7 text-blue-400 group-hover:text-blue-300 transition-colors" />
                </div>
                <span className="font-display font-semibold text-foreground">Capture</span>
              </Button>

              <Button
                onClick={() => navigate('/feed')}
                className="h-32 sm:h-36 bg-gradient-to-br from-purple-500/15 to-purple-600/5 border border-white/[0.08] hover:border-purple-500/50 rounded-3xl flex-col gap-3 animate-slide-up backdrop-blur-xl group transition-all duration-300 hover:scale-105 active:scale-95"
                style={{ animationDelay: '100ms' }}
                variant="ghost"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
                  <Grid3x3 className="w-7 h-7 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
                <span className="font-display font-semibold text-foreground">Feed</span>
              </Button>
            </div>

            {/* Status */}
            <div className="glass-effect p-3 rounded-xl animate-slide-up text-center" style={{ animationDelay: '200ms' }}>
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
