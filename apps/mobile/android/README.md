# Android

Android native project for the DevCard React Native mobile app.

## Prerequisites

- Node.js `>= 22.11.0`
- Android Studio with Android SDK and emulator installed
- Java version supported by the installed Android Gradle Plugin
- Dependencies installed from `apps/mobile` with npm

## Run On Android

From `apps/mobile`, start Metro in one terminal:

```cmd
npx react-native start --reset-cache
```

In a second terminal, run the app:

```cmd
cd /d D:\DC\apps\mobile
npx react-native run-android -- --active-arch-only
```

`--active-arch-only` keeps local emulator builds faster by building only the active emulator/device architecture.

## Gradle Commands

Run these from `apps/mobile/android`:

```cmd
gradlew.bat app:packageDebug --stacktrace -PreactNativeArchitectures=x86_64
```

```cmd
gradlew.bat app:installDebug -PreactNativeArchitectures=x86_64
```

The project currently sets `reactNativeArchitectures=x86_64` in `gradle.properties` for faster local Windows emulator builds. Use a CLI override when building for another device architecture, for example:

```cmd
gradlew.bat app:packageDebug -PreactNativeArchitectures=arm64-v8a
```

## Troubleshooting

If Metro reports `ENOENT` for `D:\packages`, check `apps/mobile/metro.config.js`. The monorepo root should resolve to `D:\DC`, not `D:\`.

If Gradle fails at `:app:packageDebug`, rerun with `--stacktrace`:

```cmd
gradlew.bat app:packageDebug --stacktrace -PreactNativeArchitectures=x86_64
```

If Android builds are very slow, avoid building all ABIs during local development. Use `--active-arch-only` through React Native CLI or pass `-PreactNativeArchitectures=x86_64` to Gradle.

If Windows reports paths longer than 260 characters, enable long paths from an Administrator PowerShell:

```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```
