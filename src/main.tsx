import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { storageKey } from './mocks'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App key={storageKey} />
  </StrictMode>,
)
