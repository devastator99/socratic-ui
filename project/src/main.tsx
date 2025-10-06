import React from 'react';
import { AppRegistry } from 'react-native';
import { createRoot } from 'react-dom/client';
import App from '../App';
import './global.css';

// Register the app name for React Native Web
AppRegistry.registerComponent('main', () => App);

// Render the application to the DOM
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = createRoot(rootElement);
root.render(<App />);
