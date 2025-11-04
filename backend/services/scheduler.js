// backend/services/scheduler.js
const notificationService = require('./notificationService');

class NotificationScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the notification scheduler
   * Checks every 6 hours by default
   */
  start(intervalHours = 6) {
    if (this.isRunning) {
      console.log('⚠️ Scheduler already running');
      return;
    }

    console.log(`🕐 Starting notification scheduler (checks every ${intervalHours} hours)`);
    
    // Run immediately on start
    this.runCheck();
    
    // Then run every X hours
    const intervalMs = intervalHours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runCheck();
    }, intervalMs);
    
    this.isRunning = true;
    console.log('✅ Notification scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Notification scheduler stopped');
    }
  }

  /**
   * Run notification check
   */
  async runCheck() {
    try {
      console.log('\n=== NOTIFICATION CHECK START ===');
      console.log('Time:', new Date().toISOString());
      
      await notificationService.checkAndSendExpiryNotifications();
      
      console.log('=== NOTIFICATION CHECK END ===\n');
    } catch (error) {
      console.error('❌ Error in scheduler check:', error);
    }
  }

  /**
   * Manual trigger (for testing)
   */
  async triggerNow() {
    console.log('🔔 Manual notification check triggered');
    await this.runCheck();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextCheck: this.isRunning 
        ? 'Every 6 hours' 
        : 'Not scheduled'
    };
  }
}

module.exports = new NotificationScheduler();