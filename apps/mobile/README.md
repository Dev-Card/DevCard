# DevCard Mobile

The mobile application for DevCard, built with bare **React Native** and **React Navigation**.

This app provides:
- Profile and context card management
- Per-Platform OAuth Connections for silent API follows
- Advanced analytics for tracking profile views
- The Hybrid Follow Engine (API, WebView, Link)

## Getting Started

> **Note**: Make sure you have completed the [React Native Environment Setup](https://reactnative.dev/docs/environment-setup) guide before proceeding.

### Install Dependencies

```bash
pnpm install
```

### Start Metro Bundler

First, start Metro, the JavaScript bundler:

```bash
pnpm start
```

### Run on Android

In a new terminal:

```bash
pnpm android
```

### Run on iOS

For iOS, you must install CocoaPods dependencies first (Mac only):

```bash
cd ios && pod install && cd ..
pnpm ios
```

## NFC Tag Writing

The mobile app supports writing DevCard URLs to physical NFC tags.

### iOS NFC Entitlement Setup

NFC writing on iOS requires additional configuration:

1. Open `ios/DevCard/Info.plist` and add the following entries:

```xml
<key>NFCReaderUsageDescription</key>
<string>This app needs NFC access to write DevCard URLs to NFC tags.</string>
```

2. Enable the **Near Field Communication Tag Reading** capability in Xcode:
   - Open `ios/DevCard.xcworkspace` in Xcode
   - Select the DevCard target
   - Go to **Signing & Capabilities**
   - Click **+ Capability** and search for "Near Field Communication Tag Reading"
   - Add it to the target

3. Ensure your `ios/DevCard/DevCard.entitlements` file contains:

```xml
<key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
<array/>
```

4. Build and run on a physical iPhone (NFC is not available on the iOS simulator):
   ```bash
   pnpm ios --device
   ```

> **Note**: NFC writing requires iPhone XR/XS or newer running iOS 13+.

### Android NFC Setup

Android NFC writing works out of the box with `react-native-nfc-manager`. No additional configuration is needed beyond installing the dependency.

## Architecture

- **Screens**: Located in `src/screens`
- **Navigation**: Managed via `src/navigation/MainTabs.tsx`
- **Context API**: Handles global authentication and token management
- **Theme**: Tokens are strictly defined in `src/theme/tokens.ts`
