import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, RefreshCw, ChevronLeft, ChevronRight, FileText, Camera, Calendar as CalendarIcon, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMedia } from "@/hooks/useMedia";
import { format, formatDistanceToNow, startOfMonth, startOfYear } from "date-fns";

type FilterType = 'all' | 'photos' | 'notes';
type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

const Media = () => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Use the custom hook for data fetching with automatic caching
  const { data: media = [], isLoading, isError, error, refetch } = useMedia();

  // Filter media based on type and date
  const filteredMedia = useMemo(() => {
    let result = media;

    // Type filter
    if (filter === 'photos') result = result.filter(item => item.type === 'photo');
    if (filter === 'notes') result = result.filter(item => item.type === 'note');

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(item => new Date(item.created_at) >= startOfToday);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(item => new Date(item.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthStart = startOfMonth(now);
      result = result.filter(item => new Date(item.created_at) >= monthStart);
    } else if (dateFilter === 'year') {
      const yearStart = startOfYear(now);
      result = result.filter(item => new Date(item.created_at) >= yearStart);
    }

    return result;
  }, [media, filter, dateFilter]);

  // Navigation functions for fullscreen viewer
  const goToPrevious = () => {
    if (selectedIndex === null) return;
    const newIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredMedia.length - 1;
    setSelectedIndex(newIndex);
  };

  const goToNext = () => {
    if (selectedIndex === null) return;
    const newIndex = selectedIndex < filteredMedia.length - 1 ? selectedIndex + 1 : 0;
    setSelectedIndex(newIndex);
  };

  const selectedItem = selectedIndex !== null ? filteredMedia[selectedIndex] : null;

  // Stats
  const photoCount = media.filter(m => m.type === 'photo').length;
  const noteCount = media.filter(m => m.type === 'note').length;

  // Error state
  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background safe-area-inset">
        <header className="flex-shrink-0 p-4 sm:p-6 pb-4 pt-safe">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="w-10 h-10 sm:w-12 sm:h-12 nav-button glass-effect hover:bg-white/10 rounded-full flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
            </Button>
            <div className="funky-text text-xl sm:text-2xl text-foreground">Shared Media</div>
            <div className="w-10 sm:w-12" />
          </div>
        </header>
        <main className="px-4 sm:px-6 pb-6">
          <div className="max-w-4xl mx-auto">
            <div className="glass-effect rounded-3xl p-8 sm:p-12 text-center border border-white/5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <X className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
              </div>
              <h3 className="text-foreground font-display font-semibold text-lg sm:text-xl mb-2">Failed to Load Media</h3>
              <p className="text-muted-foreground text-sm sm:text-base font-mono mb-4">
                {error?.message || "An error occurred while loading media"}
              </p>
              <Button onClick={() => refetch()} className="bg-primary hover:bg-primary/90 rounded-full h-11">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] safe-area-inset">
      {/* Header */}
      <header className="flex-shrink-0 p-4 sm:p-6 pb-3 pt-safe">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full flex items-center justify-center glass-effect hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>

          <div className="funky-text text-xl sm:text-2xl text-foreground">
            Shared Media
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={`w-10 h-10 rounded-full flex items-center justify-center glass-effect transition-all ${showFilters ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              <SlidersHorizontal className="w-5 h-5 text-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="w-10 h-10 rounded-full flex items-center justify-center glass-effect hover:bg-white/10"
              disabled={isLoading}
            >
              <RefreshCw className={`w-5 h-5 text-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Compact Stats */}
      {media.length > 0 && (
        <div className="px-4 sm:px-6 pb-3">
          <div className="max-w-6xl mx-auto glass-effect rounded-xl p-2.5 border border-white/[0.08]">
            <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{filteredMedia.length}</span>
                <span className="text-muted-foreground">items</span>
              </div>
              <div className="w-px h-4 bg-white/[0.12]"></div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                <span className="text-muted-foreground">{photoCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                <span className="text-muted-foreground">{noteCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters - Collapsible */}
      {showFilters && media.length > 0 && (
        <div className="px-4 sm:px-6 pb-3 animate-slide-down">
          <div className="max-w-6xl mx-auto space-y-2">
            {/* Type Filter */}
            <div className="glass-effect rounded-xl p-2 border border-white/[0.08]">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-all ${
                    filter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-white/[0.04] text-muted-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('photos')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-all ${
                    filter === 'photos'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-white/[0.04] text-muted-foreground'
                  }`}
                >
                  <Camera className="w-3 h-3 inline mr-1" />
                  Photos
                </button>
                <button
                  onClick={() => setFilter('notes')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium text-xs transition-all ${
                    filter === 'notes'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-white/[0.04] text-muted-foreground'
                  }`}
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  Notes
                </button>
              </div>
            </div>

            {/* Date Filter */}
            <div className="glass-effect rounded-xl p-2 border border-white/[0.08]">
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-xs transition-all ${
                    dateFilter === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-white/[0.04] text-muted-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-xs transition-all ${
                    dateFilter === 'today'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-white/[0.04] text-muted-foreground'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDateFilter('week')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-xs transition-all ${
                    dateFilter === 'week'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-white/[0.04] text-muted-foreground'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setDateFilter('month')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-xs transition-all ${
                    dateFilter === 'month'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-white/[0.04] text-muted-foreground'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setDateFilter('year')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-xs transition-all ${
                    dateFilter === 'year'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-white/[0.04] text-muted-foreground'
                  }`}
                >
                  Year
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content - More compact grid */}
      <main className="px-4 sm:px-6 pb-6">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3"></div>
              <div className="text-foreground/60 font-mono text-sm">Loading media...</div>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="glass-effect rounded-3xl p-8 sm:p-12 text-center animate-slide-up border border-white/5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CalendarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white/60" />
              </div>
              <h3 className="text-foreground font-display font-semibold text-lg sm:text-xl mb-2">
                {filter === 'all' && dateFilter === 'all'
                  ? 'No Media Shared Yet'
                  : 'No Items Match Filters'}
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base font-mono mb-4">
                {filter === 'all' && dateFilter === 'all'
                  ? 'Start sharing moments with your partner'
                  : 'Try adjusting your filters'}
              </p>
              {filter === 'all' && dateFilter === 'all' && (
                <Button
                  onClick={() => navigate('/camera')}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full h-11"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {filteredMedia.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="aspect-square rounded-xl overflow-hidden glass-effect cursor-pointer
                    hover:scale-105 transition-all duration-200 animate-slide-up relative group border border-white/[0.08]"
                  style={{ animationDelay: `${index * 30}ms` }}
                  onClick={() => setSelectedIndex(index)}
                >
                  {item.type === 'photo' ? (
                    <>
                      <img
                        src={item.imageUrl}
                        alt={item.caption || "Shared media"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/300x300/1a1a2e/ffffff?text=Image+Not+Found';
                          e.currentTarget.alt = 'Failed to load image';
                        }}
                      />
                      <div className="absolute top-1.5 left-1.5 w-1 h-1 bg-blue-500 rounded-full"></div>
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center p-2 relative"
                      style={{ backgroundColor: item.note_color || "#1a1a2e" }}
                    >
                      <p
                        className="text-[10px] leading-tight line-clamp-4 text-center"
                        style={{ color: item.note_text_color || "#ffffff" }}
                      >
                        {item.note_text}
                      </p>
                      <div className="absolute top-1.5 left-1.5 w-1 h-1 bg-purple-500 rounded-full"></div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[9px] truncate">{item.isCurrentUser ? 'You' : item.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Fullscreen Viewer Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        <DialogContent className="max-w-full w-full h-full p-0 m-0 bg-[#0a0e1a] border-0 overflow-hidden">
          {selectedItem && (
            <>
              {/* Header */}
              <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/98 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 max-w-4xl mx-auto">
                  {/* Left Navigation */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </Button>

                  {/* Type & Username */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${selectedItem.type === 'photo' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                      <span className="text-sm font-medium text-foreground capitalize">
                        {selectedItem.type}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      by {selectedItem.username}
                    </span>
                  </div>

                  {/* Right Navigation */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
                  >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="relative w-full h-full flex items-center justify-center pt-16 pb-24">
                {selectedItem.type === 'photo' ? (
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.caption || "Full size media"}
                    className="max-w-full max-h-full object-contain px-4"
                  />
                ) : (
                  <div className="max-w-2xl mx-auto px-4">
                    <div
                      className="rounded-3xl p-8 sm:p-12"
                      style={{ backgroundColor: selectedItem.note_color || "#1a1a2e" }}
                    >
                      <p
                        className="text-lg sm:text-xl leading-relaxed text-center"
                        style={{ color: selectedItem.note_text_color || "#ffffff" }}
                      >
                        {selectedItem.note_text}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-white/5 z-50">
                <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6">
                  {/* Caption/Info */}
                  <div className="mb-2.5">
                    {selectedItem.type === 'photo' && selectedItem.caption && (
                      <p className="text-foreground text-sm mb-1">{selectedItem.caption}</p>
                    )}
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                      <span>{format(new Date(selectedItem.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      <span>{formatDistanceToNow(new Date(selectedItem.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Navigation & Close */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {selectedIndex !== null && `${selectedIndex + 1} of ${filteredMedia.length}`}
                    </div>
                    <Button
                      onClick={() => setSelectedIndex(null)}
                      className="bg-primary hover:bg-primary/90 rounded-full h-9 px-5 text-sm font-medium"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Media;
