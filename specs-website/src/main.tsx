import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/ui/Toast';
import './index.css';

// Completely disable ALL console logs, warnings, errors, and debug noise in production
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
  console.table = noop;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
