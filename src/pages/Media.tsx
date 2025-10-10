import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Media = () => {
  const navigate = useNavigate();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get the partner connection
    const { data: connection } = await supabase
      .from("friend_connections")
      .select("requester_id, addressee_id")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();

    if (!connection) {
      setLoading(false);
      return;
    }

    const partnerId = connection.requester_id === user.id 
      ? connection.addressee_id 
      : connection.requester_id;

    // Fetch all photo posts from user and partner
    const { data: posts } = await supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(username)")
      .eq("type", "photo")
      .in("user_id", [user.id, partnerId])
      .order("created_at", { ascending: false });

    if (posts) {
      const mediaWithUrls = await Promise.all(
        posts.map(async (post) => {
          const { data: urlData } = await supabase.storage
            .from("glimpses")
            .createSignedUrl(post.image_path, 3600);

          return {
            ...post,
            imageUrl: urlData?.signedUrl,
          };
        })
      );
      setMedia(mediaWithUrls);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background safe-area-inset">
      {/* Header */}
      <header className="flex-shrink-0 p-4 sm:p-6 pb-4 pt-safe">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="w-10 h-10 sm:w-12 sm:h-12 nav-button glass-effect hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
          </Button>

          <div className="funky-text text-xl sm:text-2xl text-foreground">
            Shared Media
          </div>

          <div className="w-10 sm:w-12" />
        </div>
      </header>

      {/* Content */}
      <main className="px-4 sm:px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse-glow text-white/60 font-mono text-sm">Loading...</div>
            </div>
          ) : media.length === 0 ? (
            <div className="glass-effect rounded-3xl p-8 sm:p-12 text-center animate-slide-up">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white/60" />
              </div>
              <h3 className="text-white font-display font-semibold text-lg sm:text-xl mb-2">No Media Yet</h3>
              <p className="text-white/60 text-sm sm:text-base font-mono">
                Start sharing moments with your partner
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              {media.map((item, index) => (
                <div
                  key={item.id}
                  className="aspect-square rounded-lg sm:rounded-2xl overflow-hidden glass-effect cursor-pointer 
                    hover:scale-105 transition-transform animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedImage(item.imageUrl)}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.caption || "Shared media"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-white/10">
          <img
            src={selectedImage || ""}
            alt="Full size"
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Media;
