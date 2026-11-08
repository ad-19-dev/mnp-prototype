// Illustrated sample profile pictures for internal people: a flat head-and-shoulders drawing, picked from the
// person's id so the same person always gets the same one. They stand in for the photos the directory would give
// (the DS takes a photo as `avatarUrl` / `src`; without one it falls back to the first letter).
import type { Person } from './data'

const BG = ['#dbeafe', '#fde7d6', '#e0f2e9', '#efe3fa', '#fff1c9', '#fbdde6', '#d9f0f4', '#e6e9ef']
const SKIN = ['#f5d5bd', '#e9b998', '#d39a76', '#b9794f', '#8d5a3b']
const HAIR = ['#2b2a33', '#4a3426', '#7a5230', '#b5833f', '#6b6f78', '#1f1d24']
const SHIRT = ['#4f7cdc', '#3a9b7a', '#c4604a', '#7d62c4', '#d79a2b', '#4a5568', '#c25d8d']

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const pick = <T,>(a: T[], n: number) => a[n % a.length]

// hair drawn behind the face (back) and over the forehead (front), by style
function hair(style: number, c: string) {
  switch (style) {
    case 0: return { back: '', front: `<path d="M20 30c0-11 7-17 12-17s12 6 12 17c-3-5-8-8-12-8s-9 3-12 8z" fill="${c}"/>` } // short
    case 1: return { back: `<path d="M18 34c0-14 6-22 14-22s14 8 14 22v14H18z" fill="${c}"/>`, front: `<path d="M21 28c4-6 9-8 11-8s7 2 11 8c-2-9-6-12-11-12s-9 3-11 12z" fill="${c}"/>` } // long
    case 2: return { back: `<circle cx="32" cy="10" r="6" fill="${c}"/>`, front: `<path d="M20 30c0-11 6-16 12-16s12 5 12 16c-4-5-8-7-12-7s-8 2-12 7z" fill="${c}"/>` } // bun
    case 3: return { back: '', front: `<path d="M19 31c-1-12 6-19 13-19s14 7 13 19c-2-4-4-7-6-8-4 3-12 3-17 0-1 2-2 5-3 8z" fill="${c}"/>` } // side part
    case 4: return { back: `<path d="M17 36c-2-16 6-24 15-24s17 8 15 24c-1 4-3 6-5 6V30H22v12c-2 0-4-2-5-6z" fill="${c}"/>`, front: '' } // bob
    default: return { back: '', front: '' } // bald
  }
}

export function avatarUrl(p: Person): string {
  const h = hash(p.id || p.en), bg = pick(BG, h), skin = pick(SKIN, h >>> 3), hc = pick(HAIR, h >>> 6), shirt = pick(SHIRT, h >>> 9)
  const hr = hair((h >>> 12) % 6, hc), glasses = (h >>> 16) % 4 === 0
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/>`
    + hr.back
    + `<path d="M8 64c0-11 10-17 24-17s24 6 24 17z" fill="${shirt}"/><rect x="28" y="40" width="8" height="9" rx="3" fill="${skin}"/>`
    + `<ellipse cx="32" cy="30" rx="12" ry="14" fill="${skin}"/>`
    + hr.front
    + `<circle cx="27.5" cy="31" r="1.3" fill="#2b2a33"/><circle cx="36.5" cy="31" r="1.3" fill="#2b2a33"/>`
    + `<path d="M28.5 37c2 1.8 5 1.8 7 0" stroke="#2b2a33" stroke-width="1.2" fill="none" stroke-linecap="round"/>`
    + (glasses ? `<g fill="none" stroke="#2b2a33" stroke-width="1"><circle cx="27.5" cy="31" r="3.6"/><circle cx="36.5" cy="31" r="3.6"/><path d="M31 31h2"/></g>` : '')
    + '</svg>'
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}
