import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, Camera, FileText, X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, isSameDay, addDays, subDays } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePartner } from "@/hooks/usePartner";

interface DayActivity {
  date: string;
  hasShared: boolean;
  metIRL: boolean;
  posts: any[];
}

const Feed = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDayView, setShowDayView] = useState(false);
  const [showIRLDialog, setShowIRLDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: partner } = usePartner();

  // Fetch all activities grouped by date
  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ["feed-activities"],
    queryFn: async (): Promise<DayActivity[]> => {
      console.log('=== FEED QUERY STARTING ===');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('Feed: No user found');
        throw new Error("Not authenticated");
      }

      console.log('Feed: User ID:', user.id);

      // Get partner connection
      const { data: connection } = await supabase
        .from("friend_connections")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted")
        .maybeSingle();

      console.log('Feed: Partner connection:', connection);

      let posts;
      let postsError;

      if (!connection) {
        console.log('Feed: No partner connection found - fetching only user posts');
        // No partner, just fetch user's own posts
        const result = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        posts = result.data;
        postsError = result.error;
      } else {
        const partnerId = connection.requester_id === user.id
          ? connection.addressee_id
          : connection.requester_id;

        console.log('Feed: Partner ID:', partnerId);

        // Fetch all posts from both user and partner
        const result = await supabase
          .from("posts")
          .select("*")
          .or(`user_id.eq.${user.id},user_id.eq.${partnerId}`)
          .order("created_at", { ascending: false });
        posts = result.data;
        postsError = result.error;
      }

      console.log('Feed: Posts query result:', posts, 'Error:', postsError);
      console.log('Feed: Total posts found:', posts?.length || 0);

      if (!posts) return [];

      // Group posts by date
      const grouped: { [key: string]: DayActivity } = {};

      for (const post of posts) {
        const dateKey = format(new Date(post.created_at), "yyyy-MM-dd");

        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            date: dateKey,
            hasShared: false,
            metIRL: post.met_irl === true || false,
            posts: []
          };
        }

        grouped[dateKey].hasShared = true;
        grouped[dateKey].posts.push(post);
        if (post.met_irl === true) {
          grouped[dateKey].metIRL = true;
        }
      }

      const result = Object.values(grouped);
      console.log('Calendar activities loaded:', result.length, 'days with activity');
      console.log('Activities:', result.map(a => ({ date: a.date, hasShared: a.hasShared, metIRL: a.metIRL, posts: a.posts.length })));
      return result;
    },
    staleTime: 0, // Disable cache temporarily for debugging
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get activities for selected date
  const selectedDayActivity = activities.find(
    (activity) => isSameDay(new Date(activity.date), selectedDate)
  );

  // Check if date is an anniversary (1st of every month starting from June 1, 2025)
  const isAnniversary = (date: Date) => {
    const anniversaryStart = new Date('2025-06-01');
    return date >= anniversaryStart && date.getDate() === 1;
  };

  // Create modifiers for calendar
  const hasSharedDates = activities.filter(a => a.hasShared).map(a => new Date(a.date));
  const metIRLDates = activities.filter(a => a.metIRL).map(a => new Date(a.date));

  // Get anniversary dates (1st of every month from June 2025 to current date + 1 year)
  const anniversaryDates: Date[] = [];
  const today = new Date();
  const startDate = new Date('2025-06-01');
  const endDate = new Date(today.getFullYear() + 1, today.getMonth() + 1, 1);

  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    anniversaryDates.push(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  console.log('Has shared dates:', hasSharedDates.map(d => format(d, 'yyyy-MM-dd')));
  console.log('Met IRL dates:', metIRLDates.map(d => format(d, 'yyyy-MM-dd')));

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);

    // Check if this date has activity
    const hasActivity = activities.some((activity) =>
      isSameDay(new Date(activity.date), date)
    );

    console.log('Date selected:', format(date, 'yyyy-MM-dd'), 'Has activity:', hasActivity);
    console.log('Activities:', activities.length);

    // Always show the day view if there's activity, or update selection
    if (hasActivity) {
      // Small delay to ensure state updates
      setTimeout(() => setShowDayView(true), 100);
    }
  };

  // Toggle IRL meeting status
  const handleToggleIRL = async (metIRL: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedDayActivity) return;

      // First, check if the met_irl column exists by trying to read it
      const { data: testData, error: testError } = await supabase
        .from("posts")
        .select("id")
        .limit(1)
        .single();

      // If column doesn't exist, show a helpful error
      if (testError && testError.message.includes("met_irl")) {
        toast({
          title: "Database Setup Required",
          description: "The 'met_irl' column needs to be added to the posts table. Please run the migration.",
          variant: "destructive",
        });
        setShowIRLDialog(false);
        return;
      }

      // Update all posts for this date - using string literal to avoid TypeScript error
      const postIds = selectedDayActivity.posts.map(p => p.id);
      const { error } = await supabase
        .from("posts")
        .update({ met_irl: metIRL })
        .in("id", postIds);

      if (error) {
        // If the column doesn't exist, provide a clear message
        if (error.message.includes("met_irl") || error.message.includes("column")) {
          toast({
            title: "Feature Not Available",
            description: "The IRL tracking feature needs database setup. Please contact support.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setShowIRLDialog(false);
        return;
      }

      toast({
        title: metIRL ? "💚 Marked as met IRL!" : "Updated",
        description: metIRL
          ? "This day is now marked with a green indicator"
          : "Meeting status updated",
      });

      // Invalidate cache to refresh
      queryClient.invalidateQueries({ queryKey: ["feed-activities"] });
      setShowIRLDialog(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setShowIRLDialog(false);
    }
  };

  // Get activity indicator for a day
  const getDayIndicator = (date: Date) => {
    const activity = activities.find((a) =>
      isSameDay(new Date(a.date), date)
    );

    if (!activity) return null;

    if (activity.metIRL) {
      return <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full"></div>;
    }

    if (activity.hasShared) {
      return <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>;
    }

    return null;
  };

  // Get image URL
  const getImageUrl = (imagePath: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from("glimpses")
      .getPublicUrl(imagePath);
    return publicUrl;
  };

  // Navigate to previous day with activity
  const goToPreviousDay = () => {
    // Sort activities by date in descending order
    const sortedActivities = [...activities].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Find the next earlier day with activity
    const currentIndex = sortedActivities.findIndex(a =>
      isSameDay(new Date(a.date), selectedDate)
    );

    if (currentIndex < sortedActivities.length - 1) {
      const prevDay = new Date(sortedActivities[currentIndex + 1].date);
      setSelectedDate(prevDay);
    }
  };

  // Navigate to next day with activity
  const goToNextDay = () => {
    // Sort activities by date in descending order
    const sortedActivities = [...activities].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Find the next later day with activity
    const currentIndex = sortedActivities.findIndex(a =>
      isSameDay(new Date(a.date), selectedDate)
    );

    if (currentIndex > 0) {
      const nextDay = new Date(sortedActivities[currentIndex - 1].date);
      setSelectedDate(nextDay);
    }
  };

  // Check if there's a previous/next day with activity
  const hasPreviousDay = () => {
    const sortedActivities = [...activities].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const currentIndex = sortedActivities.findIndex(a =>
      isSameDay(new Date(a.date), selectedDate)
    );
    return currentIndex < sortedActivities.length - 1;
  };

  const hasNextDay = () => {
    const sortedActivities = [...activities].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const currentIndex = sortedActivities.findIndex(a =>
      isSameDay(new Date(a.date), selectedDate)
    );
    return currentIndex > 0;
  };

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && hasNextDay()) {
      goToNextDay();
    }
    if (isRightSwipe && hasPreviousDay()) {
      goToPreviousDay();
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showDayView) return;

      if (e.key === 'ArrowLeft' && hasPreviousDay()) {
        goToPreviousDay();
      } else if (e.key === 'ArrowRight' && hasNextDay()) {
        goToNextDay();
      } else if (e.key === 'Escape') {
        setShowDayView(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDayView, selectedDate, activities]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] safe-area-inset overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-0 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <style>{`
        .has-activity-yellow {
          position: relative !important;
        }
        .has-activity-yellow::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: #FBBF24;
          border-radius: 50%;
          z-index: 10;
        }
        @media (min-width: 640px) {
          .has-activity-yellow::after {
            width: 5px;
            height: 5px;
            bottom: 5px;
          }
        }
        @media (min-width: 768px) {
          .has-activity-yellow::after {
            width: 6px;
            height: 6px;
            bottom: 6px;
          }
        }
        .has-activity-green {
          position: relative !important;
        }
        .has-activity-green::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: #10B981;
          border-radius: 50%;
          z-index: 10;
        }
        @media (min-width: 640px) {
          .has-activity-green::after {
            width: 5px;
            height: 5px;
            bottom: 5px;
          }
        }
        @media (min-width: 768px) {
          .has-activity-green::after {
            width: 6px;
            height: 6px;
            bottom: 6px;
          }
        }
        .anniversary-day {
          position: relative !important;
        }
        .anniversary-day::before {
          content: '❤️';
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 7px;
          z-index: 10;
          line-height: 1;
        }
        @media (min-width: 640px) {
          .anniversary-day::before {
            font-size: 8px;
            top: 3px;
            right: 3px;
          }
        }
        @media (min-width: 768px) {
          .anniversary-day::before {
            font-size: 10px;
          }
        }
      `}</style>

      {/* Header */}
      <header className="relative flex-shrink-0 p-4 sm:p-6 pb-3 pt-safe">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center glass-effect hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
          </Button>

          <div className="flex flex-col items-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
              Calendar
            </h1>
            {partner?.username && (
              <p className="text-xs text-muted-foreground mt-0.5">
                @{partner.username}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center glass-effect hover:bg-white/10 transition-all"
            disabled={isLoading}
          >
            <RefreshCw className={`w-5 h-5 sm:w-6 sm:h-6 text-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      {activities.length > 0 && (
        <div className="relative px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="max-w-4xl mx-auto glass-effect rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-white/5">
            <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
              <div className="flex flex-col items-center">
                <span className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">{activities.length}</span>
                <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">shared days</span>
              </div>
              <div className="w-px h-5 sm:h-6 md:h-8 bg-white/10"></div>
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 bg-yellow-500 rounded-full"></div>
                <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">Online</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full"></div>
                <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">IRL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <main className="relative px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 animate-slide-up">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3 sm:mb-4"></div>
              <div className="text-foreground/60 font-mono text-xs sm:text-sm">
                Loading your moments...
              </div>
            </div>
          ) : (
            <div className="glass-effect rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8 overflow-hidden shadow-2xl border border-white/10 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="w-full border-0"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-3 sm:space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center mb-3 sm:mb-4",
                  caption_label: "text-sm sm:text-base font-display font-semibold text-foreground",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 bg-transparent p-0 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 text-foreground hover:bg-white/10 transition-all",
                  nav_button_previous: "absolute left-0 sm:left-1",
                  nav_button_next: "absolute right-0 sm:right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full mb-1 sm:mb-2",
                  head_cell: "text-muted-foreground rounded-md w-full font-mono text-[10px] sm:text-xs font-medium flex-1 text-center",
                  row: "flex w-full mt-1 sm:mt-2 gap-1",
                  cell: "relative p-0 text-center text-xs sm:text-sm focus-within:relative focus-within:z-20 flex-1",
                  day: "h-9 sm:h-10 md:h-11 w-full aspect-square p-0 font-mono text-xs sm:text-sm rounded-full hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-all relative inline-flex items-center justify-center",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-semibold",
                  day_today: "bg-accent/50 text-accent-foreground font-semibold",
                  day_outside: "text-muted-foreground opacity-30",
                  day_disabled: "text-muted-foreground opacity-30",
                  day_hidden: "invisible",
                }}
                modifiers={{
                  hasShared: hasSharedDates,
                  metIRL: metIRLDates,
                  anniversary: anniversaryDates,
                }}
                modifiersClassNames={{
                  hasShared: "has-activity-yellow",
                  metIRL: "has-activity-green",
                  anniversary: "anniversary-day",
                }}
              />
            </div>
          )}

          {/* Selected Date Info */}
          {selectedDayActivity && (
            <div className="mt-3 sm:mt-4 glass-effect rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-white/5 animate-slide-up">
              {/* Date Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">
                    {format(selectedDate, "EEEE, MMM d")}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    {selectedDayActivity.posts.length} {selectedDayActivity.posts.length === 1 ? 'moment' : 'moments'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowIRLDialog(true)}
                  className={`text-[10px] sm:text-xs px-3 py-2 rounded-full transition-all ${
                    selectedDayActivity.metIRL
                      ? 'bg-green-500/10 hover:bg-green-500/15 text-green-500'
                      : 'hover:bg-white/5 text-muted-foreground'
                  }`}
                >
                  {selectedDayActivity.metIRL ? (
                    <>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                      <span className="font-medium">IRL</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                      <span>Mark IRL</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Thumbnails Grid */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
                {selectedDayActivity.posts.slice(0, 8).map((post, index) => (
                  <div
                    key={post.id}
                    className="aspect-square rounded-md sm:rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (post.type === "photo" && post.image_path) {
                        setSelectedImage(getImageUrl(post.image_path));
                      } else {
                        setShowDayView(true);
                      }
                    }}
                  >
                    {post.type === "photo" && post.image_path ? (
                      <img
                        src={getImageUrl(post.image_path)}
                        alt={post.caption || "Shared moment"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center p-1 sm:p-2 text-center"
                        style={{ backgroundColor: post.note_color || "#1a1a2e" }}
                      >
                        <p className="text-white text-[8px] sm:text-[10px] line-clamp-3">
                          {post.note_text || post.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* View All Button */}
              <Button
                className="w-full bg-primary hover:bg-primary/90 rounded-full h-10 text-sm font-medium transition-all"
                onClick={() => setShowDayView(true)}
              >
                View All ({selectedDayActivity.posts.length})
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* IRL Dialog */}
      <Dialog open={showIRLDialog} onOpenChange={setShowIRLDialog}>
        <DialogContent className="glass-effect border border-white/5 bg-background/95 backdrop-blur-xl rounded-2xl w-[90vw] max-w-sm p-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Did you meet on</p>
                  <p className="font-semibold text-base text-foreground">{format(selectedDate, "MMM d, yyyy")}</p>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white h-11 rounded-full text-sm font-medium"
              onClick={() => handleToggleIRL(true)}
            >
              <Heart className="w-4 h-4 mr-2 fill-white" />
              Yes, met IRL
            </Button>
            <Button
              className="w-full hover:bg-white/5 h-11 rounded-full text-sm font-medium border-white/10"
              variant="outline"
              onClick={() => handleToggleIRL(false)}
            >
              No, online only
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-white/10 overflow-hidden">
          {selectedImage && (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Full size"
                className="w-full max-h-[80vh] object-contain"
              />
              <Button
                onClick={() => setSelectedImage(null)}
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Day Detail View - Full Screen */}
      <Dialog open={showDayView} onOpenChange={setShowDayView}>
        <DialogContent className="max-w-full w-full h-full p-0 m-0 bg-background border-0 overflow-hidden">
          {/* Header with navigation */}
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 max-w-4xl mx-auto">
              {/* Left Navigation */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousDay}
                disabled={!hasPreviousDay()}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </Button>

              {/* Date Title - Centered */}
              <div className="flex flex-col items-center">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  {format(selectedDate, "EEEE, MMM d")}
                </h2>
                {selectedDayActivity?.metIRL && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-[10px] text-muted-foreground">Met IRL</span>
                  </div>
                )}
              </div>

              {/* Right Navigation */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextDay}
                disabled={!hasNextDay()}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div
            className="relative overflow-y-auto h-full pb-24"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
              {selectedDayActivity && (
                <div className="space-y-4">
                  {selectedDayActivity.posts.map((post, index) => (
                    <div
                      key={post.id}
                      className="glass-effect rounded-2xl p-4 sm:p-5 border border-white/5 animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Post Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${post.type === 'photo' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                          <span className="text-xs text-muted-foreground capitalize font-medium">
                            {post.type}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(post.created_at), "h:mm a")}
                        </span>
                      </div>

                      {/* Post Content */}
                      {post.type === "photo" && post.image_path ? (
                        <div
                          className="rounded-xl overflow-hidden mb-3 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(getImageUrl(post.image_path))}
                        >
                          <img
                            src={getImageUrl(post.image_path)}
                            alt={post.caption || "Shared moment"}
                            className="w-full max-h-[400px] object-cover"
                          />
                        </div>
                      ) : post.type === "note" ? (
                        <div
                          className="rounded-xl p-4 sm:p-5 mb-3"
                          style={{ backgroundColor: post.caption || "#1a1a2e" }}
                        >
                          <p className="text-white text-sm sm:text-base leading-relaxed">
                            {post.note_text}
                          </p>
                        </div>
                      ) : null}

                      {/* Caption */}
                      {post.caption && post.type === "photo" && (
                        <p className="text-foreground/80 text-sm">{post.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-white/5 z-50">
            <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
              {/* Navigation hints */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {hasPreviousDay() && (
                  <div className="flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" />
                    <span className="hidden sm:inline">Previous</span>
                  </div>
                )}
                {hasNextDay() && (
                  <div className="flex items-center gap-1">
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Close button */}
              <Button
                onClick={() => setShowDayView(false)}
                className="bg-primary hover:bg-primary/90 rounded-full h-9 px-5 text-sm font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feed;
