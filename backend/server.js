/**
 * REMAKE ELECTRONICS - Main Server
 * Electronic component reuse and project recommendation platform
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Body Parsing Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable x-powered-by for security
app.disable('x-powered-by');

// Serve static assets from frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'REMAKE ELECTRONICS',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application routing fallback
app.get('*', (req, res, next) => {
  // If request is for an API route that wasn't matched, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found.'
    });
  }
  // Otherwise serve index.html
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Central Error Handling Middleware (Does not leak stack traces to client)
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'An internal server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`
=====================================================
⚡ REMAKE ELECTRONICS PLATFORM READY
=====================================================
URL: http://localhost:${PORT}
Concept: "Discover what your unused electronics can become."
Problem Statement: PS3 – SECONDLIFE Hackathon
Mode: ${process.env.NODE_ENV || 'development'}
SMTP: ${process.env.SMTP_HOST ? 'Configured (' + process.env.SMTP_HOST + ')' : 'Dev Mailbox Active'}
=====================================================
  `);
});

module.exports = app;
