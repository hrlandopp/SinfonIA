import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { PlaybackProvider } from './context/PlaybackContext.jsx'
import UIPlayground from './sandbox/UIPlayground'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PlaybackProvider>
      <UIPlayground />
    </PlaybackProvider>
  </React.StrictMode>,
)
