// App-wide data shared by Messages, Audience Group and Templates.
// A tiny external store: every page reads it with useApp() and writes with setApp().
import { useSyncExternalStore } from 'react'
import { toast } from '@qijenchen/design-system'
import { GROUPS, ROWS0, TEMPLATES, type Group, type Row, type Template } from './data'

export type Page = 'send' | 'groups' | 'templates'
export interface AppState {
  page: Page
  rows: Row[]
  groups: Group[]
  templates: Template[]
  // set by Templates › Use template; Messages picks it up and opens the send flow
  useTemplateId: string | null
}

let state: AppState = {
  page: (['send', 'groups', 'templates'].indexOf(location.hash.slice(1)) >= 0 ? location.hash.slice(1) : 'send') as Page,
  rows: ROWS0,
  groups: GROUPS.map(g => ({ ...g })),
  templates: TEMPLATES.map(t => ({ ...t })),
  useTemplateId: null,
}
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
export function patchRow(id: string, patch: Partial<Row>) {
  setApp(s => ({ rows: s.rows.map(r => r.id === id ? { ...r, ...patch, _f: null } : r) }))
}
export function go(page: Page) {
  if (page === state.page) return
  try { history.replaceState(null, '', '#' + page) } catch { /* sandboxed frames */ }
  setApp({ page })
  try { window.scrollTo(0, 0) } catch { /* noop */ }
}

// Toasts go through the DS Toaster. Its title stays on one line, so a longer message
// keeps its first sentence as the title and moves the rest to the description.
export function flash(text: string, kind: 'ok' | 'err' = 'ok') {
  const variant = kind === 'err' ? 'error' : 'success'
  if (text.length <= 44) { toast({ variant, title: text }); return }
  const i = text.search(/[.:]\s/)
  const head = i > 0 ? text.slice(0, i + 1) : text
  if (head.length <= 44) toast({ variant, title: head, description: text.slice(i + 2) })
  else toast({ variant, title: kind === 'err' ? 'Can’t continue yet' : 'Done', description: text })
}

// follow #send / #groups / #templates when the address changes
window.addEventListener('hashchange', () => {
  const h = location.hash.slice(1) as Page
  if (['send', 'groups', 'templates'].indexOf(h) >= 0 && h !== state.page) setApp({ page: h })
})
