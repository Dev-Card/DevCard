const React = require('react');
const { View } = require('react-native');

module.exports = {
  __esModule: true,
  Camera: React.forwardRef((_props, _ref) => React.createElement(View, null)),
  CameraType: { Back: 'back', Front: 'front' },
  FlashMode: { Auto: 'auto', On: 'on', Off: 'off' },
};
