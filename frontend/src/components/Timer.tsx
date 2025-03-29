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

  return (
    <div className="text-center">
      <div
        className={`text-4xl font-bold px-8 py-4 bg-white rounded-lg shadow-md ${
          timeLeft < 10 ? "text-red-600 animate-pulse" : ""
        }`}
      >
        {formatTime(timeLeft)}
      </div>
    </div>
  );
};

export default Timer;
