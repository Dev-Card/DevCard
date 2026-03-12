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

## Architecture

- **Screens**: Located in `src/screens`
- **Navigation**: Managed via `src/navigation/MainTabs.tsx`
- **Context API**: Handles global authentication and token management
- **Theme**: Tokens are strictly defined in `src/theme/tokens.ts`
