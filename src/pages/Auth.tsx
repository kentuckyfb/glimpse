import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkSession();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        navigate("/");
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        
        if (username && data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ username })
            .eq("id", data.user.id);
          if (profileError) throw profileError;
        }
        
        toast({ 
          title: "Account created!",
          description: "Check your email to confirm your account."
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-black to-background p-4 sm:p-6 relative overflow-hidden">
      {/* Animated background elements matching main theme */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md glass-effect rounded-3xl p-6 sm:p-8 shadow-elegant border border-white/20">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="funky-text text-3xl sm:text-4xl text-foreground mb-2">glimpse</h1>
          <p className="text-muted-foreground text-sm">Share moments with your circle</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-foreground placeholder:text-muted-foreground focus:border-white/40 h-11"
            />
          </div>

          {!isLogin && (
            <div>
              <Label htmlFor="username" className="text-foreground">Username (optional)</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/10 border-white/20 text-foreground placeholder:text-muted-foreground focus:border-white/40 h-11"
              />
            </div>
          )}

          <div>
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-foreground placeholder:text-muted-foreground focus:border-white/40 h-11"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 text-base font-medium mt-6"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              isLogin ? "Sign In" : "Sign Up"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
