import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

// Define a more compatible type for the socket server
export type NextApiResponseWithSocket = NextApiResponse & {
  socket: any; // Using any to avoid type conflicts
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket.io already running');
    res.end();
    return;
  }

  console.log('Initializing Socket.io');
  const io = new SocketIOServer(res.socket.server, {
    path: '/api/socket',
    addTrailingSlash: false,
    // Add more reliable connection settings
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  res.socket.server.io = io;

  // Store active users
  const activeUsers = new Map();
  // Store waiting users
  let waitingUsers: string[] = [];

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Add user to waiting list when they're ready to match
    socket.on('ready', () => {
      console.log(`User ready: ${socket.id}`);

      // Remove this user from any existing matches
      const existingPartnerId = activeUsers.get(socket.id);
      if (existingPartnerId) {
        console.log(`User ${socket.id} was already in a match with ${existingPartnerId}, cleaning up`);
        activeUsers.delete(existingPartnerId);
        activeUsers.delete(socket.id);

        // Notify the existing partner they've been skipped
        const existingPartner = io.sockets.sockets.get(existingPartnerId);
        if (existingPartner) {
          existingPartner.emit('skipped');
        }
      }

      // Remove from waiting list if already there
      const waitingIndex = waitingUsers.indexOf(socket.id);
      if (waitingIndex !== -1) {
        waitingUsers.splice(waitingIndex, 1);
      }

      // If there's someone waiting, match them
      if (waitingUsers.length > 0) {
        // Find a valid partner
        let partnerId = null;

        // Try to find a valid partner
        while (waitingUsers.length > 0 && !partnerId) {
          const potentialPartnerId = waitingUsers.shift();

          // Check if the potential partner is still connected
          if (potentialPartnerId && io.sockets.sockets.get(potentialPartnerId)) {
            partnerId = potentialPartnerId;
          }
        }

        if (partnerId) {
          // Set up the match
          activeUsers.set(socket.id, partnerId);
          activeUsers.set(partnerId, socket.id);

          // Notify both users about the match
          socket.emit('matched', { partnerId });
          io.to(partnerId).emit('matched', { partnerId: socket.id });

          console.log(`Matched ${socket.id} with ${partnerId}`);
        } else {
          // No valid partners found, add current user to waiting list
          waitingUsers.push(socket.id);
          socket.emit('waiting');
        }
      } else {
        // No one waiting, add to waiting list
        waitingUsers.push(socket.id);
        socket.emit('waiting');
      }
    });

    // Handle skip - find a new match
    socket.on('skip', () => {
      console.log(`User ${socket.id} is skipping their current match`);
      const partnerId = activeUsers.get(socket.id);

      if (partnerId) {
        // Check if partner is still connected
        if (io.sockets.sockets.get(partnerId)) {
          console.log(`Notifying partner ${partnerId} they've been skipped`);
          // Notify the partner they've been skipped
          io.to(partnerId).emit('skipped');
        }

        // Remove the match
        activeUsers.delete(socket.id);
        activeUsers.delete(partnerId);
      }

      // Remove from waiting list if already there
      const waitingIndex = waitingUsers.indexOf(socket.id);
      if (waitingIndex !== -1) {
        waitingUsers.splice(waitingIndex, 1);
      }

      // Add user back to waiting list to find a new match
      waitingUsers.push(socket.id);
      socket.emit('waiting');

      // Immediately try to find a new match
      if (waitingUsers.length > 1) {
        // The user we just added is at the end, so we need to find someone else
        const otherUsers = waitingUsers.filter(id => id !== socket.id);
        if (otherUsers.length > 0) {
          // Find a valid partner
          let partnerId = null;

          // Try to find a valid partner
          for (let i = 0; i < otherUsers.length; i++) {
            const potentialPartnerId = otherUsers[i];

            // Check if the potential partner is still connected
            if (potentialPartnerId && io.sockets.sockets.get(potentialPartnerId)) {
              partnerId = potentialPartnerId;
              break;
            }
          }

          if (partnerId) {
            // Remove both users from waiting list
            waitingUsers = waitingUsers.filter(id => id !== socket.id && id !== partnerId);

            // Set up the match
            activeUsers.set(socket.id, partnerId);
            activeUsers.set(partnerId, socket.id);

            // Notify both users about the match
            socket.emit('matched', { partnerId });
            io.to(partnerId).emit('matched', { partnerId: socket.id });

            console.log(`Matched ${socket.id} with ${partnerId} after skip`);
          }
        }
      }
    });

    // Handle WebRTC signaling
    socket.on('signal', ({ to, signal }) => {
      console.log(`Signal from ${socket.id} to ${to}`, signal.type || 'candidate');

      // Check if the recipient exists
      if (io.sockets.sockets.get(to)) {
        io.to(to).emit('signal', {
          from: socket.id,
          signal,
        });
      } else {
        console.log(`Recipient ${to} not found, notifying sender`);
        // Notify the sender that the recipient is not available
        socket.emit('peerUnavailable', { peerId: to });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);

      // If user was in a match, notify their partner
      const partnerId = activeUsers.get(socket.id);
      if (partnerId) {
        console.log(`Notifying partner ${partnerId} about disconnection`);

        // Check if partner is still connected
        if (io.sockets.sockets.get(partnerId)) {
          io.to(partnerId).emit('partnerDisconnected');

          // Put the partner back in the waiting list
          waitingUsers.push(partnerId);
          io.to(partnerId).emit('waiting');
        }

        // Remove the match
        activeUsers.delete(partnerId);
        activeUsers.delete(socket.id);
      }

      // Remove from waiting list if present
      const waitingIndex = waitingUsers.indexOf(socket.id);
      if (waitingIndex !== -1) {
        waitingUsers.splice(waitingIndex, 1);
      }

      // Log current state
      console.log(`Active users: ${activeUsers.size}, Waiting users: ${waitingUsers.length}`);
    });
  });

  res.end();
}
