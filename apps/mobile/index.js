import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent handles mounting and bootstrapping the app
// on both native mobile devices (Expo Go) and web browsers seamlessly.
registerRootComponent(App);
