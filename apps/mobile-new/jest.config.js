module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((react-native|@react-native|@react-navigation|@gorhom)/|\\.pnpm/(react-native|@react-native|@react-navigation|@gorhom)[^/]*))',
  ],
};
