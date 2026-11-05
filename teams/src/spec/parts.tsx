/// <reference types="vite/client" />
// Spec page building blocks: redline pins, screenshots with pins, numbered notes, plain tables
import * as React from 'react'

// each spec page hands in its own screenshots (so a page bundles only its own images) through ShotSource
export type Marks = Record<string, { w: number; h: number; marks: { n: number; x: number; y: number }[] }>
const Src = React.createContext<{ imgs: Record<string, string>; marks: Marks }>({ imgs: {}, marks: {} })
export function ShotSource({ imgs, marks, children }: { imgs: Record<string, string>; marks: Marks; children: React.ReactNode }) {
  return <Src.Provider value={{ imgs, marks }}>{children}</Src.Provider>
}

export function Pin({ n }: { n: number }) {
  return <span className="spec-pin" aria-label={'標註 ' + n}>{n}</span>
}

// a screenshot from the prototype; `max` caps its width on the page (it shrinks with the column).
// Click it to see it at full size in an overlay (Esc or the close button to go back).
export function Shot({ name, max, alt }: { name: string; max?: number; alt: string }) {
  const { imgs, marks } = React.useContext(Src), m = marks[name]
  const src = Object.keys(imgs).find(k => k.endsWith('/' + name + '.jpg'))
  const dlg = React.useRef<HTMLDialogElement>(null)
  if (!m || !src) return <div className="spec-callout">缺少截圖：{name}</div>
  const pins = m.marks.map(x => <span key={x.n} className="spec-pin" style={{ left: x.x + '%', top: x.y + '%' }} aria-hidden>{x.n}</span>)
  return (
    <>
      <button type="button" className="spec-shot" style={{ maxWidth: max || m.w }} onClick={() => dlg.current?.showModal()} aria-label={'放大查看：' + alt}>
        <img src={imgs[src]} width={m.w} height={m.h} alt={alt} loading="lazy" />
        {pins}
        <span className="spec-zoom" aria-hidden>點一下放大</span>
      </button>
      <dialog ref={dlg} className="spec-lightbox" aria-label={alt} onClick={e => { if (e.target === dlg.current) dlg.current?.close() }}>
        <div className="spec-lightbox-bar"><b>{alt}</b><button type="button" onClick={() => dlg.current?.close()}>關閉 ✕</button></div>
        <div className="spec-lightbox-body"><div className="spec-shot is-full" style={{ width: m.w }}><img src={imgs[src]} width={m.w} height={m.h} alt="" />{pins}</div></div>
      </dialog>
    </>
  )
}

export interface Note { n?: number; title: string; body: React.ReactNode }
export function Notes({ items, cols }: { items: Note[]; cols?: boolean }) {
  return (
    <ol className={'spec-notes' + (cols ? ' cols' : '')}>
      {items.map((x, i) => (
        <li key={i} style={x.n ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}>{x.n ? <Pin n={x.n} /> : null}<div><b>{x.title}</b><p>{x.body}</p></div></li>
      ))}
    </ol>
  )
}

// a screenshot with its notes beside it, or under it in columns when the screenshot is wide
// (side by side would shrink a wide screen to half its size)
export function Figure({ label, sub, shot, max, notes, wideNotes }: { label: string; sub?: string; shot: string; max?: number; notes?: Note[]; wideNotes?: boolean }) {
  const m = React.useContext(Src).marks[shot], below = wideNotes || (m && Math.min(max || m.w, m.w) > 700)
  return (
    <figure className="spec-frame">
      <figcaption><b>{label}</b>{sub ? <span>{sub}</span> : null}</figcaption>
      <div className={'spec-row' + (notes && !below ? ' side' : '')}>
        <div className="spec-canvas"><Shot name={shot} max={max} alt={label} /></div>
        {notes ? <Notes items={notes} cols={below} /> : null}
      </div>
    </figure>
  )
}

export function Section({ id, eyebrow, title, lead, children }: { id?: string; eyebrow?: string; title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="spec-section" id={id}>
      <header>
        {eyebrow ? <span className="spec-eyebrow">{eyebrow}</span> : null}
        <h2 className="spec-h2">{title}</h2>
        {lead ? <p className="spec-lead">{lead}</p> : null}
      </header>
      {children}
    </section>
  )
}

export function SpecTable({ head, rows, nowrap = [] }: { head: React.ReactNode[]; rows: React.ReactNode[][]; nowrap?: number[] }) {
  return (
    <div className="spec-tablewrap">
      <table className="spec-table">
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={nowrap.indexOf(j) >= 0 ? 'nowrap' : undefined}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

// UI copy: English as shipped, Chinese under it
export const Copy = ({ en, zh }: { en: string; zh: string }) => <span className="flex flex-col"><span className="spec-q">{en}</span><span className="text-fg-secondary">{zh}</span></span>
export const C = ({ children }: { children: React.ReactNode }) => <code>{children}</code>
