import { ReactSketchCanvas, ReactSketchCanvasRef } from "react-sketch-canvas";
import { useEffect, useRef, useState } from "react";

interface DrawingCanvasProps {
  onSave: (drawingData: string) => void;
  isTimerRunning: boolean;
}

const DrawingCanvas = ({ onSave, isTimerRunning }: DrawingCanvasProps) => {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [canDraw, setCanDraw] = useState(true);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Save drawing periodically when timer is running
  useEffect(() => {
    if (!isTimerRunning || !hasDrawing) return;

    // Auto-save drawing every 5 seconds while timer is running
    const saveInterval = setInterval(() => {
      console.log("Auto-saving drawing...");
      handleSave();
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [isTimerRunning, hasDrawing]);

  useEffect(() => {
    console.log("DrawingCanvas - Timer running state changed:", isTimerRunning);
    setCanDraw(isTimerRunning);

    if (!isTimerRunning && hasDrawing) {
      console.log("DrawingCanvas - Timer stopped, saving drawing");
      handleSave();
    }
  }, [isTimerRunning, onSave, hasDrawing]);

  const handleSave = async () => {
    console.log("DrawingCanvas - handleSave called");
    if (canvasRef.current) {
      try {
        const data = await canvasRef.current.exportImage("png");
        console.log("DrawingCanvas - Drawing exported successfully");
        onSave(data);
      } catch (error) {
        console.error("Error saving drawing:", error);
      }
    } else {
      console.error("DrawingCanvas - Canvas reference is null");
    }
  };

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
  };

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  return (
    <div className="w-full">
      <div className="w-full mb-4">
        <div className="border border-gray-300 rounded-lg">
          <ReactSketchCanvas
            ref={canvasRef}
            width="100%"
            height="400px"
            strokeWidth={4}
            strokeColor="black"
            canvasColor="white"
            exportWithBackgroundImage={false}
            withTimestamp={false}
            onChange={() => setHasDrawing(true)}
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleUndo}
          disabled={!canDraw}
          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          disabled={!canDraw}
          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
