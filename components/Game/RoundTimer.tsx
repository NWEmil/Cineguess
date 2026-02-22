
import React, { useState, useEffect } from 'react';
import { soundService } from '../../services/soundService';

interface RoundTimerProps {
  seconds: number;
  onTimeUp: () => void;
  isActive: boolean;
  roundKey: string | number; // To reset timer state on new rounds
}

const RoundTimer: React.FC<RoundTimerProps> = ({ seconds, onTimeUp, isActive, roundKey }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [roundKey, seconds]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) {
      if (timeLeft <= 0 && isActive) onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        // Play warning sound for last 3 seconds
        if (prev <= 4) {
          soundService.play('warning');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, timeLeft, onTimeUp]);

  const percentage = (timeLeft / seconds) * 100;
  const isWarning = timeLeft <= 3;

  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
      <div 
        className={`h-full transition-all duration-1000 ease-linear ${
          isWarning ? 'bg-red-500' : 'bg-green-500'
        }`}
        style={{ width: `${percentage}%` }}
      />
      <div className="absolute -top-8 right-0 text-xl font-brand tracking-widest flex items-center gap-2">
        <span className={isWarning ? 'text-red-500 animate-pulse' : 'text-white'}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
};

export default RoundTimer;
