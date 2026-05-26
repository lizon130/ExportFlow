/* eslint-disable no-undef */

/**
 * @format
 */

// index.js - Add this as the FIRST line
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
