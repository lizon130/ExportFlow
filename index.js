/* eslint-disable no-undef */

/**
 * @format
 */

globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';

import App from './App';
import {name as appName} from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background FCM Received:', JSON.stringify(remoteMessage));
});

AppRegistry.registerComponent(appName, () => App);