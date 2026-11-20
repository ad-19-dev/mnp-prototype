/// <reference types="vite/client" />
import { createRoot } from 'react-dom/client'
import { TooltipProvider } from '@qijenchen/design-system'
import { setLang } from '../../lib/store'
import { ShotSource, type Marks } from '../parts'
import TagWhy from './TagWhy'
import marks from './shots/marks.json'
import '../../globals.css'
import '../spec.css'
import './tagwhy.css'

setLang('en')
createRoot(document.getElementById('root')!).render(
  <TooltipProvider delayDuration={300}>
    <ShotSource imgs={import.meta.glob('./shots/*.jpg', { eager: true, import: 'default' }) as Record<string, string>} marks={marks as Marks}><TagWhy /></ShotSource>
  </TooltipProvider>,
)
