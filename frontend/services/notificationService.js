// frontend/services/notificationService.js - PRODUCTION ERROR HANDLING
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Register for push notifications
   * Call this when user logs in
   */
  async registerForPushNotifications(userId) {
    try {
      console.log('📱 Registering for push notifications...');
      console.log('Platform:', Platform.OS);

      // WEB: Push notifications don't work properly on web in development
      if (Platform.OS === 'web') {
        console.warn('⚠️ Push notifications are not fully supported on web');
        console.warn('   Notifications will work on mobile devices (iOS/Android)');
        return null;
      }

      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications only work on physical devices');
        console.warn('   Emulators/simulators do not support push notifications');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permission not granted');
        console.warn('   User can enable notifications in device settings');
        return null;
      }

      console.log('✅ Notification permissions granted');

      // Get Expo push token
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id-here' // Replace with your EAS project ID from app.json
        });
        const token = tokenData.data;
        
        console.log('📱 Expo Push Token:', token);

        // Save token to Firestore
        await this.saveTokenToFirestore(userId, token);

        // Configure Android channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3B82F6',
          });
          console.log('✅ Android notification channel configured');
        }

        return token;
      } catch (tokenError) {
        console.error('❌ Error getting push token:', tokenError.message);
        
        // User-friendly error handling
        if (tokenError.message.includes('VAPID')) {
          console.warn('⚠️ Web push notifications require additional setup');
          console.warn('   This is expected in development. Mobile will work fine.');
        } else if (tokenError.message.includes('projectId')) {
          console.warn('⚠️ Missing EAS project ID in app.json');
          console.warn('   Add your project ID to extra.eas.projectId in app.json');
        } else {
          console.warn('⚠️ Failed to get push token:', tokenError.message);
        }
        
        return null;
      }
    } catch (error) {
      console.error('❌ Error in registerForPushNotifications:', error.message);
      
      // Don't throw - just log and return null
      // This prevents app crashes from notification setup failures
      return null;
    }
  }

  /**
   * Save FCM token to Firestore
   */
  async saveTokenToFirestore(userId, token) {
    try {
      console.log('💾 Saving token to Firestore...');
      
      await setDoc(
        doc(db, 'users', userId),
        {
          fcmToken: token,
          tokenUpdatedAt: new Date().toISOString(),
          platform: Platform.OS,
          deviceType: Device.isDevice ? 'physical' : 'emulator',
        },
        { merge: true }
      );

      console.log('✅ Token saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving token to Firestore:', error.message);
      // Don't throw - notification setup is not critical for app function
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners() {
    // Skip on web platform
    if (Platform.OS === 'web') {
      console.log('⚠️ Notification listeners not supported on web');
      return;
    }

    console.log('🎧 Setting up notification listeners...');

    try {
      // Notification received while app is foregrounded
      this.notificationListener = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('🔔 Notification received:', notification.request.content.title);
          // You can show custom UI here
        }
      );

      // User tapped on notification
      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          console.log('👆 Notification tapped');
          const data = response.notification.request.content.data;
          
          // Handle navigation based on notification type
          if (data.type === 'expiry_warning' || data.type === 'daily_expiry') {
            console.log('Navigate to product:', data.productId);
            // TODO: Implement navigation to specific product
          } else if (data.type === 'weekly_summary') {
            console.log('Navigate to items list');
            // TODO: Implement navigation to items tab
          }
        }
      );

      console.log('✅ Notification listeners set up');
    } catch (error) {
      console.error('❌ Error setting up listeners:', error.message);
    }
  }

  /**
   * Clean up listeners
   */
  removeNotificationListeners() {
    try {
      if (this.notificationListener) {
        Notifications.removeNotificationSubscription(this.notificationListener);
        this.notificationListener = null;
      }
      if (this.responseListener) {
        Notifications.removeNotificationSubscription(this.responseListener);
        this.responseListener = null;
      }
      console.log('🧹 Notification listeners removed');
    } catch (error) {
      console.error('❌ Error removing listeners:', error.message);
    }
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleTestNotification() {
    // Skip on web
    if (Platform.OS === 'web') {
      console.warn('⚠️ Local notifications not supported on web');
      return null;
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from AI Food Tracker',
          data: { type: 'test' },
        },
        trigger: {
          seconds: 2,
        },
      });

      console.log('✅ Test notification scheduled:', id);
      return id;
    } catch (error) {
      console.error('❌ Error scheduling test notification:', error.message);
      return null;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🧹 All scheduled notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling notifications:', error.message);
    }
  }

  /**
   * Check if notifications are supported and enabled
   */
  async getNotificationStatus() {
    try {
      if (Platform.OS === 'web') {
        return {
          supported: false,
          enabled: false,
          message: 'Notifications not supported on web'
        };
      }

      if (!Device.isDevice) {
        return {
          supported: false,
          enabled: false,
          message: 'Notifications only work on physical devices'
        };
      }

      const { status } = await Notifications.getPermissionsAsync();
      
      return {
        supported: true,
        enabled: status === 'granted',
        status: status,
        message: status === 'granted' 
          ? 'Notifications enabled' 
          : 'Notifications not enabled'
      };
    } catch (error) {
      return {
        supported: false,
        enabled: false,
        message: error.message
      };
    }
  }
}

export default new NotificationService();