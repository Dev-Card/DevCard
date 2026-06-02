const React = require('react');
const { FlatList } = require('react-native');

// Minimal stub used in Jest tests only.
// DraggableFlatList exposes the same props as FlatList so this renders
// correctly in snapshot/render tests without the native gesture runtime.
const ScaleDecorator = ({ children }) =>
  React.createElement(React.Fragment, null, children);

module.exports = {
  __esModule: true,
  default: FlatList,
  ScaleDecorator,
};
