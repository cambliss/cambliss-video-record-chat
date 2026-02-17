"use client";

import * as React from "react";

interface RecordingTimerProps {
  isRecording: boolean;
  startedAt?: Date;
}

export default function RecordingTimer({ isRecording, startedAt }: RecordingTimerProps) {
  const [elapsedTime, setElapsedTime] = React.useState(0);

  React.useEffect(() => {
    console.log('RecordingTimer state:', { isRecording, startedAt });
    
    if (!isRecording) {
      setElapsedTime(0);
      return;
    }

    const startTime = startedAt ? startedAt.getTime() : Date.now();
    
    const interval = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(currentElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, startedAt]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-600 rounded-full">
      <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
      <span className="text-sm font-semibold text-white">
        REC {formatTime(elapsedTime)}
      </span>
    </div>
  );
}
