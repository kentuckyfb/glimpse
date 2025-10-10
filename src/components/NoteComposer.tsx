import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Palette } from "lucide-react";

interface NoteComposerProps {
  onClose: () => void;
  onSave: (note: string, color: string) => void;
}

const NOTE_COLORS = [
  "#ffffff", // white
  "#fef3c7", // yellow
  "#d1fae5", // green
  "#dbeafe", // blue
  "#fce7f3", // pink
  "#f3e8ff", // purple
  "#fed7d7", // red
  "#f0f0f0", // gray
];

export const NoteComposer = ({ onClose, onSave }: NoteComposerProps) => {
  const [note, setNote] = useState("");
  const [selectedColor, setSelectedColor] = useState("#ffffff");

  const handleSave = () => {
    if (note.trim()) {
      onSave(note.trim(), selectedColor);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="funky-text text-xl text-white">Share a Note</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="nav-button glass-effect hover:bg-white/10"
          >
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* Note Content */}
        <div className="space-y-4">
          <div 
            className="p-4 rounded-2xl border-2 border-dashed border-white/20 min-h-[200px]"
            style={{ backgroundColor: selectedColor + "20" }}
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full h-full bg-transparent border-none text-black placeholder:text-black/60 resize-none focus:ring-0 text-lg font-body"
              style={{ color: selectedColor === "#ffffff" ? "#000000" : "#000000" }}
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm font-mono">Note Color</span>
            </div>
            <div className="flex space-x-2 justify-center">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color ? 'border-white' : 'border-white/30'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Character Count */}
          <div className="text-right">
            <span className="text-white/40 text-xs font-mono">
              {note.length}/500
            </span>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!note.trim()}
              className="flex-1 bg-white text-black hover:bg-white/90 disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              Share Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};