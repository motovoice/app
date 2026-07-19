const { withMainApplication } = require('@expo/config-plugins');

const withLiveKitSetup = (config) => {
  return withMainApplication(config, (config) => {
    let src = config.modResults.contents;

    if (!src.includes('com.livekit.reactnative.LiveKitReactNative')) {
      src = src.replace(
        'import expo.modules.ExpoReactHostFactory',
        'import expo.modules.ExpoReactHostFactory\nimport com.livekit.reactnative.LiveKitReactNative'
      );
    }

    if (!src.includes('LiveKitReactNative.setup(this)')) {
      src = src.replace(
        'loadReactNative(this)',
        'LiveKitReactNative.setup(this)\n    loadReactNative(this)'
      );
    }

    config.modResults.contents = src;
    return config;
  });
};

module.exports = withLiveKitSetup;
