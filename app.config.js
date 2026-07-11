export default {
  expo: {
    name: "MotoVoice",
    slug: "motovoice",
    version: process.env.APP_VERSION || "0.0.0",
    orientation: "portrait",
    icon: "./assets/android_icon.png",
    scheme: "motovoice",
    userInterfaceStyle: "dark",
    splash: {
      backgroundColor: "#0D0D0D"
    },
    android: {
      package: "de.motovoice.app",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: false,
          data: [
            {
              scheme: "motovoice"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      adaptiveIcon: {
        backgroundColor: "#ffffff"
      },
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_MICROPHONE",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.POST_NOTIFICATIONS"
      ]
    },
    ios: {
      bundleIdentifier: "de.motovoice.app",
      icon: "./assets/apple_icon.icon",
      infoPlist: {
        UIBackgroundModes: ["audio", "voip"],
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription:
          "MotoVoice needs microphone permissions to use it for voice chat.",
        NSCameraUsageDescription:
          "MotoVoice needs camera permissions to scan QR-Codes.",
        NSUserNotificationsUsageDescription:
          "MotoVoice needs permissions to display notifications about channel connection status."
      }
    },
    plugins: [
      ["expo-adi-registration", { token: process.env.ADI_TOKEN }],
      "./android-manifest.plugin",
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "MotoVoice needs camera permissions to scan QR-Codes."
        }
      ],
      [
        "expo-audio",
        {
          microphonePermission:
            "MotoVoice needs microphone permissions to use it for voice chat.",
          enableBackgroundPlayback: true,
          enableBackgroundRecording: true
        }
      ],
      [
        "expo-asset",
        {
          assets: ["./assets/icon_monochrome.png", "./assets/icon.png"]
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      minServerVersion: process.env.MIN_SERVER_VERSION || "1.0.0",
      router: {},
      eas: {
        projectId: "0a04c42c-e73f-4cb4-a193-28fa243396cb"
      }
    }
  }
};
