/* eslint-disable no-undef */

/**
 * @format
 */

globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';

import App from './App';
import {name as appName} from './app.json';
import {saveNotification} from './src/services/notificationStorage';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background FCM Received:', JSON.stringify(remoteMessage));

  const title =
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.title ||
    'Notification';

  const body =
    remoteMessage?.notification?.body ||
    remoteMessage?.data?.body ||
    remoteMessage?.data?.message ||
    'No message';

  await saveNotification({
    id: remoteMessage?.messageId,
    title,
    message: body,
    type: remoteMessage?.data?.type || 'info',
    timestamp: new Date().toISOString(),
  });
  
});

AppRegistry.registerComponent(appName, () => App);