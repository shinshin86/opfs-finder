import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { setInspectedTabId } from './utils/rpc';

// Set the inspected tab ID for RPC
if (chrome.devtools?.inspectedWindow?.tabId) {
  setInspectedTabId(chrome.devtools.inspectedWindow.tabId);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
