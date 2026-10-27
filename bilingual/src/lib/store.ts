// App-wide data shared by Messages, Audience Group and Templates.
// A tiny external store: every page reads it with useApp() and writes with setApp().
import { useSyncExternalStore } from 'react'
import { toast } from '@qijenchen/design-system'
import { GROUPS, ROWS0, TEMPLATES, type Group, type Row, type Template } from './data'
import type { Lang } from './i18n'

export type Page = 'send' | 'groups' | 'templates'
export interface AppState {
  page: Page
  lang: Lang
  rows: Row[]
  groups: Group[]
  templates: Template[]
  // set by Templates › Use template; Messages picks it up and opens the send flow
  useTemplateId: string | null
}

function initialLang(): Lang {
  try { const v = localStorage.getItem('mnp-lang'); if (v === 'en' || v === 'zh') return v } catch { /* storage blocked */ }
  return /^zh/i.test(navigator.language || '') ? 'zh' : 'en'
}

let state: AppState = {
  page: (['send', 'groups', 'templates'].indexOf(location.hash.slice(1)) >= 0 ? location.hash.slice(1) : 'send') as Page,
  lang: initialLang(),
  rows: ROWS0,
  groups: GROUPS.map(g => ({ ...g })),
  templates: TEMPLATES.map(t => ({ ...t })),
  useTemplateId: null,
}
document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant' : 'en'
const subs = new Set<() => void>()

export function getApp() { return state }
export function setApp(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  subs.forEach(f => f())
}
export function useApp() {
  return useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb) } }, () => state)
}
export function setLang(lang: Lang) {
  try { localStorage.setItem('mnp-lang', lang) } catch { /* storage blocked */ }
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en'
  setApp({ lang })
}
export function patchRow(id: string, patch: Partial<Row>) {
  setApp(s => ({ rows: s.rows.map(r => r.id === id ? { ...r, ...patch, _f: null } : r) }))
}
export function go(page: Page) {
  if (page === state.page) return
  try { history.replaceState(null, '', '#' + page) } catch { /* sandboxed frames */ }
  setApp({ page })
  try { window.scrollTo(0, 0) } catch { /* noop */ }
}

// Toasts go through the DS Toaster: a short title, with any detail as the description
export function flash(title: string, kind: 'ok' | 'err' = 'ok', description?: string) {
  toast({ variant: kind === 'err' ? 'error' : 'success', title, description })
}

// follow #send / #groups / #templates when the address changes
window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1) as Page
  if (['send', 'groups', 'templates'].indexOf(h) >= 0 && h !== state.page) setApp({ page: h })
})
