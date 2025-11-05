import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';

class PermissionService {
  constructor() {
    this.permissions = {
      camera: false,
      photos: false,
      notifications: false
    };
  }


  async requestAllPermissions() {
    console.log(' Requesting all permissions...');
    
    const results = {
      camera: await this.requestCameraPermission(false),
      photos: await this.requestPhotoLibraryPermission(false),
      notifications: await this.requestNotificationPermission(false)
    };

    this.permissions = results;
    
    console.log(' Permissions check complete:', results);
    return results;
  }


  // Request Camera Permission

  async requestCameraPermission(showAlert = true) {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
        console.log(' Camera permission granted');
        return true;
      } else if (status === 'denied' && showAlert) {
        this.showPermissionDeniedAlert('Camera', 
          'To take photos of product labels, please enable camera access in your device settings.'
        );
      }
      
      return false;
    } catch (error) {
      console.error(' Error requesting camera permission:', error);
      return false;
    }
  }


  //Request Photo Library Permission

  async requestPhotoLibraryPermission(showAlert = true) {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status === 'granted') {
        console.log(' Photo library permission granted');
        return true;
      } else if (status === 'denied' && showAlert) {
        this.showPermissionDeniedAlert('Photos', 
          'To select product images from your gallery, please enable photo library access in your device settings.'
        );
      }
      
      return false;
    } catch (error) {
      console.error(' Error requesting photo library permission:', error);
      return false;
    }
  }


  // Request Notification Permission

  async requestNotificationPermission(showAlert = true) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        console.log(' Notification permission granted');
        return true;
      } else if (finalStatus === 'denied' && showAlert) {
        this.showPermissionDeniedAlert('Notifications', 
          'To receive expiry alerts and reminders, please enable notifications in your device settings.'
        );
      }
      
      return false;
    } catch (error) {
      console.error(' Error requesting notification permission:', error);
      return false;
    }
  }


  // Check if permission is granted

  async checkPermission(permissionType) {
    try {
      switch (permissionType) {
        case 'camera':
          const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
          return cameraStatus.status === 'granted';
          
        case 'photos':
          const photosStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
          return photosStatus.status === 'granted';
          
        case 'notifications':
          const notifStatus = await Notifications.getPermissionsAsync();
          return notifStatus.status === 'granted';
          
        default:
          return false;
      }
    } catch (error) {
      console.error(` Error checking ${permissionType} permission:`, error);
      return false;
    }
  }


  // Get all permission statuses

  async getAllPermissionStatuses() {
    const statuses = {
      camera: await this.checkPermission('camera'),
      photos: await this.checkPermission('photos'),
      notifications: await this.checkPermission('notifications')
    };
    
    console.log('📊 Current permission statuses:', statuses);
    return statuses;
  }


  showPermissionDeniedAlert(permissionName, message) {
    Alert.alert(
      `${permissionName} Access Required`,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Open Settings',
          onPress: () => this.openSettings()
        }
      ]
    );
  }


  openSettings() {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }


  showPermissionExplanation() {
    Alert.alert(
      '📱 App Permissions',
      'AI Food Tracker needs the following permissions:\n\n' +
      '📷 Camera - Take photos of product labels\n' +
      '🖼️ Photos - Select images from your gallery\n' +
      '🔔 Notifications - Receive expiry alerts\n\n' +
      'All permissions are optional but improve your experience.',
      [
        {
          text: 'Got It',
          style: 'default'
        }
      ]
    );
  }

  async requestPermissionWithExplanation(permissionType) {
    const explanations = {
      camera: {
        title: '📷 Camera Access',
        message: 'We need camera access to take photos of product labels for AI analysis. Your photos are processed securely and only stored if you choose to save them.'
      },
      photos: {
        title: '🖼️ Photo Library Access',
        message: 'We need photo library access so you can select existing product images for analysis. We only access photos you explicitly select.'
      },
      notifications: {
        title: '🔔 Notification Access',
        message: 'We need notification access to send you timely alerts about expiring food items, helping you reduce waste and save money.'
      }
    };

    const explanation = explanations[permissionType];
    
    return new Promise((resolve) => {
      Alert.alert(
        explanation.title,
        explanation.message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Allow',
            onPress: async () => {
              let result = false;
              switch (permissionType) {
                case 'camera':
                  result = await this.requestCameraPermission(true);
                  break;
                case 'photos':
                  result = await this.requestPhotoLibraryPermission(true);
                  break;
                case 'notifications':
                  result = await this.requestNotificationPermission(true);
                  break;
              }
              resolve(result);
            }
          }
        ]
      );
    });
  }


  async ensurePermission(permissionType, showExplanation = true) {
    const hasPermission = await this.checkPermission(permissionType);
    
    if (hasPermission) {
      return true;
    }

    if (showExplanation) {
      return await this.requestPermissionWithExplanation(permissionType);
    } else {
      switch (permissionType) {
        case 'camera':
          return await this.requestCameraPermission(true);
        case 'photos':
          return await this.requestPhotoLibraryPermission(true);
        case 'notifications':
          return await this.requestNotificationPermission(true);
        default:
          return false;
      }
    }
  }
}

export default new PermissionService();