// A small helper so page controllers can be written like the original prototype's classes:
// state lives in a ref, `set` merges a patch and re-renders, and methods always read the latest state.
import { useReducer, useRef } from 'react'

export function useLogic<T extends object, C>(initState: () => T, makeCtl: (get: () => T, set: (p: Partial<T> | ((s: T) => Partial<T>)) => void) => C) {
  const ref = useRef<T | null>(null)
  if (!ref.current) ref.current = initState()
  const [, force] = useReducer((x: number) => x + 1, 0)
  const ctl = useRef<C | null>(null)
  if (!ctl.current) {
    const get = () => ref.current as T
    const set = (p: Partial<T> | ((s: T) => Partial<T>)) => {
      const patch = typeof p === 'function' ? p(ref.current as T) : p
      ref.current = { ...(ref.current as T), ...patch }
      force()
    }
    ctl.current = makeCtl(get, set)
  }
  return [ref.current as T, ctl.current as C] as const
}

export const scrollTop = () => { try { window.scrollTo(0, 0); document.querySelector('[data-slot="app-shell-main"], main')?.scrollTo?.(0, 0) } catch { /* noop */ } }
