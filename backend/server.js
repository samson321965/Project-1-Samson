const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000', // local React dev server
  process.env.FRONTEND_URL, // set this in Render backend env vars
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json()); // Parse JSON bodies

app.get('/', (req, res) => {
  res.send('HealthSphere API is running');
});

// API Status routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'HealthSphere API is running' });
});

// Import API routes
const routes = require('./src/routes');
app.use('/api', routes);

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
