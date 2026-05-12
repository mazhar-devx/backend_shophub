const app = require('./api/index');
const http = require('http');
const { Server } = require('socket.io');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://shophub.pro", "https://www.shophub.pro"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active users (optional, but good for cleanup)
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('cursor-move', (data) => {
    // Broadcast movement to all other clients
    socket.broadcast.emit('cursor-move', {
      id: socket.id,
      ...data
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    socket.broadcast.emit('user-offline', socket.id);
    activeUsers.delete(socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server with Socket.io running on port ${PORT}`);
});
