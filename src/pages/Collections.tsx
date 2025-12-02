
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users, UserPlus, Settings as SettingsIcon, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const Collections = () => {
  const navigate = useNavigate();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collections, setCollections] = useState([
    {
      id: 1,
      name: "Close Friends",
      members: ["Alex", "Sam", "Jordan"],
      role: "admin",
      color: "from-purple-500/20 to-blue-500/20",
      lastActivity: "2m ago"
    },
    {
      id: 2,
      name: "Work Crew",
      members: ["Taylor", "Morgan", "Casey", "Riley"],
      role: "member",
      color: "from-green-500/20 to-teal-500/20",
      lastActivity: "1h ago"
    },
    {
      id: 3,
      name: "Family",
      members: ["Mom", "Dad", "Sister"],
      role: "admin",
      color: "from-orange-500/20 to-red-500/20",
      lastActivity: "3h ago"
    }
  ]);

  const createCollection = () => {
    if (!newCollectionName.trim()) return;
    
    const newCollection = {
      id: Date.now(),
      name: newCollectionName.trim(),
      members: [],
      role: "admin",
      color: "from-indigo-500/20 to-purple-500/20",
      lastActivity: "now"
    };
    
    setCollections([newCollection, ...collections]);
    setNewCollectionName("");
    toast({
      title: "Collection Created",
      description: `"${newCollection.name}" is ready for your circle!`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Header */}
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

          <div className="funky-text text-xl sm:text-2xl text-foreground">
            Collections
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 sm:w-12 sm:h-12 nav-button glass-effect hover:bg-white/10 rounded-full flex items-center justify-center"
              >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-effect border border-white/5 bg-background/95 backdrop-blur-xl rounded-2xl w-[90vw] max-w-md p-6">
              <DialogHeader>
                <DialogTitle className="text-foreground font-display text-center">Create New Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <h3 className="text-sm text-muted-foreground mb-2 font-medium">Collection name</h3>
                  <Input
                    placeholder="Enter collection name..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="bg-white/5 border-white/5 text-foreground rounded-2xl h-11 px-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
                    onKeyPress={(e) => e.key === 'Enter' && createCollection()}
                  />
                </div>
                <Button
                  onClick={createCollection}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-11 font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Collection
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pb-6">
        <div className="max-w-md mx-auto space-y-4">
          {collections.map((collection, index) => (
            <div
              key={collection.id}
              className={`glass-effect rounded-3xl p-6 bg-gradient-to-br ${collection.color} 
                animate-slide-up hover:scale-[1.02] transition-all duration-300 cursor-pointer group`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Collection Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20">
                    <Users className="w-6 h-6 text-white/80" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-display font-semibold text-lg">
                        {collection.name}
                      </h3>
                      {collection.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-white/60 text-sm font-mono">
                      {collection.members.length} members • {collection.lastActivity}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <SettingsIcon className="w-5 h-5 text-white/60" />
                </Button>
              </div>

              {/* Members Preview */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {collection.members.slice(0, 4).map((member, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 bg-gradient-to-br from-white/30 to-white/10 
                        rounded-full border-2 border-black flex items-center justify-center"
                    >
                      <span className="text-white text-xs font-bold">
                        {member[0]}
                      </span>
                    </div>
                  ))}
                  {collection.members.length > 4 && (
                    <div className="w-8 h-8 bg-white/20 rounded-full border-2 border-black 
                      flex items-center justify-center">
                      <span className="text-white text-xs font-mono">
                        +{collection.members.length - 4}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white flex items-center space-x-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="text-sm font-mono">Invite</span>
                </Button>
              </div>

              {/* Activity Indicator */}
              <div className="mt-4 flex items-center space-x-2">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-white/40 to-white/20 rounded-full"
                    style={{ width: `${Math.random() * 100}%` }}
                  ></div>
                </div>
                <span className="text-white/40 text-xs font-mono">Activity</span>
              </div>
            </div>
          ))}

          {/* Create First Collection CTA */}
          {collections.length === 0 && (
            <div className="glass-effect rounded-3xl p-8 text-center animate-slide-up">
              <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-white/60" />
              </div>
              <h3 className="text-white font-display font-semibold mb-2">Create Your First Collection</h3>
              <p className="text-white/60 text-sm font-mono mb-4">
                Start sharing glimpses with your closest circle
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-white/10 border border-white/20 hover:bg-white/20 text-white" variant="outline">
                    Create Collection
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-effect border border-white/5 bg-background/95 backdrop-blur-xl rounded-2xl w-[90vw] max-w-md p-6">
                  <DialogHeader>
                    <DialogTitle className="text-foreground font-display text-center">Create New Collection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <h3 className="text-sm text-muted-foreground mb-2 font-medium">Collection name</h3>
                      <Input
                        placeholder="Enter collection name..."
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        className="bg-white/5 border-white/5 text-foreground rounded-2xl h-11 px-4 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <Button
                      onClick={createCollection}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-11 font-medium"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Collection
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Collections;
