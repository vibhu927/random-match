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
      message = 'Click "Start Chatting" to begin';
      color = 'text-gray-300';
      break;
    case 'waiting':
      message = 'Waiting for someone to connect...';
      color = 'text-lavender-300';
      break;
    case 'connected':
      message = 'Connected! Enjoy your conversation';
      color = 'text-green-400';
      break;
    case 'skipped':
      message = 'The other person left. Finding a new match...';
      color = 'text-yellow-300';
      break;
    case 'error':
      message = 'Camera/microphone access error. This browser may not be supported.';
      color = 'text-red-400';
      break;
  }

  return (
    <div className={`text-center font-medium ${color} flex items-center justify-center gap-2 text-sm sm:text-base px-4 py-2 bg-gray-800 rounded-lg shadow-inner border border-gray-700`}>
      {status === 'waiting' && (
        <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 border-2 border-lavender-400 rounded-full border-t-transparent"></div>
      )}
      {status === 'connected' && (
        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-green-400 rounded-full animate-pulse"></div>
      )}
      {status === 'skipped' && (
        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-yellow-300 rounded-full"></div>
      )}
      {status === 'error' && (
        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-red-400 rounded-full"></div>
      )}
      <span>{message}</span>
    </div>
  );
};

export default StatusIndicator;
