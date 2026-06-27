import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { PlaybackProvider } from './context/PlaybackContext.jsx'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PlaybackProvider>
      <App />
    </PlaybackProvider>
  </React.StrictMode>,
)
