/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import { setLang } from '../../lib/store'
import Delivery from './Delivery'
import '../../globals.css'
import '../spec.css'

setLang('en')
createRoot(document.getElementById('root')!).render(<TooltipProvider delayDuration={300}><Delivery /></TooltipProvider>)
