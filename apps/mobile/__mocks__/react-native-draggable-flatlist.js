const React = require('react');

function DraggableFlatList(props) {
  return React.createElement('View', props, props.children);
}

module.exports = DraggableFlatList;
module.exports.ScaleDecorator = ({ children }) => children;