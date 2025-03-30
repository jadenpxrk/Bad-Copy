import { useEffect, useState } from "react";

interface TimerProps {
  initialTime: number;
  isRunning: boolean;
  onTimeUp: () => void;
}

const Timer = ({ initialTime, isRunning, onTimeUp }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(initialTime);
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => {
        // When we reach 3 seconds, notify for final drawing save
        if (prevTime === 3) {
          document.dispatchEvent(new CustomEvent("timer-almost-up"));
        }

        if (prevTime <= 1) {
          clearInterval(timerId);
          onTimeUp();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
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
