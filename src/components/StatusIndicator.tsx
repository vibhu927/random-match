'use client';

import React from 'react';

interface StatusIndicatorProps {
  status: 'idle' | 'waiting' | 'connected' | 'skipped' | 'error';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  let message = '';
  let color = '';

  switch (status) {
    case 'idle':
      message = 'Click "Start" to begin';
      color = 'text-gray-500';
      break;
    case 'waiting':
      message = 'Waiting for someone to connect...';
      color = 'text-blue-500';
      break;
    case 'connected':
      message = 'Connected! Video stream should appear shortly';
      color = 'text-green-500';
      break;
    case 'skipped':
      message = 'The other person left. Finding a new match...';
      color = 'text-yellow-500';
      break;
    case 'error':
      message = 'Camera/microphone access error. This browser may not be supported.';
      color = 'text-red-500';
      break;
  }

  return (
    <div className={`text-center font-medium ${color} flex items-center justify-center gap-2 text-sm sm:text-base px-2`}>
      {status === 'waiting' && (
        <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
      )}
      <span>{message}</span>
    </div>
  );
};

export default StatusIndicator;
