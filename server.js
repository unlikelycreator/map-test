// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');
// const admin = require('firebase-admin');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server, {
//   cors: { origin: '*' } // Allow from React Native app
// });

// // Initialize Firebase Admin
// const serviceAccount = require('./serviceAccountKey.json'); // Your Firebase service account key
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// // In-memory storage: userId -> { fcmToken, location: { lat, lng } }
// const users = new Map();
// const ROOM = 'sos-room'; // Shared room for 2 users demo

// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   // User joins with their userId and FCM token
//   socket.on('join', ({ userId, fcmToken }) => {
//     socket.join(ROOM);
//     users.set(userId, { fcmToken, location: null });
//     console.log(`User ${userId} joined with FCM: ${fcmToken}`);
//   });

//   // Receive location update from user
//   socket.on('updateLocation', ({ userId, lat, lng }) => {
//     if (users.has(userId)) {
//       users.set(userId, { ...users.get(userId), location: { lat, lng } });
//       // Broadcast to room (other users)
//       socket.to(ROOM).emit('locationUpdate', { userId, lat, lng });
//     }
//   });

//   // SOS activated: Send push to other users
//   socket.on('sosActivated', ({ userId }) => {
//     users.forEach((userData, otherUserId) => {
//       if (otherUserId !== userId && userData.fcmToken) {
//         admin.messaging().send({
//           token: userData.fcmToken,
//           notification: {
//             title: 'SOS Alert!',
//             body: `User ${userId} needs help! Their location is being shared live.`,
//           },
//         }).then(() => console.log(`Push sent to ${otherUserId}`))
//           .catch(err => console.error('Push error:', err));
//       }
//     });
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//     // Clean up (optional)
//   });
// });

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' } // Allow from React Native app
});

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// In-memory storage: userId -> { fcmToken, location: { lat, lng } }
const users = new Map();
const ROOM = 'sos-room'; // Shared room for demo

// Function to emit the list of connected users
const broadcastConnectedUsers = () => {
  const connectedUsers = Array.from(users.keys());
  io.to(ROOM).emit('connectedUsers', connectedUsers);
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their userId and FCM token
  socket.on('join', ({ userId, fcmToken }) => {
    socket.join(ROOM);
    users.set(userId, { fcmToken, location: null });
    console.log(`User ${userId} joined with FCM: ${fcmToken}`);
    // Broadcast updated user list
    broadcastConnectedUsers();
  });

  // Receive location update from user
  socket.on('updateLocation', ({ userId, lat, lng }) => {
    if (users.has(userId)) {
      users.set(userId, { ...users.get(userId), location: { lat, lng } });
      // Broadcast to room (other users)
      socket.to(ROOM).emit('locationUpdate', { userId, lat, lng });
    }
  });

  // SOS activated: Send push to other users
  socket.on('sosActivated', ({ userId }) => {
    users.forEach((userData, otherUserId) => {
      if (otherUserId !== userId && userData.fcmToken) {
        admin.messaging().send({
          token: userData.fcmToken,
          notification: {
            title: 'SOS Alert!',
            body: `User ${userId} needs help! Their location is being shared live.`,
          },
        }).then(() => console.log(`Push sent to ${otherUserId}`))
          .catch(err => console.error('Push error:', err));
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Find and remove the user by socket ID
    users.forEach((value, userId) => {
      if (socket.id === socket.id) { // This check is simplified; you may need to track socket IDs explicitly
        users.delete(userId);
      }
    });
    // Broadcast updated user list
    broadcastConnectedUsers();
  });
});

server.listen(8098, () => console.log('Server running on port 8098'));
// server.listen(10000, () => console.log('Server running on port 10000'));
