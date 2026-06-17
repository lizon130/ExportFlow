import messaging from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import {PermissionsAndroid, Platform} from 'react-native';

const API_URL =
  'http://192.168.9.45:7000/api/Notification/save-fcm-notification-token';

export const registerFCMToken = async userData => {
  try {
    let androidPermission = true;

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      androidPermission = result === PermissionsAndroid.RESULTS.GRANTED;
      console.log('Android Notification Permission:', result);
    }

    const authStatus = await messaging().requestPermission();
    console.log('Firebase Permission Status:', authStatus);

    if (!androidPermission) {
      console.log('Notification permission denied');
      return null;
    }

    await messaging().registerDeviceForRemoteMessages();

    const fcmToken = await messaging().getToken();

    if (!fcmToken) {
      console.log('FCM token empty');
      return null;
    }

    console.log('FCM TOKEN:', fcmToken);

    const deviceName = await DeviceInfo.getDeviceName();

    const payload = {
      recId: 0,
      userId: Number(userData?.userId) || 0,
      userName: userData?.username || userData?.userName || '',
      fcmDeviceToken: fcmToken,
      deviceType: Platform.OS,
      deviceName: deviceName,
      deviceModelNumber: DeviceInfo.getModel(),
    };

    console.log('FCM Payload:', payload);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.text();

    console.log('Save FCM API Status:', response.status);
    console.log('Save FCM API Response:', result);

    return result;
  } catch (error) {
    console.log('Register FCM Token Error:', error);
    return null;
  }
};