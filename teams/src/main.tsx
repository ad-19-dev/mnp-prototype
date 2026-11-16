import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import App from './App'
import './globals.css'
import { pastDatesOff } from './lib/pastDates'

// temporary until the DS DatePicker can disable past dates (see lib/pastDates.ts)
pastDatesOff()

createRoot(document.getElementById('root')!).render(
  <TooltipProvider delayDuration={500} skipDelayDuration={300}>
    <App />
  </TooltipProvider>,
)
