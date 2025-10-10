import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricText, FabricImage, util } from "fabric";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Palette, Type, Download, Undo, Redo } from "lucide-react";

interface ImageEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (dataUrl: string, caption?: string) => void;
}

const COLORS = [
  "#ffffff", // white
  "#000000", // black  
  "#ff0000", // red
  "#00ff00", // green
  "#0000ff", // blue
  "#ffff00", // yellow
  "#ff00ff", // magenta
  "#00ffff", // cyan
];

export const ImageEditor = ({ imageUrl, onClose, onSave }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeColor, setActiveColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [activeTool, setActiveTool] = useState<"draw" | "text">("draw");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 400,
      height: 400,
      backgroundColor: "#000000",
    });

    // Load the image
    FabricImage.fromURL(imageUrl).then((img) => {
      // Scale the image to fit our canvas
      const scale = Math.min(400 / img.width!, 400 / img.height!);
      img.scale(scale);
      img.set({
        left: (400 - img.getScaledWidth()) / 2,
        top: (400 - img.getScaledHeight()) / 2,
        selectable: false,
      });
      canvas.add(img);
      canvas.renderAll();
    });

    // Set up drawing brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = brushSize;
    canvas.isDrawingMode = activeTool === "draw";

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }
  }, [activeTool, activeColor, brushSize, fabricCanvas]);

  const addText = () => {
    if (!fabricCanvas) return;

    const text = new FabricText("Add text", {
      left: 200,
      top: 200,
      fill: activeColor,
      fontSize: 24,
      fontFamily: 'Inter',
      selectable: true,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvas) return;

    const dataUrl = fabricCanvas.toDataURL({
      format: 'jpeg',
      quality: 0.9,
      multiplier: 1,
    });

    onSave(dataUrl, caption);
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    // Simple undo - remove last object
    const objects = fabricCanvas.getObjects();
    if (objects.length > 1) { // Keep the background image
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.renderAll();
    }
  };

  const clearCanvas = () => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    if (objects.length > 1) {
      // Remove all except the background image
      const objectsToRemove = objects.slice(1);
      objectsToRemove.forEach(obj => fabricCanvas.remove(obj));
      fabricCanvas.renderAll();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="glass-effect rounded-3xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="funky-text text-xl text-white">Edit Glimpse</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="nav-button glass-effect hover:bg-white/10"
          >
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>

        {/* Canvas */}
        <div className="mb-4 flex justify-center">
          <div className="border border-white/20 rounded-2xl overflow-hidden">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>

        {/* Tools */}
        <div className="space-y-4">
          {/* Tool Selection */}
          <div className="flex space-x-2">
            <Button
              variant={activeTool === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("draw")}
              className="flex-1"
            >
              <Palette className="w-4 h-4 mr-2" />
              Draw
            </Button>
            <Button
              variant={activeTool === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveTool("text");
                addText();
              }}
              className="flex-1"
            >
              <Type className="w-4 h-4 mr-2" />
              Text
            </Button>
          </div>

          {/* Colors */}
          <div className="flex space-x-2 justify-center">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                className={`w-8 h-8 rounded-full border-2 ${
                  activeColor === color ? 'border-white' : 'border-white/30'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Brush Size */}
          {activeTool === "draw" && (
            <div className="flex items-center space-x-3">
              <span className="text-white/60 text-sm font-mono">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-white text-sm font-mono w-8">{brushSize}</span>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-white/60 text-sm font-mono">Caption (optional)</label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a note to your glimpse..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              className="flex-1"
            >
              <Undo className="w-4 h-4 mr-2" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              className="flex-1"
            >
              Clear
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-white text-black hover:bg-white/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};