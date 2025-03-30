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

  // Listen for timer-almost-up event
  useEffect(() => {
    const handleTimerAlmostUp = () => {
      console.log("Timer almost up, saving final drawing...");
      if (hasDrawing) {
        handleSave();
      }
    };

    document.addEventListener("timer-almost-up", handleTimerAlmostUp);

    return () => {
      document.removeEventListener("timer-almost-up", handleTimerAlmostUp);
    };
  }, [hasDrawing]);

  useEffect(() => {
    console.log("DrawingCanvas - Timer running state changed:", isTimerRunning);
    setCanDraw(isTimerRunning);

    if (!isTimerRunning && hasDrawing) {
      console.log("DrawingCanvas - Timer stopped, saving drawing");
      // Save immediately when timer stops
      handleSave();
    }
  }, [isTimerRunning, hasDrawing]);

  const handleChange = () => {
    setHasDrawing(true);
  };

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
    // Use setTimeout to make the operation non-blocking
    setTimeout(() => {
      canvasRef.current?.clearCanvas();
      setTimeout(handleSave, 50);
    }, 0);
  };

  const handleUndo = () => {
    // Use setTimeout to make the operation non-blocking
    setTimeout(() => {
      canvasRef.current?.undo();
      setTimeout(handleSave, 50);
    }, 0);
  };

  return (
    <div className="w-full">
      <div className="w-full mb-4">
        <div className="border border-base-300 rounded-lg">
          <ReactSketchCanvas
            ref={canvasRef}
            width="100%"
            height="400px"
            strokeWidth={4}
            strokeColor="black"
            canvasColor="white"
            exportWithBackgroundImage={false}
            withTimestamp={false}
            onChange={handleChange}
          />
        </div>
      </div>
      <div className="join w-full">
        <button
          onClick={handleUndo}
          disabled={!canDraw}
          className="btn btn-primary join-item flex-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a4 4 0 0 1 0 8h-4m-6-8l4-4m0 0L3 2m4 4H3"
            />
          </svg>
          Undo
        </button>
        <button
          onClick={handleClear}
          disabled={!canDraw}
          className="btn btn-error join-item flex-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Clear
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
