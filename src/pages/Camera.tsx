
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera as CameraIcon, RotateCcw, Zap, ZapOff, Timer, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ImageEditor } from "@/components/ImageEditor";
import { NoteComposer } from "@/components/NoteComposer";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateMedia } from "@/hooks/useMedia";
import { useQueryClient } from "@tanstack/react-query";
import { sendPushNotification, getNotificationRecipients } from "@/lib/pushNotifications";

const Camera = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateMedia = useInvalidateMedia();
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast({
        title: "Camera Not Ready",
        description: "Please wait for camera to initialize.",
        variant: "destructive"
      });
      return;
    }

    setIsCapturing(true);

    const captureWithTimer = async () => {
      if (timerEnabled) {
        for (let i = 3; i > 0; i--) {
          setCountdown(i);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        setCountdown(0);
      }

      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d', { willReadFrequently: false })!;

      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      
      if (flashEnabled) {
        document.body.classList.add('flash-effect');
        setTimeout(() => document.body.classList.remove('flash-effect'), 200);
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);
      setShowImageEditor(true);
      setIsCapturing(false);
    };

    captureWithTimer();
  }, [flashEnabled, timerEnabled]);

  const handleImageSave = async (editedImageUrl: string, caption?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Convert base64 to blob
      const response = await fetch(editedImageUrl);
      const blob = await response.blob();
      const fileName = `${user.id}/${Date.now()}.jpg`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('glimpses')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL for the image
      const { data: { publicUrl } } = supabase.storage
        .from('glimpses')
        .getPublicUrl(fileName);

      // Save post to database
      const { error: dbError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          type: 'photo',
          image_path: fileName,
          caption: caption || null
        });

      if (dbError) throw dbError;

      // Get user's profile for sender name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();

      const senderName = profile?.display_name || profile?.username || 'Someone';

      // Send push notifications to all friends
      const friendIds = await getNotificationRecipients(user.id);

      // Send push to each friend (in parallel for better performance)
      await Promise.allSettled(
        friendIds.map((friendId) =>
          sendPushNotification({
            recipientId: friendId,
            type: 'image',
            content: caption || '',
            imageUrl: publicUrl,
            fromName: senderName,
          })
        )
      );

      // Invalidate all relevant caches to refresh the data
      invalidateMedia();
      queryClient.invalidateQueries({ queryKey: ["feed-activities"] });
      queryClient.invalidateQueries({ queryKey: ["recent-post"] });
      queryClient.invalidateQueries({ queryKey: ["unread-media"] });

      setShowImageEditor(false);
      setCapturedImage(null);

      toast({
        title: "📸 Glimpse Shared!",
        description: caption ? `"${caption}" - Your glimpse has been shared with your circle.` : "Your glimpse has been shared with your circle.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleNoteSave = async (note: string, bgColor: string, textColor: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Store colors as JSON in caption field: {"bg": "#fff", "text": "#000"}
      const colorData = JSON.stringify({ bg: bgColor, text: textColor });

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          type: 'note',
          note_text: note,
          caption: colorData
        });

      if (error) throw error;

      // Get user's profile for sender name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();

      const senderName = profile?.display_name || profile?.username || 'Someone';

      // Send push notifications to all friends
      const friendIds = await getNotificationRecipients(user.id);

      // Send push to each friend (in parallel for better performance)
      await Promise.allSettled(
        friendIds.map((friendId) =>
          sendPushNotification({
            recipientId: friendId,
            type: 'note',
            content: note.substring(0, 140), // Limit to 140 chars for notification
            fromName: senderName,
          })
        )
      );

      // Invalidate all relevant caches to refresh the data
      invalidateMedia();
      queryClient.invalidateQueries({ queryKey: ["feed-activities"] });
      queryClient.invalidateQueries({ queryKey: ["recent-post"] });
      queryClient.invalidateQueries({ queryKey: ["unread-media"] });

      setShowNoteComposer(false);

      toast({
        title: "📝 Note Shared!",
        description: "Your note has been shared with your circle.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Camera View */}
      <div className="absolute inset-0 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Countdown overlay */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="funky-text text-8xl text-white">
              {countdown}
            </div>
          </div>
        )}

        {/* Flash effect styles are in index.css */}
      </div>

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col h-screen safe-area-inset">
        {/* Top Bar */}
        <header className="flex-shrink-0 p-4 pt-safe sm:p-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="nav-button glass-effect hover:bg-white/10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
          </Button>

          <div className="funky-text text-xl sm:text-2xl text-foreground">
            Capture
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFlashEnabled(!flashEnabled)}
              className={`nav-button glass-effect w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${flashEnabled ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              {flashEnabled ? (
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              ) : (
                <ZapOff className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTimerEnabled(!timerEnabled)}
              className={`nav-button glass-effect w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${timerEnabled ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              <Timer className={`w-4 h-4 sm:w-5 sm:h-5 ${timerEnabled ? 'text-blue-400' : 'text-white/60'}`} />
            </Button>
          </div>
        </header>

        {/* Bottom Controls */}
        <footer className="flex-shrink-0 p-4 pb-safe sm:p-6">
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="nav-button glass-effect hover:bg-white/10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
            >
              <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-white/60" />
            </Button>

            {/* Capture Button */}
            <Button
              onClick={capturePhoto}
              disabled={isCapturing || countdown > 0}
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-4 border-white/30
                hover:scale-110 active:scale-95 transition-all duration-200
                disabled:opacity-50 disabled:scale-100 flex-shrink-0 flex items-center justify-center"
            >
              <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                <CameraIcon className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
              </div>

              {isCapturing && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-spin">
                  <div className="absolute inset-1 rounded-full bg-white"></div>
                </div>
              )}
            </Button>

            <div className="flex gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNoteComposer(true)}
                className="nav-button glass-effect hover:bg-white/10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
              >
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="nav-button glass-effect hover:bg-white/10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center p-2.5"
                onClick={() => navigate('/feed')}
              >
                <div className="w-full h-full rounded-md bg-gradient-to-br from-white/20 to-white/10 border border-white/20"></div>
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 sm:mt-6 text-center px-4">
            <p className="text-white/60 text-xs sm:text-sm font-mono">
              {timerEnabled ? "Timer enabled • " : ""}
              {flashEnabled ? "Flash on • " : ""}
              Tap to capture your glimpse
            </p>
          </div>
        </footer>
      </div>

      {/* Image Editor Modal */}
      {showImageEditor && capturedImage && (
        <ImageEditor
          imageUrl={capturedImage}
          onClose={() => {
            setShowImageEditor(false);
            setCapturedImage(null);
          }}
          onSave={handleImageSave}
        />
      )}

      {/* Note Composer Modal */}
      {showNoteComposer && (
        <NoteComposer
          onClose={() => setShowNoteComposer(false)}
          onSave={handleNoteSave}
        />
      )}
    </div>
  );
};

export default Camera;
