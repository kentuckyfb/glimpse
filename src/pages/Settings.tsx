
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  HelpCircle, 
  LogOut,
  Moon,
  Sun,
  Vibrate,
  Camera,
  Lock,
  Globe,
  Trash2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    darkMode: true,
    notifications: true,
    vibration: true,
    autoSave: true,
    privateMode: false,
    locationSharing: false
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/auth");
  };

  const settingSections = [
    {
      title: "Profile",
      items: [
        { icon: User, label: "Manage Friends", action: () => navigate("/friends") },
        { icon: Camera, label: "Profile Photo", action: () => {} },
      ]
    },
    {
      title: "Preferences",
      items: [
        { 
          icon: Bell, 
          label: "Notifications", 
          toggle: true, 
          key: "notifications" as keyof typeof settings 
        },
        { 
          icon: Vibrate, 
          label: "Vibration", 
          toggle: true, 
          key: "vibration" as keyof typeof settings 
        },
        { 
          icon: Download, 
          label: "Auto-save Photos", 
          toggle: true, 
          key: "autoSave" as keyof typeof settings 
        },
      ]
    },
    {
      title: "Privacy & Security",
      items: [
        { 
          icon: Lock, 
          label: "Private Mode", 
          toggle: true, 
          key: "privateMode" as keyof typeof settings 
        },
        { 
          icon: Globe, 
          label: "Location Sharing", 
          toggle: true, 
          key: "locationSharing" as keyof typeof settings 
        },
        { icon: Shield, label: "Privacy Policy", action: () => {} },
      ]
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & Support", action: () => {} },
        { icon: Palette, label: "About Glimpse", action: () => {} },
      ]
    },
    {
      title: "Account",
      items: [
        { icon: Trash2, label: "Delete Account", action: () => {}, danger: true },
        { icon: LogOut, label: "Sign Out", action: handleSignOut, danger: true },
      ]
    }
  ];

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

          <div className="funky-text text-2xl text-foreground">Settings</div>
          <div className="w-12 h-12"></div>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pb-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Profile Section */}
          <div className="glass-effect rounded-3xl p-6 animate-slide-up border-border">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full 
                flex items-center justify-center border border-border">
                <span className="text-foreground font-display font-bold text-xl">U</span>
              </div>
              <div>
                <h3 className="text-foreground font-display font-semibold text-lg">You</h3>
                <p className="text-muted-foreground text-sm font-mono">glimpse.user@email.com</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full bg-muted/20 border-border hover:bg-muted/40 text-foreground"
            >
              Edit Profile
            </Button>
          </div>

          {/* Settings Sections */}
          {settingSections.map((section, sectionIndex) => (
            <div 
              key={section.title}
              className="glass-effect rounded-3xl p-6 animate-slide-up border-border"
              style={{ animationDelay: `${(sectionIndex + 1) * 100}ms` }}
            >
              <h4 className="text-foreground font-display font-semibold mb-4 text-sm uppercase tracking-wide">
                {section.title}
              </h4>
              
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center space-x-3">
                        <item.icon className={`w-5 h-5 ${item.danger ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <span className={`font-medium ${item.danger ? 'text-destructive' : 'text-foreground'}`}>
                          {item.label}
                        </span>
                      </div>
                      
                      {item.toggle && item.key ? (
                        <Switch
                          checked={settings[item.key]}
                          onCheckedChange={() => toggleSetting(item.key!)}
                          className="data-[state=checked]:bg-primary/40"
                        />
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={item.action}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          →
                        </Button>
                      )}
                    </div>
                    
                    {itemIndex < section.items.length - 1 && (
                      <Separator className="bg-border" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* App Info */}
          <div className="glass-effect rounded-3xl p-6 text-center animate-slide-up border-border" 
            style={{ animationDelay: '600ms' }}>
            <div className="funky-text text-xl text-foreground mb-2">Glimpse</div>
            <p className="text-muted-foreground text-sm font-mono">Version 1.0.0</p>
            <p className="text-muted-foreground text-xs font-mono mt-2">
              Share real moments with your partner
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
