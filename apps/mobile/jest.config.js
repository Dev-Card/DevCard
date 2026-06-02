module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((react-native|@react-native|@react-navigation|@gorhom)/|\\.pnpm/(react-native|@react-native|@react-navigation|@gorhom)[^/]*))',
  ],
  moduleNameMapper: {
  '^react-native-draggable-flatlist$':
    '<rootDir>/__mocks__/react-native-draggable-flatlist.js',

  '^react-native-view-shot$':
    '<rootDir>/__mocks__/react-native-view-shot.js',

  '^react-native-camera-kit$':
    '<rootDir>/__mocks__/react-native-camera-kit.js',
},
};
