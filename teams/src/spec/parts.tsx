/// <reference types="vite/client" />
// Spec page building blocks: redline pins, screenshots with pins, numbered notes, plain tables
import * as React from 'react'
import marksJson from './shots/marks.json'

const IMGS = import.meta.glob('./shots/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
const MARKS = marksJson as Record<string, { w: number; h: number; marks: { n: number; x: number; y: number }[] }>

export function Pin({ n }: { n: number }) {
  return <span className="spec-pin" aria-label={'標註 ' + n}>{n}</span>
}

// a screenshot from the prototype; `max` caps its width on the page (it shrinks with the column)
export function Shot({ name, max, alt }: { name: string; max?: number; alt: string }) {
  const m = MARKS[name]
  return (
    <div className="spec-shot" style={{ maxWidth: max || m.w }}>
      <img src={IMGS['./shots/' + name + '.jpg']} width={m.w} height={m.h} alt={alt} loading="lazy" />
      {m.marks.map(x => <span key={x.n} className="spec-pin" style={{ left: x.x + '%', top: x.y + '%' }} aria-hidden>{x.n}</span>)}
    </div>
  )
}

export interface Note { n?: number; title: string; body: React.ReactNode }
export function Notes({ items }: { items: Note[] }) {
  return (
    <ol className="spec-notes">
      {items.map((x, i) => (
        <li key={i} style={x.n ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}>{x.n ? <Pin n={x.n} /> : null}<div><b>{x.title}</b><p>{x.body}</p></div></li>
      ))}
    </ol>
  )
}

// a screenshot with its notes beside it (wide) or under it (narrow)
export function Figure({ label, sub, shot, max, notes, wideNotes }: { label: string; sub?: string; shot: string; max?: number; notes?: Note[]; wideNotes?: boolean }) {
  return (
    <figure className="spec-frame">
      <figcaption><b>{label}</b>{sub ? <span>{sub}</span> : null}</figcaption>
      <div className={'spec-row' + (notes && !wideNotes ? ' side' : '')}>
        <div className="spec-canvas"><Shot name={shot} max={max} alt={label} /></div>
        {notes ? <Notes items={notes} /> : null}
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
