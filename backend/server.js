// backend/server.js - WITH NOTIFICATION SCHEDULER
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// Import routes
const analyzeRoutes = require('./routes/analyze');
const recipeRoutes = require('./routes/recipe');
const ratingRoutes = require('./routes/rating');

// Import notification services
const notificationScheduler = require('./services/scheduler');

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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  db = admin.firestore();
  
  console.log('✅ Firebase Admin initialized');
  console.log('   Project ID:', process.env.FIREBASE_PROJECT_ID);
  
  // Export db for notification service
  module.exports.db = db;
  
  // Start notification scheduler
  notificationScheduler.start(6); // Check every 6 hours
  
} catch (error) {
  console.warn('⚠️  Firebase Admin initialization failed:', error.message);
  console.warn('   Notification features will not work');
}

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
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
  const schedulerStatus = notificationScheduler.getStatus();
  
  res.json({ 
    status: 'ok', 
    message: 'Backend server is running',
    timestamp: new Date().toISOString(),
    firebase: admin.apps.length > 0 ? 'initialized' : 'not initialized',
    visionAPI: process.env.GOOGLE_CLOUD_PROJECT_ID ? 'configured' : 'not configured',
    notifications: {
      enabled: admin.apps.length > 0,
      scheduler: schedulerStatus
    }
  });
});

// API Routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/recipe', recipeRoutes);
app.use('/api/rating', ratingRoutes);

// Notification endpoints
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

// Manual trigger notification check (for testing)
app.post('/api/notification/check-now', async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ 
        error: 'Firebase Admin not initialized'
      });
    }

    console.log('🔔 Manual notification check triggered via API');
    await notificationScheduler.triggerNow();
    
    res.json({ 
      success: true,
      message: 'Notification check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in manual check:', error);
    res.status(500).json({ 
      error: 'Failed to run notification check',
      details: error.message
    });
  }
});

// Get notification scheduler status
app.get('/api/notification/status', (req, res) => {
  const status = notificationScheduler.getStatus();
  res.json({
    ...status,
    firebaseInitialized: admin.apps.length > 0,
    timestamp: new Date().toISOString()
  });
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

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log('🚀========================================🚀');
  console.log(`   Backend server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log('   CORS enabled for:', allowedOrigins.join(', '));
  console.log('   Environment: ', process.env.NODE_ENV || 'development');
  console.log('   Notifications: ', admin.apps.length > 0 ? '✅ ENABLED' : '❌ DISABLED');
  console.log('🚀========================================🚀');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  notificationScheduler.stop();
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  notificationScheduler.stop();
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});