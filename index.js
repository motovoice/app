import notifee from 'react-native-notify-kit';

if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name ?? 'DOMException';
    }
  };
}

// Background/killed state events
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Background event:', type, detail.notification?.id);
});

// Android: keep the foreground service alive — promise must never resolve
notifee.registerForegroundService(() => new Promise(() => {}));

// URL Polyfill
require('react-native-url-polyfill/auto');

const { registerGlobals } = require('@livekit/react-native');
registerGlobals();

const { LogBox } = require('react-native');
LogBox.ignoreAllLogs(true);

require("./src/i18n");

const { debugLog } = require('./src/services/debugLog');
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  debugLog.log(isFatal ? 'fatal' : 'error', error?.message ?? error, {
    stack: error?.stack,
  });
  originalHandler?.(error, isFatal);
});

require('expo-router/entry');
