const React = require('react');
const { View } = require('react-native');

const ViewShot = React.forwardRef(({ children }, _ref) =>
  React.createElement(View, null, children)
);

module.exports = {
  __esModule: true,
  default: ViewShot,
  captureRef: jest.fn().mockResolvedValue('file://mock-screenshot.png'),
  captureScreen: jest.fn().mockResolvedValue('file://mock-screenshot.png'),
};
