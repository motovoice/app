const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const withForegroundService = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    mainApplication['service'] = mainApplication['service'] || [];

    // Add foreground service type override for Notifee's ForegroundService
    const alreadyAdded = mainApplication['service'].some(
      (s) => s.$?.['android:name'] === 'app.notifee.core.ForegroundService'
    );

    if (!alreadyAdded) {
      mainApplication['service'].push({
        $: {
          'android:name': 'app.notifee.core.ForegroundService',
          'android:foregroundServiceType': 'microphone',
          'tools:replace': 'android:foregroundServiceType',
        },
      });
    }

    return config;
  });
};

module.exports = withForegroundService;
