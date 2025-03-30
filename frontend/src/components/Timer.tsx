import { useEffect, useRef, useState } from "react";

interface TimerProps {
  initialTime: number;
  isRunning: boolean;
  onTimeUp: () => void;
}

const Timer = ({ initialTime, isRunning, onTimeUp }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const timerIdRef = useRef<number | null>(null);
  // Track when the timer started to calculate elapsed time
  const startTimeRef = useRef<number | null>(null);

  // Use useRef to track if we've called onTimeUp to prevent multiple calls
  const hasCalledTimeUpRef = useRef(false);

  useEffect(() => {
    if (!isRunning) {
      // Reset when timer is stopped
      setTimeLeft(initialTime);
      startTimeRef.current = null;
      hasCalledTimeUpRef.current = false;
      if (timerIdRef.current) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      return;
    }

    // When timer starts, record the current time
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const updateRemainingTime = () => {
      if (!startTimeRef.current) return;

      // Calculate elapsed time since timer started
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, initialTime - elapsed);
      setTimeLeft(remaining);

      // Check if timer has expired
      if (remaining <= 0 && !hasCalledTimeUpRef.current) {
        hasCalledTimeUpRef.current = true;
        onTimeUp();

        if (timerIdRef.current) {
          window.clearInterval(timerIdRef.current);
          timerIdRef.current = null;
        }
      }
    };

    // Update immediately, then every 100ms (more frequent to be more precise)
    updateRemainingTime();
    timerIdRef.current = window.setInterval(updateRemainingTime, 100);

    return () => {
      if (timerIdRef.current) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [isRunning, initialTime, onTimeUp]);

  const formatTime = (seconds: number): string => {
    return `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  const getTimerClass = () => {
    if (timeLeft < 10) return "text-error";
    if (timeLeft < 20) return "text-warning";
    return "text-success";
  };

  return (
    <div className="text-center">
      <div className="stats shadow">
        <div className="stat">
          <div className="stat-title">Time Remaining</div>
          <div
            className={`stat-value ${getTimerClass()} ${
              timeLeft < 10 ? "animate-pulse" : ""
            }`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timer;
