# BMS Timesheet — Mobile (Expo)

React Native version of the BMS timesheet justification app. Same flow as
the web build, with native gallery scan (no file-picker friction) and
native share sheet for sending the PDF to HR.

## Run on your phone

1. Install **Expo Go** on your iPhone or Android phone (App Store / Play Store).
2. From the `mobile/` directory:
   ```
   cd mobile
   npm install
   npx expo start
   ```
3. Scan the QR code with the Expo Go app (or with the iOS Camera app, then tap the notification).
4. The app loads on your phone over Wi-Fi with hot reload.

## Run on simulator (no real photos)

- iOS Simulator: press `i` in the Expo terminal (requires Xcode)
- Android Emulator: press `a` (requires Android Studio + a configured AVD)

The simulator lacks real photos, so the gallery scan will return empty.
Use a real phone for end-to-end testing.

## Architecture

- `App.js` — `react-navigation` stack + global providers
- `src/core/` — pure logic (parser classification, match algorithm, state)
- `src/screens/` — Import, Photos, Review, Export
- `src/components/` — UI primitives, tutorial bottom sheet, hidden PDF parser WebView
- `src/lib/` — gallery scan (expo-media-library), PDF export (expo-print)

## How PDF parsing works

`expo-print` and React Native have no native pdf.js equivalent. We host a
hidden `react-native-webview` running pdf.js (loaded from unpkg CDN) and
post the PDF in as base64. The web view does the same custom-font ASCII
shift and row classification as the web build, then posts rows back via
`postMessage`.

## How export works

`expo-print` accepts HTML and renders it to a PDF file. The HTML uses
Google Fonts' Sarabun via CDN. Photos are inlined as base64 data URLs so
the print engine can rasterise them without filesystem access.

## App-store distribution

For external distribution beyond Expo Go (production builds, App Store,
Play Store) use **EAS Build**:

```
npm install -g eas-cli
eas build --platform ios     # builds .ipa via cloud
eas build --platform android # builds .apk / .aab
```

Requires an Expo account (free) and, for iOS distribution, a paid Apple
Developer Program membership.
