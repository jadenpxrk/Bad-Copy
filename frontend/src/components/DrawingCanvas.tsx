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
  const saveTimeoutRef = useRef<number | null>(null);

  // Save drawing periodically when timer is running
  useEffect(() => {
    if (!isTimerRunning || !hasDrawing) return;

    // Auto-save drawing every 5 seconds while timer is running
    // Use a ref to track the timeout to avoid re-renders
    const saveInterval = setInterval(() => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Use a timeout to avoid blocking the main thread during drawing
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 100);
    }, 5000);

    return () => {
      clearInterval(saveInterval);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isTimerRunning, hasDrawing]);

  useEffect(() => {
    // Only update the canDraw state when timer state changes
    // to avoid unnecessary re-renders during drawing
    setCanDraw(isTimerRunning);

    if (!isTimerRunning && hasDrawing) {
      // Save immediately when timer stops using a timeout to
      // avoid blocking the timer
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 100);
    }
  }, [isTimerRunning, hasDrawing]);

  const handleChange = () => {
    if (!hasDrawing) {
      setHasDrawing(true);
    }
  };

  const handleSave = async () => {
    if (canvasRef.current) {
      try {
        const data = await canvasRef.current.exportImage("png");
        onSave(data);
      } catch (error) {
        console.error("Error saving drawing:", error);
      }
    }
  };

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();

      // Use a delay before saving to ensure canvas is cleared
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 100);
    }
  };

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();

      // Use a delay before saving to ensure undo is completed
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 100);
    }
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
