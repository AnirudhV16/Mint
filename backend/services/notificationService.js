// backend/services/notificationService.js - FIXED FOR VERCEL
const admin = require('firebase-admin');

class NotificationService {
  constructor() {
    this.isInitialized = admin.apps.length > 0;
  }

  // Get db dynamically to avoid circular dependency (FIX #1)
  getDb() {
    if (!admin.apps.length) {
      throw new Error('Firebase not initialized');
    }
    return admin.firestore();
  }

  /**
   * Daily notification check - triggered by Vercel Cron
   */
  async checkAndSendExpiryNotifications() {
    if (!this.isInitialized) {
      console.warn('Firebase Admin not initialized');
      return;
    }

    try {
      console.log('🔔 Checking for expiry notifications...');
      
      const db = this.getDb();
      
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      
      console.log(`Found ${usersSnapshot.docs.length} user(s) to check`);
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const fcmToken = userData.fcmToken;

        if (!fcmToken) {
          console.log(`⚠️ User ${userId} has no FCM token`);
          continue;
        }

        // Get user's products
        const productsSnapshot = await db
          .collection('products')
          .where('userId', '==', userId)
          .get();

        const products = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log(`  User ${userId}: ${products.length} product(s)`);

        await this.processUserNotifications(userId, fcmToken, products);
      }

      console.log('✅ Notification check complete');
    } catch (error) {
      console.error('❌ Error in notification check:', error);
      throw error; // Throw so Vercel cron can log the error
    }
  }

  /**
   * Process notifications for a single user
   */
  async processUserNotifications(userId, fcmToken, products) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const db = this.getDb();

    // Get user's last notification timestamps
    const userDoc = await db.collection('users').doc(userId).get();
    const lastWeeklyCheck = userDoc.data()?.lastWeeklyCheck || null;
    const notificationHistory = userDoc.data()?.notificationHistory || {};

    // Send weekly reminder (every 7 days)
    const shouldSendWeekly = this.shouldSendWeeklyNotification(lastWeeklyCheck);

    if (shouldSendWeekly) {
      await this.sendWeeklySummary(fcmToken, products);
      await db.collection('users').doc(userId).update({
        lastWeeklyCheck: today.toISOString()
      });
      console.log(`  ✅ Sent weekly reminder to user ${userId}`);
    }

    // Check each product for expiry notifications
    for (const product of products) {
      const daysUntilExpiry = this.getDaysUntilExpiry(product.expDate);
      
      // 10-day warning (send once)
      if (daysUntilExpiry === 10) {
        const notificationKey = `${product.id}_10day`;
        if (!notificationHistory[notificationKey]) {
          await this.send10DayWarning(fcmToken, product);
          notificationHistory[notificationKey] = new Date().toISOString();
          console.log(`  ⏰ Sent 10-day warning for: ${product.name}`);
        }
      }

      // 5-day to expiry: send daily
      if (daysUntilExpiry >= 0 && daysUntilExpiry <= 5) {
        const notificationKey = `${product.id}_${daysUntilExpiry}day`;
        const lastSent = notificationHistory[notificationKey];
        
        // Check if we sent this notification today already
        if (!lastSent || !this.isSameDay(new Date(lastSent), today)) {
          await this.sendDailyExpiryWarning(fcmToken, product, daysUntilExpiry);
          notificationHistory[notificationKey] = new Date().toISOString();
          console.log(`  🚨 Sent ${daysUntilExpiry}-day warning for: ${product.name}`);
        }
      }
    }

    // Update notification history
    await db.collection('users').doc(userId).update({
      notificationHistory: notificationHistory
    });
  }

  /**
   * Send weekly reminder notification
   */
  async sendWeeklySummary(fcmToken, products) {
    const message = {
      notification: {
        title: '🗓️ Weekly Reminder',
        body: 'Time to check your food items! Review what\'s in your inventory.'
      },
      data: {
        type: 'weekly_reminder',
        totalItems: products.length.toString()
      },
      token: fcmToken
    };

    await this.sendNotification(message);
  }

  /**
   * Send 10-day warning
   */
  async send10DayWarning(fcmToken, product) {
    const message = {
      notification: {
        title: '⏰ Expiry Warning',
        body: `${product.name} expires in 10 days`
      },
      data: {
        type: 'expiry_warning',
        productId: product.id,
        daysLeft: '10'
      },
      token: fcmToken
    };

    await this.sendNotification(message);
  }

  /**
   * Send daily expiry warning (0-5 days)
   */
  async sendDailyExpiryWarning(fcmToken, product, daysLeft) {
    let title, body;

    if (daysLeft === 0) {
      title = '🚨 Expires Today!';
      body = `${product.name} expires TODAY!`;
    } else if (daysLeft === 1) {
      title = '⚠️ Expires Tomorrow';
      body = `${product.name} expires tomorrow!`;
    } else {
      title = '⏰ Expiring Soon';
      body = `${product.name} expires in ${daysLeft} days`;
    }

    const message = {
      notification: { title, body },
      data: {
        type: 'daily_expiry',
        productId: product.id,
        daysLeft: daysLeft.toString()
      },
      token: fcmToken
    };

    await this.sendNotification(message);
  }

  /**
   * Send notification via FCM
   */
  async sendNotification(message) {
    try {
      const response = await admin.messaging().send(message);
      console.log('✅ Notification sent:', response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Calculate days until expiry
   */
  getDaysUntilExpiry(expDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiry = new Date(expDate);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Helper: Check if should send weekly notification
   */
  shouldSendWeeklyNotification(lastWeeklyCheck) {
    if (!lastWeeklyCheck) return true;
    
    const lastCheck = new Date(lastWeeklyCheck);
    const today = new Date();
    
    const daysDiff = Math.floor((today - lastCheck) / (1000 * 60 * 60 * 24));
    
    return daysDiff >= 7;
  }

  /**
   * Helper: Check if two dates are same day
   */
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}

module.exports = new NotificationService();