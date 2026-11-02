import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import { setLang } from '../lib/store'
import OptionsApp from './OptionsApp'
import '../globals.css'
import './options.css'

setLang('zh')

createRoot(document.getElementById('root')!).render(
  <TooltipProvider delayDuration={400} skipDelayDuration={300}>
    <OptionsApp />
  </TooltipProvider>,
)
