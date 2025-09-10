import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } }); // Adjust CORS for your React Native app

mongoose.connect('mongodb+srv://iamhritikpawar:pawar2700@cluster0.jdd0dfh.mongodb.net/maptest?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// SOS Model
const sosSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  isActive: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});
// Optional: Auto-expire inactive SOS after 1 hour (adjust as needed)
sosSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600, partialFilterExpression: { isActive: false } });
const ActiveSOS = mongoose.model('ActiveSOS', sosSchema);

app.use(express.json());

// API to trigger SOS
app.post('/sos', async (req, res) => {
  const { userId, lat, lng } = req.body;
  if (!userId || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ message: 'Invalid data' });
  }
  try {
    const sos = await ActiveSOS.findOneAndUpdate(
      { userId },
      { location: { lat, lng }, updatedAt: Date.now(), isActive: true },
      { upsert: true, new: true }
    );
    io.emit('new-sos', sos); // Broadcast to all connected clients
    res.status(200).json({ message: 'SOS sent' });
  } catch (error) {
    console.error('SOS error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API to update location
app.post('/update-location', async (req, res) => {
  const { userId, lat, lng } = req.body;
  if (!userId || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ message: 'Invalid data' });
  }
  try {
    const sos = await ActiveSOS.findOneAndUpdate(
      { userId, isActive: true },
      { location: { lat, lng }, updatedAt: Date.now() }
    );
    if (sos) {
      io.emit('sos-update', { userId, lat, lng }); // Broadcast update
      res.status(200).json({ message: 'Location updated' });
    } else {
      res.status(404).json({ message: 'No active SOS' });
    }
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API to cancel SOS
app.post('/cancel-sos', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ message: 'Invalid data' });
  }
  try {
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
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API to get active SOS
app.get('/active-sos', async (req, res) => {
  try {
    const active = await ActiveSOS.find({ isActive: true });
    res.json(active);
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Socket connection
io.on('connection', (socket) => {
  console.log('User connected');
  socket.on('disconnect', () => console.log('User disconnected'));
});

server.listen(10000, () => console.log('Server running on port 10000'));
