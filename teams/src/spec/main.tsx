import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import { setLang } from '../lib/store'
import SpecApp from './SpecApp'
import '../globals.css'
import './spec.css'

// the screenshots are in English, so the live tags and copy on the page are too
setLang('en')
createRoot(document.getElementById('root')!).render(
  <TooltipProvider delayDuration={300}><SpecApp /></TooltipProvider>,
)
