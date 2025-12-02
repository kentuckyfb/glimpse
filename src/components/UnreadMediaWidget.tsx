import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUnreadMedia, useMarkAsRead } from "@/hooks/useUnreadMedia";
import { format, formatDistanceToNow } from "date-fns";

export const UnreadMediaWidget = () => {
  const { data: unreadMedia = [], isLoading } = useUnreadMedia();
  const markAsRead = useMarkAsRead();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);

  if (isLoading || unreadMedia.length === 0) return null;

  const currentItem = unreadMedia[currentIndex];

  const handleNext = () => {
    if (currentIndex < unreadMedia.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleOpen = () => {
    setShowViewer(true);
  };

  const handleClose = () => {
    setShowViewer(false);
    // Mark all unread media as read
    const mediaIds = unreadMedia.map(item => item.id);
    markAsRead(mediaIds);
  };

  return (
    <>
      {/* Compact Widget */}
      <div className="glass-effect p-4 rounded-3xl animate-slide-down transition-all duration-300 relative overflow-hidden border border-blue-500/30">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse"></div>

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <h3 className="font-display font-semibold text-sm text-foreground">
                New from {currentItem.sender_username}
              </h3>
            </div>
            {unreadMedia.length > 1 && (
              <span className="text-xs text-muted-foreground font-mono bg-white/[0.08] px-2 py-1 rounded-full">
                {currentIndex + 1}/{unreadMedia.length}
              </span>
            )}
          </div>

          {/* Preview */}
          <div
            className="aspect-video rounded-2xl overflow-hidden mb-3 cursor-pointer hover:scale-[1.02] transition-transform border border-white/[0.08]"
            onClick={handleOpen}
          >
            {currentItem.type === 'photo' ? (
              <div className="relative w-full h-full">
                <img
                  src={currentItem.imageUrl}
                  alt="Unread photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-3">
                  <span className="text-white text-xs font-medium">📸 Photo</span>
                </div>
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center p-4"
                style={{ backgroundColor: currentItem.note_color || "#1a1a2e" }}
              >
                <p
                  className="text-sm text-center line-clamp-4 font-medium"
                  style={{ color: currentItem.note_text_color || "#ffffff" }}
                >
                  {currentItem.note_text}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              {formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true })}
            </span>

            <div className="flex items-center gap-2">
              {unreadMedia.length > 1 && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="w-8 h-8 rounded-full hover:bg-white/[0.08] disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    disabled={currentIndex === unreadMedia.length - 1}
                    className="w-8 h-8 rounded-full hover:bg-white/[0.08] disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4 text-foreground" />
                  </Button>
                </div>
              )}

              <Button
                size="sm"
                onClick={handleOpen}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-8 px-4 text-xs font-medium"
              >
                <Eye className="w-3 h-3 mr-1.5" />
                Open
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Viewer */}
      <Dialog open={showViewer} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-full w-full h-full p-0 m-0 bg-[#0a0e1a] border-0 overflow-hidden">
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/98 backdrop-blur-xl border-b border-white/[0.08]">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 max-w-4xl mx-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-20"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </Button>

              <div className="flex flex-col items-center">
                <span className="text-sm font-medium text-foreground">
                  From {currentItem.sender_username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(currentItem.created_at), "MMM d, h:mm a")}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={currentIndex === unreadMedia.length - 1}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-20"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="relative w-full h-full flex items-center justify-center pt-16 pb-24 px-4">
            {currentItem.type === 'photo' ? (
              <img
                src={currentItem.imageUrl}
                alt="Unread photo"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="max-w-2xl mx-auto w-full">
                <div
                  className="rounded-3xl p-8 sm:p-12"
                  style={{ backgroundColor: currentItem.note_color || "#1a1a2e" }}
                >
                  <p
                    className="text-lg sm:text-xl leading-relaxed text-center"
                    style={{ color: currentItem.note_text_color || "#ffffff" }}
                  >
                    {currentItem.note_text}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0e1a]/98 backdrop-blur-xl border-t border-white/[0.08]">
            <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {unreadMedia.length > 1 && (
                  <span className="bg-white/[0.08] px-2 py-1 rounded-full font-mono">
                    {currentIndex + 1} of {unreadMedia.length}
                  </span>
                )}
              </div>

              <Button
                onClick={handleClose}
                className="bg-primary hover:bg-primary/90 text-white rounded-full h-9 px-5 text-sm font-medium"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
