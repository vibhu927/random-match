'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/src/context/SocketContext';

interface UserCountData {
  total: number;
  waiting: number;
  chatting: number;
}

const UserCount: React.FC = () => {
  const { socket } = useSocket();
  const [userCount, setUserCount] = useState<UserCountData>({
    total: 0,
    waiting: 0,
    chatting: 0
  });

  useEffect(() => {
    if (!socket) return;

    // Listen for user count updates
    socket.on('userCount', (data: UserCountData) => {
      setUserCount(data);
    });

    return () => {
      socket.off('userCount');
    };
  }, [socket]);

  return (
    <div className="bg-gray-700 text-white rounded-lg p-3 shadow-lg border border-gray-600">
      <div className="text-center">
        <div className="text-xs uppercase tracking-wider mb-1 text-lavender-300">Online Now</div>
        <div className="text-2xl font-bold text-white">{userCount.total}</div>
        <div className="flex justify-center mt-2 text-xs space-x-3">
          <div>
            <span className="text-gray-300">Waiting: </span>
            <span className="font-semibold text-lavender-300">{userCount.waiting}</span>
          </div>
          <div>
            <span className="text-gray-300">Chatting: </span>
            <span className="font-semibold text-lavender-300">{userCount.chatting}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCount;
