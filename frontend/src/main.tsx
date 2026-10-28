import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { loadConfig } from './lib/api'
	import '@fontsource-variable/bricolage-grotesque'
	import '@fontsource-variable/manrope'
import './styles.css'

const ready = import.meta.env.VITE_PULSEPOLL_MODE === 'live' ? loadConfig() : Promise.resolve()
ready.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
