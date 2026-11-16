/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import { setLang } from '../../lib/store'
import NotSent from './NotSent'
import '../../globals.css'
import '../spec.css'

setLang('en')
createRoot(document.getElementById('root')!).render(<TooltipProvider delayDuration={300}><NotSent /></TooltipProvider>)
