import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } }); // Adjust CORS for your React Native app

mongoose.connect('mongodb://localhost:27017/sosApp', { useNewUrlParser: true, useUnifiedTopology: true });

// SOS Model
const sosSchema = new mongoose.Schema({
  userId: String,
  location: { lat: Number, lng: Number },
  isActive: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});
const ActiveSOS = mongoose.model('ActiveSOS', sosSchema);

app.use(express.json());

// API to trigger SOS
app.post('/sos', async (req, res) => {
  const { userId, lat, lng } = req.body;
  const sos = await ActiveSOS.findOneAndUpdate(
    { userId },
    { location: { lat, lng }, updatedAt: Date.now(), isActive: true },
    { upsert: true, new: true }
  );
  io.emit('new-sos', sos); // Broadcast to all connected clients
  res.status(200).json({ message: 'SOS sent' });
});

// API to update location
app.post('/update-location', async (req, res) => {
  const { userId, lat, lng } = req.body;
  const sos = await ActiveSOS.findOneAndUpdate(
    { userId, isActive: true },
    { location: { lat, lng }, updatedAt: Date.now() }
  );
  if (sos) {
    io.emit('sos-update', { userId, lat, lng }); // Broadcast update
  }
  res.status(200).json({ message: 'Location updated' });
});

// API to cancel SOS
app.post('/cancel-sos', async (req, res) => {
  const { userId } = req.body;
  const sos = await ActiveSOS.findOneAndUpdate(
    { userId, isActive: true },
    { isActive: false },
    { new: true }
  );
  if (sos) {
    io.emit('sos-removed', { userId }); // Broadcast removal
    res.status(200).json({ message: 'SOS canceled' });
  } else {
    res.status(404).json({ message: 'No active SOS found' });
  }
});

// API to get active SOS
app.get('/active-sos', async (req, res) => {
  const active = await ActiveSOS.find({ isActive: true });
  res.json(active);
});

// Socket connection
io.on('connection', (socket) => {
  console.log('User connected');
  socket.on('disconnect', () => console.log('User disconnected'));
});

server.listen(10000, () => console.log('Server running on port 10000'));