import { createRoot } from 'react-dom/client'
import { Toaster, TooltipProvider } from '@qijenchen/design-system'
import { setLang } from '../lib/store'
import SpecApp from './SpecApp'
import '../globals.css'
import './spec.css'

// the spec reads in Chinese; the screens start in Chinese too and can switch to English from the top bar
let saved: string | null = null
try { saved = localStorage.getItem('mnp-spec-lang') } catch { /* storage blocked */ }
setLang(saved === 'en' ? 'en' : 'zh')

createRoot(document.getElementById('root')!).render(
  <TooltipProvider delayDuration={400} skipDelayDuration={300}>
    <SpecApp />
    <Toaster position="top-center" />
  </TooltipProvider>,
)
