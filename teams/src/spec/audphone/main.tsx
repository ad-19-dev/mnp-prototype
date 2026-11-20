/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import { setLang } from '../../lib/store'
import AudPhone from './AudPhone'
import '../../globals.css'
import '../spec.css'
import '../tagwhy/tagwhy.css'

setLang('en')
createRoot(document.getElementById('root')!).render(
  <TooltipProvider delayDuration={300}><AudPhone /></TooltipProvider>,
)
