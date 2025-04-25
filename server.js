const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  // Store active users
  const activeUsers = new Map();
  // Store waiting users
  const waitingUsers = [];

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Add user to waiting list when they're ready to match
    socket.on('ready', () => {
      console.log(`User ready: ${socket.id}`);
      
      // If there's someone waiting, match them
      if (waitingUsers.length > 0) {
        const partnerId = waitingUsers.shift();
        
        if (partnerId && io.sockets.sockets.get(partnerId)) {
          // Set up the match
          activeUsers.set(socket.id, partnerId);
          activeUsers.set(partnerId, socket.id);
          
          // Notify both users about the match
          socket.emit('matched', { partnerId });
          io.to(partnerId).emit('matched', { partnerId: socket.id });
          
          console.log(`Matched ${socket.id} with ${partnerId}`);
        } else {
          // If partner is no longer available, add current user to waiting list
          waitingUsers.push(socket.id);
        }
      } else {
        // No one waiting, add to waiting list
        waitingUsers.push(socket.id);
        socket.emit('waiting');
      }
    });

    // Handle skip - find a new match
    socket.on('skip', () => {
      const partnerId = activeUsers.get(socket.id);
      
      if (partnerId) {
        // Notify the partner they've been skipped
        io.to(partnerId).emit('skipped');
        
        // Remove the match
        activeUsers.delete(socket.id);
        activeUsers.delete(partnerId);
      }
      
      // Add user back to waiting list to find a new match
      waitingUsers.push(socket.id);
      socket.emit('waiting');
    });

    // Handle WebRTC signaling
    socket.on('signal', ({ to, signal }) => {
      io.to(to).emit('signal', {
        from: socket.id,
        signal,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      
      // If user was in a match, notify their partner
      const partnerId = activeUsers.get(socket.id);
      if (partnerId) {
        io.to(partnerId).emit('partnerDisconnected');
        activeUsers.delete(partnerId);
      }
      
      // Remove from active users
      activeUsers.delete(socket.id);
      
      // Remove from waiting list if present
      const waitingIndex = waitingUsers.indexOf(socket.id);
      if (waitingIndex !== -1) {
        waitingUsers.splice(waitingIndex, 1);
      }
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
