import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Check if running inside an iframe or dev environment to log appropriately
    const isIframe = window.self !== window.top;
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('PWA Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        if (isIframe) {
          console.warn('PWA Service Worker registration skipped or failed in iframe environment:', err.message);
        } else {
          console.warn('PWA Service Worker registration failed (this is normal in development environments):', err.message);
        }
      });
  });
}

