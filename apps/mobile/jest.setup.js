/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

global.__reanimatedWorkletInit = () => {};

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomSheetModalProvider: ({ children }: any) => <View>{children}</View>,
    BottomSheetModal: React.forwardRef(({ children }: any, _ref: any) => <View>{children}</View>),
    BottomSheetBackdrop: () => null,
    BottomSheetScrollView: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-qrcode-svg', () => 'QRCode');

jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
  openURL: jest.fn(),
}));

jest.mock('react-native/Libraries/Text/Text', () => 'Text');
jest.mock('react-native/Libraries/Components/TextInput/TextInput', () => 'TextInput');
jest.mock('react-native/Libraries/Image/Image', () => 'Image');

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: (Component) => Component,
  },
  createAnimatedComponent: (Component) => Component,
  useSharedValue: (value) => ({ value }),
  useAnimatedStyle: () => ({}),
  withTiming: (value) => value,
  withSpring: (value) => value,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  Easing: {},
}));

try {
  require.resolve('react-native/Libraries/Animated/NativeAnimatedHelper');
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  // Module path changed in newer React Native versions.
}
