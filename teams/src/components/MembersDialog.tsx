// Who is in an audience group or org: a searchable member list in a dialog (opened from the People count)
import * as React from 'react'
import { DataTable, Dialog, Empty, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input } from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { NO_HIDE, PAvatar, Two } from './ui'
import type { Person } from '../lib/data'
import { L, P } from '../lib/i18n'

export interface MemberSet { name: string; kind: string; people: Person[] }
const mcol = createColumnHelper<Person>()

export function MembersDialog({ set, onClose }: { set: MemberSet | null; onClose: () => void }) {
  const [q, setQ] = React.useState('')
  const t = q.trim().toLowerCase()
  const list = set ? set.people.filter(p => !t || [p.zh, p.en, p.nt, p.emp, p.org, p.value || ''].join(' ').toLowerCase().indexOf(t) >= 0) : []
  const cols = React.useMemo(() => [
    mcol.display({ id: 'p', header: L('Name', '姓名'), meta: { width: 260 }, cell: i => { const p = i.row.original; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.extKind ? p.value : p.zh + ' ' + p.en} b={p.extKind ? L('External', '外部') : p.nt} strong /></span> } }),
    mcol.display({ id: 'emp', header: L('Employee ID', '工號'), meta: { width: 120 }, cell: i => i.row.original.emp || '—' }),
    mcol.display({ id: 'org', header: L('Org', '組織'), meta: { width: 120 }, cell: i => i.row.original.org || '—' }),
  ], [])
  return (
    <Dialog open={!!set} onOpenChange={o => { if (!o) { onClose(); setQ('') } }}>
      {set ? (
        <DialogContent maxWidth={640} height="hug">
          <DialogHeader>
            <div className="flex flex-col gap-0.5">
              <DialogTitle>{set.name}</DialogTitle>
              <DialogDescription className="text-body text-fg-secondary">{set.kind + ' · ' + P(set.people.length, 'person', '人', 'people')}</DialogDescription>
            </div>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-[var(--layout-space-tight)]">
              <div className="w-72 max-w-full"><Input size="sm" type="search" startIcon={Search} value={q} onChange={e => setQ(e.target.value)} placeholder={L('Search name, NT or employee ID', '搜尋姓名、NT 帳號或工號')} aria-label={L('Search members', '搜尋成員')} /></div>
              <DataTable tableOptions={NO_HIDE} columns={cols as any} data={list} bordered height="340px" autoRowHeight getRowId={p => p.id}
                emptyState={<Empty title={L('No matching members', '找不到符合的成員')} description={L('Try another name, NT account or employee ID.', '換個姓名、NT 帳號或工號試試。')} />} />
            </div>
          </DialogBody>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
