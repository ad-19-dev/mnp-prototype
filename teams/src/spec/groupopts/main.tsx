import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import GroupOptions from './GroupOptions'
import '../../globals.css'
import '../spec.css'

createRoot(document.getElementById('root')!).render(
  <TooltipProvider delayDuration={300}><GroupOptions /></TooltipProvider>,
)
