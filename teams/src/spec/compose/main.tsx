/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import { setLang } from '../../lib/store'
import { ShotSource, type Marks } from '../parts'
import ComposeSpec from './ComposeSpec'
import marks from './shots/marks.json'
import '../../globals.css'
import '../spec.css'

// the screenshots are in English, so the live tags and copy on the page are too
setLang('en')
createRoot(document.getElementById('root')!).render(
  <TooltipProvider delayDuration={300}>
    <ShotSource imgs={import.meta.glob('./shots/*.jpg', { eager: true, import: 'default' }) as Record<string, string>} marks={marks as Marks}><ComposeSpec /></ShotSource>
  </TooltipProvider>,
)
