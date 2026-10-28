// Spec page building blocks: redline pins, framed screens, numbered notes, plain tables
import * as React from 'react'

export function Pin({ n }: { n: number }) {
  return <span className="spec-pin" aria-label={'標註 ' + n}>{n}</span>
}

export interface Note { n: number; title: string; body: React.ReactNode }
export function Notes({ items }: { items: Note[] }) {
  return (
    <ol className="spec-notes">
      {items.map(x => (
        <li key={x.n}><Pin n={x.n} /><div><b>{x.title}</b><p>{x.body}</p></div></li>
      ))}
    </ol>
  )
}

// one screen in a frame; `width` is the screen's real width (the canvas scrolls sideways when narrower)
export function Frame({ label, sub, width, notes, children }: { label: string; sub?: string; width: number; notes?: Note[]; children: React.ReactNode }) {
  return (
    <figure className="spec-frame">
      <figcaption><b>{label}</b>{sub ? <span>{sub}</span> : null}</figcaption>
      <div className={'spec-row' + (notes ? ' side' : '')}>
        <div className="spec-canvas"><div className="spec-screen" style={{ width }}>{children}</div></div>
        {notes ? <Notes items={notes} /> : null}
      </div>
    </figure>
  )
}

export function Section({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="spec-section">
      <header>
        {eyebrow ? <span className="spec-eyebrow">{eyebrow}</span> : null}
        <h2 className="spec-h2">{title}</h2>
        {lead ? <p className="spec-lead">{lead}</p> : null}
      </header>
      {children}
    </section>
  )
}

export function SpecTable({ head, rows }: { head: React.ReactNode[]; rows: React.ReactNode[][] }) {
  return (
    <div className="spec-tablewrap">
      <table className="spec-table">
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
