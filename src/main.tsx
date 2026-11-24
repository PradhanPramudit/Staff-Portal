import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ensureInitialized } from './lib/storage';
import './index.css';

// Auto-seed with realistic sample data on first visit
ensureInitialized().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
