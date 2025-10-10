
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Share, Clock, Users, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Feed = () => {
  const navigate = useNavigate();
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get the partner connection (only one partner allowed)
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

      // Fetch posts from user and partner only
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .in('user_id', [user.id, partnerId])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get all unique user IDs
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      
      // Fetch usernames for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

      // Transform data to include image URLs
      const postsWithImages = await Promise.all((postsData || []).map(async (post) => {
        let imageUrl = null;
        if (post.type === 'photo' && post.image_path) {
          const { data: urlData } = supabase.storage
            .from('glimpses')
            .getPublicUrl(post.image_path);
          imageUrl = urlData.publicUrl;
        }

        return {
          id: post.id,
          userId: post.user_id,
          imagePath: post.image_path,
          user: profileMap.get(post.user_id) || 'User',
          timestamp: new Date(post.created_at),
          type: post.type,
          image: imageUrl,
          caption: post.caption || '',
          content: post.note_text || '',
          color: post.caption || '#fef3c7',
          likes: 0,
          collection: 'Partner'
        };
      }));

      setPosts(postsWithImages);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string, userId: string, imagePath?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      toast({ title: "You can only delete your own posts", variant: "destructive" });
      return;
    }

    try {
      // Delete image from storage if it exists
      if (imagePath) {
        await supabase.storage.from("glimpses").remove([imagePath]);
      }

      // Delete post from database
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({ title: "Post deleted" });
      loadPosts();
    } catch (error: any) {
      toast({ title: "Error deleting post", description: error.message, variant: "destructive" });
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background">
      {/* Header */}
      <header className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="nav-button glass-effect hover:bg-accent"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </Button>

          <div className="funky-text text-2xl text-foreground">Feed</div>
          <div className="w-12" />
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pb-6">
        <div className="max-w-md mx-auto space-y-6">
          {loading ? (
            <div className="text-center text-white py-8">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="glass-effect rounded-3xl p-8 text-center">
              <div className="text-white/40 mb-4">
                <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
              </div>
              <h3 className="text-white font-display font-semibold mb-2">No posts yet</h3>
              <p className="text-white/60 text-sm font-mono">
                Share your first glimpse to get started
              </p>
              <Button
                onClick={() => navigate('/camera')}
                className="mt-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white"
                variant="outline"
              >
                Capture Glimpse
              </Button>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
            <div
              key={post.id}
              className="glass-effect rounded-3xl p-6 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Post Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/30 to-white/10 rounded-full flex items-center justify-center border border-white/20">
                    <span className="text-white font-display font-bold text-sm">
                      {post.user[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium font-display">{post.user}</p>
                    <div className="flex items-center space-x-2 text-white/60 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{getTimeAgo(post.timestamp)}</span>
                      <span>•</span>
                      <span>{post.collection}</span>
                      <span>•</span>
                      {post.type === "note" ? (
                        <FileText className="w-3 h-3" />
                      ) : (
                        <span>📸</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePost(post.id, post.userId, post.imagePath)}
                  className="text-white/60 hover:text-red-400 hover:bg-white/10"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              {/* Post Content */}
              {post.type === "photo" ? (
                <div 
                  className="relative rounded-2xl overflow-hidden mb-4 animate-photo-pop"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {post.image ? (
                    <img 
                      src={post.image} 
                      alt={post.caption || 'Glimpse'}
                      className="w-full h-auto object-cover rounded-2xl"
                    />
                  ) : (
                    <div className="aspect-square bg-white/20 rounded-2xl flex items-center justify-center">
                      <span className="text-white/60">Loading image...</span>
                    </div>
                  )}
                  {post.caption && (
                    <div className="mt-2 text-white text-sm">{post.caption}</div>
                  )}
                </div>
              ) : (
                <div 
                  className="note-widget p-6 rounded-2xl mb-4 animate-photo-pop border-2 border-dashed border-white/20"
                  style={{ 
                    backgroundColor: (post.color || "#ffffff") + "20",
                    animationDelay: `${index * 150}ms` 
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: post.color || "#ffffff" }}>
                      <FileText className="w-4 h-4 text-black" />
                    </div>
                    <div className="flex-1">
                      <p className="text-black font-body leading-relaxed" style={{ 
                        backgroundColor: post.color || "#ffffff",
                        padding: "12px",
                        borderRadius: "12px",
                        border: "1px solid rgba(0,0,0,0.1)"
                      }}>
                        {post.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 text-white/60 hover:text-white"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="font-mono text-sm">{post.likes}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-2 text-white/60 hover:text-white"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white"
                >
                  <Share className="w-4 h-4" />
                </Button>
              </div>
            </div>
              ))}
            </>
          )}

          {/* Empty state for more content */}
          {!loading && posts.length > 0 && (
          <div className="glass-effect rounded-3xl p-8 text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="text-white/40 mb-4">
              <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
            </div>
            <h3 className="text-white font-display font-semibold mb-2">All caught up!</h3>
            <p className="text-white/60 text-sm font-mono">
              Share a glimpse to see more from your circle
            </p>
            <Button
              onClick={() => navigate('/camera')}
              className="mt-4 bg-white/10 border border-white/20 hover:bg-white/20 text-white"
              variant="outline"
            >
              Capture Glimpse
            </Button>
          </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Feed;
