import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export const Timer: React.FC = () => {
  const { roundTime, gameStatus, updateTimer } = useGameStore();
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    if (gameStatus !== 'playing') {
      setDisplayTime(roundTime);
      return;
    }

    const interval = setInterval(() => {
      updateTimer();
    }, 100);

    return () => clearInterval(interval);
  }, [gameStatus, updateTimer]);

  useEffect(() => {
    setDisplayTime(roundTime);
  }, [roundTime]);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
      <div className="flex items-center space-x-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-mono text-lg font-semibold">{formatTime(displayTime)}</span>
      </div>
    </div>
  );
}; 