// src/utils/firebaseNotification.js
import messaging from '@react-native-firebase/messaging';
import {Platform, Alert, PermissionsAndroid} from 'react-native';

class FirebaseNotificationService {
  // 1️⃣ পারমিশন রিকোয়েস্ট করা
  requestUserPermission = async () => {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ iOS notification permission granted');
      }
      return enabled;
    }

    // Android 13+ এর জন্য রানটাইম পারমিশন [citation:8]
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  };

  // 2️⃣ FCM Token সংগ্রহ করা
  getFCMToken = async () => {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('✅ FCM Token:', fcmToken);
        return fcmToken;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
    }
    return null;
  };

  // 3️⃣ Token Refresh Listener
  onTokenRefresh = callback => {
    return messaging().onTokenRefresh(async newToken => {
      console.log('🔄 Token refreshed:', newToken);
      if (callback) {
        callback(newToken);
      }
    });
  };

  // 4️⃣ Foreground এ Notification আসলে Handler (ফোরগ্রাউন্ড এ নিজে দেখাতে হবে) [citation:2]
  foregroundMessageListener = () => {
    return messaging().onMessage(async remoteMessage => {
      console.log('📨 Foreground notification received:', remoteMessage);

      // ফোরগ্রাউন্ড এ Alert দেখানো
      const {title, body} = remoteMessage.notification || {};
      if (title && body) {
        Alert.alert(title, body);
      }
    });
  };

  // 5️⃣ Background এ Notification আসলে Handler (ব্যাকগ্রাউন্ডে Auto দেখাবে)
  backgroundMessageListener = () => {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📨 Background notification received:', remoteMessage);
      // ব্যাকগ্রাউন্ডে নটিফিকেশন নিজেই দেখাবে, এখানে কিছু করার দরকার নেই
    });
  };

  // 6️⃣ Notification Tapped Handler (অ্যাপ ক্লোজ থাকা অবস্থায় notification tap করলে)
  notificationOpenedListener = callback => {
    return messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        '🔔 App opened from notification (background):',
        remoteMessage,
      );
      if (callback) {
        callback(remoteMessage);
      }
    });
  };

  // 7️⃣ Initial Notification (অ্যাপ সম্পূর্ণ ক্লোজ থাকা অবস্থায় tap করলে)
  getInitialNotification = async callback => {
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification && callback) {
      console.log(
        '🚀 App opened from notification (terminated):',
        initialNotification,
      );
      callback(initialNotification);
    }
    return initialNotification;
  };

  // 8️⃣ সবকিছু একসাথে Initialize
  initialize = async (onTokenRefreshCallback, onNotificationTapCallback) => {
    console.log('🚀 Initializing Firebase Notifications...');

    // পারমিশন চেক
    const hasPermission = await this.requestUserPermission();
    if (!hasPermission) {
      console.log('❌ Notification permission denied');
      return false;
    }

    // FCM Token পাওয়া
    const token = await this.getFCMToken();
    if (token && onTokenRefreshCallback) {
      onTokenRefreshCallback(token);
    }

    // Token Refresh Listener
    this.onTokenRefresh(newToken => {
      if (onTokenRefreshCallback) {
        onTokenRefreshCallback(newToken);
      }
    });

    // Foreground Listener
    this.foregroundMessageListener();

    // Background Listener
    this.backgroundMessageListener();

    // Notification Opened Listener
    if (onNotificationTapCallback) {
      this.notificationOpenedListener(onNotificationTapCallback);
      this.getInitialNotification(onNotificationTapCallback);
    }

    console.log('✅ Firebase Notifications ready!');
    return true;
  };
}

export default new FirebaseNotificationService();
