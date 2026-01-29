import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

console.log('✅ Renderer main.tsx executing');
const rootElement = document.getElementById('root');
if (!rootElement) console.error('❌ Root element not found');

ReactDOM.createRoot(rootElement!).render(
  <App />
);