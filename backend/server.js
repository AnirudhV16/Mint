// backend/server.js - VERCEL COMPATIBLE WITH CRON SUPPORT
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// Import routes
const analyzeRoutes = require('./routes/analyze');
const recipeRoutes = require('./routes/recipe');
const ratingRoutes = require('./routes/rating');

const app = express();

// Initialize Firebase Admin
let db;
try {
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_PRIVATE_KEY || 
      !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing required Firebase environment variables');
  }

  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
    token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  // Only initialize if not already initialized (important for serverless)
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  db = admin.firestore();
  console.log('✅ Firebase Admin initialized');
  console.log('   Project ID:', process.env.FIREBASE_PROJECT_ID);
  
} catch (error) {
  console.warn('⚠️  Firebase Admin initialization failed:', error.message);
  console.warn('   Notification features will not work');
}

// Export getDb function to avoid circular dependency (FIX #1)
const getDb = () => db;
exports.getDb = getDb;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:19006'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or if wildcard is enabled
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend server running on Vercel',
    timestamp: new Date().toISOString(),
    firebase: admin.apps.length > 0 ? 'initialized' : 'not initialized',
    visionAPI: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'configured' : 'not configured',
    platform: 'vercel-serverless'
  });
});

// API Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/recipe', recipeRoutes);
app.use('/api/rating', ratingRoutes);

// Notification endpoint - Manual send
app.post('/api/notification/send', async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ 
        error: 'Firebase Admin not initialized',
        message: 'Firebase environment variables are required for notifications'
      });
    }

    const { token, title, body, data } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Device token is required' });
    }

    const message = {
      notification: {
        title: title || 'Food Tracker Notification',
        body: body || 'You have a new notification'
      },
      data: data || {},
      token: token
    };

    const response = await admin.messaging().send(message);
    
    res.json({ 
      success: true, 
      messageId: response,
      sentAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ 
      error: 'Failed to send notification', 
      details: error.message 
    });
  }
});

// CRON ENDPOINT - Called by Vercel Cron (FIX #3)
app.post('/api/notification/check-now', async (req, res) => {
  try {
    console.log('🔔 Daily notification check triggered');
    console.log('Time:', new Date().toISOString());
    
    if (!admin.apps.length) {
      return res.status(500).json({ 
        error: 'Firebase Admin not initialized'
      });
    }

    // Import notification service here to avoid circular dependency
    const notificationService = require('./services/notificationService');
    
    // Run the notification check
    await notificationService.checkAndSendExpiryNotifications();
    
    res.json({ 
      success: true,
      message: 'Daily notification check completed',
      timestamp: new Date().toISOString(),
      triggeredBy: 'vercel-cron'
    });
  } catch (error) {
    console.error('❌ Error in notification check:', error);
    res.status(500).json({ 
      error: 'Failed to run notification check',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path 
  });
});

// Export for Vercel serverless (FIX #2)
module.exports = app;