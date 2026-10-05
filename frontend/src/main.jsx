import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { VaultProvider } from './VaultContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VaultProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </VaultProvider>
  </React.StrictMode>,
)