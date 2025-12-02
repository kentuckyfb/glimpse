import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Palette, Type } from "lucide-react";

interface NoteComposerProps {
  onClose: () => void;
  onSave: (note: string, bgColor: string, textColor: string) => void;
}

const BG_COLORS = [
  // Light colors
  "#ffffff", // white
  "#fef3c7", // yellow
  "#d1fae5", // green
  "#dbeafe", // blue
  "#fce7f3", // pink
  "#f3e8ff", // purple
  "#fed7d7", // red
  "#f0f0f0", // gray
  // Dark colors
  "#1a1a2e", // dark navy
  "#16213e", // dark blue
  "#0f3460", // deep blue
  "#533483", // purple
  "#2d4a4e", // teal
  "#3d2f2f", // brown
  "#1f1f1f", // charcoal
  "#0a0e1a", // very dark
];

const TEXT_COLORS = [
  // Dark colors for text
  "#000000", // black
  "#1a1a1a", // dark gray
  "#2c3e50", // dark blue-gray
  "#1e3a8a", // dark blue
  "#7c3aed", // purple
  "#be123c", // dark red
  "#047857", // dark green
  "#92400e", // dark brown
  // Light colors for text
  "#ffffff", // white
  "#f3f4f6", // light gray
  "#fef3c7", // light yellow
  "#dbeafe", // light blue
  "#fce7f3", // light pink
  "#f3e8ff", // light purple
  "#fed7d7", // light red
  "#d1fae5", // light green
];

export const NoteComposer = ({ onClose, onSave }: NoteComposerProps) => {
  const [note, setNote] = useState("");
  const [selectedBgColor, setSelectedBgColor] = useState("#ffffff");
  const [selectedTextColor, setSelectedTextColor] = useState("#000000");

  const handleSave = () => {
    if (note.trim()) {
      onSave(note.trim(), selectedBgColor, selectedTextColor);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
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
            style={{ backgroundColor: selectedBgColor }}
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full h-full bg-transparent border-none resize-none focus:ring-0 text-lg font-body placeholder:opacity-50"
              style={{ color: selectedTextColor }}
            />
          </div>

          {/* Background Color Selection */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm font-mono">Background Color</span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {BG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedBgColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    selectedBgColor === color ? 'border-white scale-110' : 'border-white/30'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Text Color Selection */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Type className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm font-mono">Text Color</span>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedTextColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    selectedTextColor === color ? 'border-white scale-110' : 'border-white/30'
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