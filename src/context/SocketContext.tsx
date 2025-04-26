'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = async () => {
      try {
        console.log('Initializing socket connection...');

        // Make a request to initialize the socket server
        try {
          const response = await fetch('/api/socket');
          console.log('Socket server initialization response:', response.status);
        } catch (error) {
          console.error('Error initializing socket server:', error);
          // Continue anyway, as the server might already be initialized
        }

        // Create socket with improved reliability options
        const socketInstance = io(window.location.origin, {
          path: '/api/socket',
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          autoConnect: true,
          forceNew: false, // Don't force new connection to allow reusing existing one
          transports: ['polling', 'websocket'] // Start with polling for better compatibility
        });

        console.log('Socket instance created');

        socketInstance.on('connect', () => {
          console.log('Socket connected with ID:', socketInstance.id);
          setIsConnected(true);
        });

        socketInstance.on('disconnect', (reason) => {
          console.log('Socket disconnected, reason:', reason);
          setIsConnected(false);

          // Automatically try to reconnect on certain disconnect reasons
          if (reason === 'io server disconnect' || reason === 'transport close') {
            console.log('Attempting to reconnect...');
            socketInstance.connect();
          }
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          // Try to reconnect with polling if websocket fails
          console.log('Falling back to polling transport');
          // Reconnect with polling transport
          socketInstance.io.opts.transports = ['polling'];
          socketInstance.connect();
        });

        socketInstance.on('reconnect', (attemptNumber) => {
          console.log('Socket reconnected after', attemptNumber, 'attempts');
          setIsConnected(true);
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
          console.log('Socket reconnection attempt:', attemptNumber);
        });

        socketInstance.on('reconnect_error', (error) => {
          console.error('Socket reconnection error:', error);
        });

        socketInstance.on('reconnect_failed', () => {
          console.error('Socket failed to reconnect');
        });

        // Set socket in state
        setSocket(socketInstance);

        return socketInstance;
      } catch (error) {
        console.error('Socket initialization error:', error);
        return null;
      }
    };

    let socketInstance: Socket | null = null;

    initSocket().then(instance => {
      socketInstance = instance;
    });

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        console.log('Cleaning up socket connection');
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
