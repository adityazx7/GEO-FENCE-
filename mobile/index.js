import "@expo/metro-runtime";
import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

console.log("INDEX.JS BOOTING...");
console.log("IMPORTS DONE, LOADING APP...");
console.log("APP LOADED, REGISTERING...");

// For web, ensure the root element has a non-zero height
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root, [data-contents="true"] {
      height: 100%;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
  `;
  document.head.appendChild(style);
}

registerRootComponent(App);

