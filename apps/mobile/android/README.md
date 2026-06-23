# DevCard Android

Native Android project for the DevCard React Native app.

Use this folder for Android-specific Gradle builds, native configuration, emulator installs, and troubleshooting. For normal development, run commands from `apps/mobile` unless a command below says otherwise.

## Quick Start

Start Metro from `apps/mobile`:

```cmd
npx react-native start --reset-cache
```

Open a second terminal and run the Android app:

```cmd
cd /d D:\DC\apps\mobile
npx react-native run-android -- --active-arch-only
```

`--active-arch-only` builds only the connected emulator/device architecture, which is much faster during local development.

## Requirements

- Node.js `>= 22.11.0`
- Android Studio with Android SDK and emulator support
- Java version compatible with the Android Gradle Plugin used by this project
- npm dependencies installed from `apps/mobile`
- An Android emulator running, or a physical device connected with USB debugging enabled

Install mobile dependencies from `apps/mobile`:

```cmd
npm install --legacy-peer-deps
```

## Useful Gradle Commands

Run these from `apps/mobile/android`.

Build a debug APK:

```cmd
gradlew.bat app:packageDebug -PreactNativeArchitectures=x86_64
```

Install the debug build on a connected emulator/device:

```cmd
gradlew.bat app:installDebug -PreactNativeArchitectures=x86_64
```

Get detailed output for a failing build:

```cmd
gradlew.bat app:packageDebug --stacktrace -PreactNativeArchitectures=x86_64
```

## Architecture Builds

`gradle.properties` currently sets:

```properties
reactNativeArchitectures=x86_64
```

This keeps Windows emulator builds smaller and faster. Override it when targeting another device architecture:

```cmd
gradlew.bat app:packageDebug -PreactNativeArchitectures=arm64-v8a
```

Use all common Android ABIs only when needed:

```cmd
gradlew.bat app:packageDebug -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
```

## Troubleshooting

### Metro Watches `D:\packages`

If Metro reports `ENOENT` for `D:\packages`, check `apps/mobile/metro.config.js`. The monorepo root should resolve to `D:\DC`, not `D:\`.

### Gradle Fails At `:app:packageDebug`

Rerun the package task with `--stacktrace` so the real error appears:

```cmd
gradlew.bat app:packageDebug --stacktrace -PreactNativeArchitectures=x86_64
```

### Builds Are Slow

Use one of these faster local options:

- `npx react-native run-android -- --active-arch-only`
- `gradlew.bat app:packageDebug -PreactNativeArchitectures=x86_64`

Avoid building every ABI unless you are preparing a broader test or release build.

### Windows Long Path Errors

If Windows reports paths longer than 260 characters, enable long paths from an Administrator PowerShell:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

Restart the terminal after changing this setting.
