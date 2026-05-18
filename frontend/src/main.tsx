import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import 'katex/dist/katex.min.css'
import './styles/global.css'
import './styles/markdown.css'
import './styles/quiz.css'
import './styles/labs.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
