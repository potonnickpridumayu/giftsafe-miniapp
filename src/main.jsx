import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'
import { Buffer } from 'buffer'
window.Buffer = Buffer

import { TonConnectUIProvider } from '@tonconnect/ui-react';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl="https://giftsafe.pages.dev/tonconnect-manifest.json">
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
)

