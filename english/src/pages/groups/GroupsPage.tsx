// Audience Group: reusable receiver lists with collaborators and roles
import * as React from 'react'
import {
  Button, DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Empty,
  Input, Pagination, Popover, PopoverAnchor, PopoverContent, SegmentedControl, SegmentedControlItem, Select, Tag, Textarea,
  Checkbox, Tooltip, TooltipContent, TooltipTrigger, cn,
} from '@qijenchen/design-system'
import { NO_HIDE } from '../../components/ui'
import { createColumnHelper } from '@tanstack/react-table'
import {
  Check, CircleCheck, Copy, Eye, FileText, Info, Lock, Mail, MessageSquareText, Minus, Monitor, MoreVertical, Pencil, Plus,
  Search, Smartphone, Trash2, Undo2, UserPlus, Users, Wand2, X, CircleAlert,
} from 'lucide-react'
import {
  GSEED, ME, ORGS, PEOPLE, PMAP, SAMPLE_GROUP, extPerson, fmtDT, fmtN, maskPhone, membersFor, orgMembers, parseList, plural,
  splitTokens, type Group, type Person,
} from '../../lib/data'
import { flash, getApp, setApp, useApp } from '../../lib/store'
import { useLogic, scrollTop } from '../../lib/logic'
import { Banner, ConfirmDialog, FormField, PAvatar, PageIntro, Section, Two, type Confirm } from '../../components/ui'
import { PageHeader, useNavHome } from '../../components/shell'
import { RecvInput, type RiItem, type RiState } from '../../components/RecvInput'

type Role = 'Owner' | 'Editor' | 'Viewer'
const ROLE_COLOR: Record<Role, 'blue' | 'green' | 'neutral'> = { Owner: 'blue', Editor: 'green', Viewer: 'neutral' }
const RoleTag = ({ r, children }: { r: Role; children?: React.ReactNode }) => <Tag size="sm" color={ROLE_COLOR[r]}>{children || r}</Tag>
const PER = 12

interface Fb { added: number; by: Record<string, number>; orgs: { code: string; n: number }[]; dup: number; amb: { id: string; tok: string; cands: string[] }[]; miss: { id: string; tok: string; why: string }[]; undo: string[]; undone?: number }
interface Ed {
  id: string | null; isNew: boolean; role: Role; name: string; desc: string; collabs: { pid: string; role: Role }[]; members: { pid: string }[]
  updated: string; creator: string; input: string; fb: Fb | null; picks: Record<string, Record<string, boolean>>
  cq: string; cOpen: boolean; cRole: Role; mq: string; mf: 'all' | 'dev' | 'desk' | 'email' | 'sms'; mpage: number
  fresh: Record<string, boolean>; tried: boolean; dirty: boolean; ri: RiState; showPaste: boolean
}
interface GS { view: 'list' | 'edit'; q: string; own: 'all' | 'mine' | 'shared'; cf: Confirm | null; ed: Ed | null }

function makeEd(g: Group | null, dup?: boolean): Ed {
  const base = { input: '', fb: null, picks: {}, cq: '', cOpen: false, cRole: 'Editor' as Role, mq: '', mf: 'all' as const, mpage: 1, fresh: {}, tried: false, dirty: false, ri: { type: 'person' as const, q: '', open: false, exp: null }, showPaste: false }
  if (!g) return { ...base, id: null, isNew: true, role: 'Owner', name: '', desc: '', collabs: [{ pid: ME, role: 'Owner' }], members: [], updated: '', creator: ME }
  const seed = GSEED[g.id] || ({} as any)
  const members = membersFor(g).map(m => ({ pid: m.pid }))
  const collabs = g.collabs ? g.collabs.map(x => ({ pid: x.pid, role: x.role as Role })) : ((seed.col || [[g.creator, 'Owner']]) as [string, Role][]).map(x => ({ pid: x[0], role: x[1] }))
  if (dup) return { ...base, id: null, isNew: true, role: 'Owner', name: ('Copy of ' + g.name).slice(0, 50), desc: g.desc, collabs: [{ pid: ME, role: 'Owner' }], members, updated: '', creator: ME, dirty: true }
  return { ...base, id: g.id, isNew: false, role: g.role, name: g.name, desc: g.desc, collabs, members, updated: g.updated, creator: g.creator }
}

let seq = 0
function makeCtl(get: () => GS, set: (p: Partial<GS> | ((s: GS) => Partial<GS>)) => void) {
  const m = {
    get s() { return get() },
    set,
    setEd(patch: Partial<Ed>, clean?: boolean) { const ed = { ...get().ed!, ...patch }; if (!clean) ed.dirty = true; set({ ed }) },
    listRows() {
      const s = get(), q = s.q.trim().toLowerCase()
      return getApp().groups.filter(g => {
        if (s.own === 'mine' && g.role !== 'Owner') return false
        if (s.own === 'shared' && g.role === 'Owner') return false
        if (!q) return true
        const cr = PMAP[g.creator] || ({} as any)
        return [g.name, g.desc, cr.en, cr.zh].join(' ').toLowerCase().indexOf(q) >= 0
      }).sort((a, b) => b.updated.localeCompare(a.updated))
    },
    openEd(g: Group | null, dup?: boolean) { set({ view: 'edit', ed: makeEd(g, dup) }); scrollTop() },
    askDelete(id: string) {
      const g = getApp().groups.find(x => x.id === id) || ({ name: '' } as Group)
      set({ cf: { title: 'Delete “' + g.name + '”?', text: 'Collaborators lose access, and the group can no longer be picked as a receiver. Messages already sent or scheduled keep their receivers.', icon: Trash2, tone: 'err', cancel: 'Keep group', ok: 'Delete group', danger: true, run: () => m.deleteGroup(id) } })
    },
    deleteGroup(id: string) {
      const g = getApp().groups.find(x => x.id === id)
      setApp(s => ({ groups: s.groups.filter(x => x.id !== id) }))
      set({ cf: null, view: 'list', ed: null })
      flash('Deleted “' + (g ? g.name : 'group') + '”.')
      scrollTop()
    },
    backFromEd() {
      const ed = get().ed
      if (ed && ed.dirty && ed.role !== 'Viewer') {
        set({ cf: { title: 'Discard your changes?', text: 'Your changes to this group haven’t been saved.', icon: CircleAlert, tone: 'warn', cancel: 'Keep editing', ok: 'Discard changes', danger: true, run: () => { set({ cf: null, view: 'list', ed: null }); scrollTop() } } })
        return
      }
      set({ view: 'list', ed: null })
      scrollTop()
    },
    owners() { return get().ed!.collabs.filter(c => c.role === 'Owner') },
    setRole(pid: string, role: Role) {
      const ed = get().ed!, cur = ed.collabs.find(c => c.pid === pid)
      if (!cur || cur.role === role) return
      if (cur.role === 'Owner' && role !== 'Owner' && m.owners().length === 1) { flash('A group needs at least one owner. Make someone else an owner first.', 'err'); set({}); return }
      m.setEd({ collabs: ed.collabs.map(c => c.pid === pid ? { pid, role } : c) })
    },
    removeCollab(pid: string) { m.setEd({ collabs: get().ed!.collabs.filter(c => c.pid !== pid) }) },
    addCollab(pid: string) {
      const ed = get().ed!
      if (ed.collabs.some(c => c.pid === pid)) return
      m.setEd({ collabs: ed.collabs.concat([{ pid, role: ed.cRole }]), cq: '', cOpen: false })
      flash('Added ' + PMAP[pid].en + ' as ' + ed.cRole.toLowerCase() + '.')
    },
    collabResults() {
      const ed = get().ed!, low = ed.cq.trim().toLowerCase()
      if (!low) return []
      const have: Record<string, boolean> = {}
      ed.collabs.forEach(c => { have[c.pid] = true })
      return PEOPLE.filter(p => !have[p.id] && [p.zh, p.en, p.nt, p.emp].some(v => v.toLowerCase().indexOf(low) >= 0)).slice(0, 6)
    },
    parseMembers() {
      const ed = get().ed!, res = parseList(ed.input, { phoneBy: 'Mobile number' }), have: Record<string, boolean> = {}, add: string[] = []
      const amb: Fb['amb'] = [], miss: Fb['miss'] = [], by: Record<string, number> = {}, orgs: Fb['orgs'] = []
      let dup = 0
      ed.members.forEach(x => { have[x.pid] = true })
      res.forEach(x => {
        if (x.kind === 'one') {
          if (have[x.p.id]) { dup++; return }
          have[x.p.id] = true; add.push(x.p.id); by[x.by] = (by[x.by] || 0) + 1
        } else if (x.kind === 'org') {
          let n = 0
          orgMembers(x.org.code).forEach(p => { if (!have[p.id]) { have[p.id] = true; add.push(p.id); n++ } else dup++ })
          orgs.push({ code: x.org.code, n })
        } else if (x.kind === 'amb') amb.push({ id: 'a' + (++seq), tok: x.tok!, cands: x.cands.map(p => p.id) })
        else if (x.kind === 'miss') miss.push({ id: 'x' + (++seq), tok: x.tok!, why: x.why })
      })
      const fresh: Record<string, boolean> = {}
      add.forEach(pid => { fresh[pid] = true })
      m.setEd({ members: add.map(pid => ({ pid })).concat(ed.members), input: '', fb: { added: add.length, by, orgs, dup, amb, miss, undo: add }, picks: {}, fresh, mpage: 1, mf: 'all', mq: '' }, add.length === 0)
    },
    undoAdd() {
      const ed = get().ed!, drop: Record<string, boolean> = {}
      ;(ed.fb!.undo || []).forEach(pid => { drop[pid] = true })
      m.setEd({ members: ed.members.filter(x => !drop[x.pid]), fb: { ...ed.fb!, added: 0, undo: [], by: {}, orgs: [], undone: (ed.fb!.undo || []).length }, fresh: {} })
    },
    ambAdd(a: Fb['amb'][number]) {
      const ed = get().ed!, pk = ed.picks[a.id] || {}, have: Record<string, boolean> = {}
      ed.members.forEach(x => { have[x.pid] = true })
      const add = a.cands.filter(pid => pk[pid] && !have[pid]), fresh = { ...ed.fresh }
      add.forEach(pid => { fresh[pid] = true })
      const fb = ed.fb!
      m.setEd({ members: add.map(pid => ({ pid })).concat(ed.members), fresh, mpage: 1, mf: 'all', mq: '', fb: { ...fb, amb: fb.amb.filter(x => x.id !== a.id), added: fb.added + add.length, undo: (fb.undo || []).concat(add), by: { ...fb.by, Name: (fb.by.Name || 0) + add.length } } })
    },
    ambSkip(a: Fb['amb'][number]) { const ed = get().ed!; m.setEd({ fb: { ...ed.fb!, amb: ed.fb!.amb.filter(x => x.id !== a.id) } }, true) },
    ambPick(a: Fb['amb'][number], pid: string) {
      const ed = get().ed!, picks = { ...ed.picks }, cur = { ...(picks[a.id] || {}) }
      cur[pid] = !cur[pid]; picks[a.id] = cur
      m.setEd({ picks }, true)
    },
    removeMember(pid: string) { m.setEd({ members: get().ed!.members.filter(x => x.pid !== pid) }) },
    // add from the compound input: orgs and groups come in as their current members
    pidsOf(it: RiItem): string[] {
      if (it.kind === 'ext') return [extPerson(it.value).id]
      if (it.kind === 'person') return [it.id]
      if (it.kind === 'org') return orgMembers(it.id).map(p => p.id)
      return membersFor(getApp().groups.find(x => x.id === it.id) || ({ id: it.id, count: 0 } as Group)).map(x => x.pid)
    },
    addItem(it: RiItem) {
      const ed = get().ed!, has: Record<string, boolean> = {}
      ed.members.forEach(x => { has[x.pid] = true })
      const add = m.pidsOf(it).filter(id => !has[id]), fresh: Record<string, boolean> = {}
      add.forEach(id => { fresh[id] = true })
      m.setEd({ members: add.map(id => ({ pid: id })).concat(ed.members), fresh, mpage: 1, mf: 'all', mq: '' })
      flash(it.kind === 'org' || it.kind === 'group' ? 'Added ' + plural(add.length, 'member') + (add.length ? '' : '. Everyone was already in the group') + '.' : 'Added 1 member.')
    },
    saveGroup() {
      const s = get(), ed = s.ed!, name = ed.name.trim(), groups = getApp().groups
      const dupName = groups.some(g => g.id !== ed.id && g.name.toLowerCase() === name.toLowerCase())
      if (!name || name.length > 50 || ed.desc.length > 200 || dupName) { m.setEd({ tried: true }, true); flash('Check the group name before saving.', 'err'); scrollTop(); return }
      if (!ed.members.length) { m.setEd({ tried: true }, true); flash('Add at least one member before saving.', 'err'); return }
      const mine = ed.collabs.find(c => c.pid === ME)
      const patch = { name, desc: ed.desc.trim(), count: ed.members.length, updated: fmtDT(new Date()), members: ed.members.map(x => ({ pid: x.pid })), collabs: ed.collabs.map(c => ({ pid: c.pid, role: c.role })), role: mine ? mine.role : ed.role, fresh: Date.now() }
      if (ed.id) setApp(a => ({ groups: a.groups.map(g => g.id === ed.id ? { ...g, ...patch } : g) }))
      else setApp(a => ({ groups: [{ id: 'gn' + (++seq), creator: ME, ...patch } as Group].concat(a.groups) }))
      set({ view: 'list', ed: null, own: 'all' })
      flash((ed.id ? 'Saved changes to “' : 'Created “') + name + '” with ' + plural(patch.count, 'member') + '.')
      scrollTop()
    },
  }
  return m
}
type GCtl = ReturnType<typeof makeCtl>

const gcol = createColumnHelper<Group>()
function GroupMenu({ m, g }: { m: GCtl; g: Group }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={'Actions for ' + g.name} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={208}>
        <DropdownMenuItem startIcon={g.role === 'Viewer' ? Eye : Pencil} onSelect={() => m.openEd(g)}>{g.role === 'Viewer' ? 'View' : 'Edit'}</DropdownMenuItem>
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.openEd(g, true)}>Duplicate</DropdownMenuItem>
        {g.role === 'Owner' ? <><DropdownMenuSeparator /><DropdownMenuItem startIcon={Trash2} className="text-error-text" onSelect={() => m.askDelete(g.id)}>Delete group</DropdownMenuItem></> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function GroupList({ m }: { m: GCtl }) {
  const app = useApp(), s = m.s, rows = m.listRows()
  const nAll = app.groups.length, nMine = app.groups.filter(g => g.role === 'Owner').length
  const cols = React.useMemo(() => [
    gcol.accessor('name', { header: 'Group name', meta: { width: 420 }, cell: i => (
      <span className="flex min-w-0 flex-col">
        <button type="button" className="min-w-0 truncate text-left font-medium text-primary hover:text-primary-hover hover:underline" title={i.getValue()} onClick={() => m.openEd(i.row.original)}>{i.getValue()}</button>
        <span className="truncate text-caption text-fg-secondary" title={i.row.original.desc}>{i.row.original.desc || 'No description'}</span>
      </span>
    ) }),
    gcol.accessor('count', { header: 'Members', meta: { width: 120 }, cell: i => <span className="font-medium tabular-nums">{fmtN(i.getValue())}</span> }),
    gcol.accessor('updated', { header: 'Updated time', meta: { width: 150 }, cell: i => { const p = i.getValue().split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    gcol.accessor('creator', { header: 'Creator', meta: { width: 210 }, cell: i => { const p = PMAP[i.getValue()] || PEOPLE[0]; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.en} b={p.zh} /></span> } }),
    gcol.accessor('role', { header: 'Your role', meta: { width: 130 }, cell: i => <RoleTag r={i.getValue()} /> }),
  ], [m])
  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      <PageIntro title="Audience Group" sub="Reusable receiver lists. Use them when you send a message, and share them with your team." />
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-60 max-w-sm flex-1"><Input startIcon={Search} type="search" placeholder="Search by group name, description or creator" aria-label="Search groups" value={s.q} onChange={e => m.set({ q: e.target.value })} /></div>
        <SegmentedControl value={s.own} onValueChange={v => v && m.set({ own: v as GS['own'] })} aria-label="Ownership">
          <SegmentedControlItem value="all" badge={<span className="text-fg-muted [[data-state=on]_&]:text-primary">{nAll}</span>}>All</SegmentedControlItem>
          <SegmentedControlItem value="mine" badge={<span className="text-fg-muted [[data-state=on]_&]:text-primary">{nMine}</span>}>Owned by me</SegmentedControlItem>
          <SegmentedControlItem value="shared" badge={<span className="text-fg-muted [[data-state=on]_&]:text-primary">{nAll - nMine}</span>}>Shared with me</SegmentedControlItem>
        </SegmentedControl>
      </div>
      <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['name']} columns={cols as any} data={rows} bordered height="100%" autoRowHeight getRowId={g => g.id}
        rowActions={(g: Group) => <GroupMenu m={m} g={g} />}
        emptyState={<Empty icon={Users} title="No groups match" description="Try another search, or switch to All." action={<Button onClick={() => m.set({ q: '', own: 'all' })}>Show all groups</Button>} />} />
      <span className="text-body text-fg-secondary">{rows.length === nAll ? plural(nAll, 'group') + ' you can use' : 'Showing ' + rows.length + ' of ' + plural(nAll, 'group')}</span>
    </div>
  )
}

// ---------- editor ----------
type MRow = { p: Person }
const mcol = createColumnHelper<MRow>()
// channel status in the member table: a check when the person can get it, a dash when not;
// the words stay for screen readers and as a hover hint
const Cv = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center text-body', ok ? 'text-success-text' : 'text-fg-muted')} title={typeof children === 'string' ? children : undefined}>
    {ok ? <Check className="size-4" aria-hidden /> : <span aria-hidden>–</span>}<span className="sr-only">{children}</span>
  </span>
)

function GroupEditor({ m }: { m: GCtl }) {
  const app = useApp(), s = m.s, ed = s.ed!
  const isViewer = ed.role === 'Viewer', canEdit = !isViewer, canManage = ed.role === 'Owner'
  const owners = m.owners(), ownerNames = owners.map(c => PMAP[c.pid].en).join(', ')
  const cr = PMAP[ed.creator] || PEOPLE[0]
  const nm = ed.name.trim(), dupName = app.groups.some(g => g.id !== ed.id && g.name.toLowerCase() === nm.toLowerCase())
  const nameErr = (ed.tried && !nm) ? 'Enter a group name.' : ed.name.length > 50 ? 'Group names can be up to 50 characters.' : (nm && dupName) ? 'Another group already uses this name.' : ''
  const title = ed.isNew ? (nm || 'New group') : (nm || 'Untitled group')
  const roleText = ed.isNew ? 'You’ll be the owner' : canManage ? 'You’re an owner' : ed.role === 'Editor' ? 'You’re an editor' : 'View only'
  const cResults = m.collabResults(), cOpen = !!(ed.cOpen && ed.cq.trim())
  const plist = ed.members.map(x => PMAP[x.pid]).filter(Boolean), n = plist.length
  const covDefs = [
    { key: 'dev' as const, label: 'Device notification', icon: Smartphone, ok: plist.filter(p => p.dev).length, word: 'no registered device' },
    { key: 'desk' as const, label: 'Desktop OS', icon: Monitor, ok: plist.filter(p => p.desk).length, word: 'no desktop agent' },
    { key: 'email' as const, label: 'Email', icon: Mail, ok: plist.filter(p => p.extKind !== 'phone').length, word: 'no email address' },
    { key: 'sms' as const, label: 'SMS', icon: MessageSquareText, ok: plist.filter(p => p.co || p.pp).length, word: 'no phone number' },
  ]
  let filt = plist
  if (ed.mf === 'dev') filt = filt.filter(p => !p.dev)
  if (ed.mf === 'desk') filt = filt.filter(p => !p.desk)
  if (ed.mf === 'sms') filt = filt.filter(p => !p.co && !p.pp)
  if (ed.mf === 'email') filt = filt.filter(p => p.extKind === 'phone')
  const mq = ed.mq.trim().toLowerCase()
  if (mq) filt = filt.filter(p => [p.zh, p.en, p.nt, p.emp, p.org].join(' ').toLowerCase().indexOf(mq) >= 0)
  const pagesN = Math.max(1, Math.ceil(filt.length / PER)), page = Math.min(ed.mpage, pagesN), st = (page - 1) * PER
  const mrows: MRow[] = filt.slice(st, st + PER).map(p => ({ p }))
  const fb = ed.fb, inputN = splitTokens(ed.input).length
  const has: Record<string, boolean> = {}
  ed.members.forEach(x => { has[x.pid] = true })
  const anchor = React.useRef<HTMLDivElement>(null)

  const mcols = React.useMemo(() => [
    mcol.display({ id: 'who', header: 'Member', meta: { width: 220 }, cell: i => { const { p } = i.row.original; return <span className="flex min-w-0 items-center gap-2"><PAvatar p={p} /><Two a={p.extKind ? p.value : p.zh + ' ' + p.en} b={p.title} strong /></span> } }),
    mcol.display({ id: 'emp', header: 'Employee ID', meta: { width: 120 }, cell: i => <Two a={<span className="font-mono">{i.row.original.p.emp || '—'}</span>} b={i.row.original.p.nt} /> }),
    mcol.display({ id: 'org', header: 'Org', meta: { width: 110 }, cell: i => <span className="truncate">{i.row.original.p.org}</span> }),
    mcol.display({ id: 'dev', header: 'Device notification', meta: { width: 160 }, cell: i => <Cv ok={i.row.original.p.dev}>{i.row.original.p.dev ? 'Registered' : 'No device'}</Cv> }),
    mcol.display({ id: 'desk', header: 'Desktop OS', meta: { width: 130 }, cell: i => <Cv ok={i.row.original.p.desk}>{i.row.original.p.desk ? 'Installed' : 'Not installed'}</Cv> }),
    mcol.display({ id: 'email', header: 'Email', meta: { width: 110 }, cell: i => <Cv ok={i.row.original.p.extKind !== 'phone'}>{i.row.original.p.extKind !== 'phone' ? 'Available' : 'No email'}</Cv> }),
    mcol.display({ id: 'sms', header: 'SMS', meta: { width: 100 }, cell: i => {
      const p = i.row.original.p, co = p.extKind === 'phone' ? p.value : p.co ? 'MVPN ' + p.mvpn : '', pp = !p.extKind && p.pp ? maskPhone(p.pp) : ''
      if (!co && !pp) return <Cv ok={false}>{'No number'}</Cv>
      // which number gets the SMS shows on hover
      return (
        <Tooltip>
          <TooltipTrigger asChild><span tabIndex={0} className="inline-flex rounded-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"><Cv ok>{co || pp}</Cv></span></TooltipTrigger>
          <TooltipContent>
            <span className="flex flex-col gap-0.5 font-mono">
              {co ? <span>{co}</span> : null}
              {pp ? <span className="inline-flex items-center gap-1"><Lock className="size-3" aria-label={'Personal phone, masked under PIP'} />{pp}</span> : null}
            </span>
          </TooltipContent>
        </Tooltip>
      )
    } }),
  ], [])

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader crumbs={[{ label: 'Audience Group', onClick: () => m.backFromEd() }, { label: title }]} actions={<><RoleTag r={ed.role}>{roleText}</RoleTag>{ed.isNew ? null : <span className="hidden text-caption text-fg-secondary lg:inline">Updated {ed.updated} · Created by {cr.en}</span>}</>} />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)] pb-[var(--layout-space-bottom)]">
        {isViewer ? <Banner tone="neutral">You can see this group and use it as a receiver when sending a message. To change it, ask an owner: {ownerNames}.</Banner> : null}
        <Section title="Group details">
          <div className="flex flex-col gap-[var(--layout-space-loose)]">
            <FormField id="g-name" label="Group name" required count={ed.name.length + ' / 50'} over={ed.name.length > 50} error={nameErr}>
              <Input id="g-name" disabled={isViewer} value={ed.name} error={!!nameErr} onChange={e => m.setEd({ name: e.target.value })} placeholder="e.g. Fab 18 drill wardens" />
            </FormField>
            <FormField id="g-desc" label="Description" count={ed.desc.length + ' / 200'} over={ed.desc.length > 200} hint="Shown when sending a message, so others pick the right group.">
              <Textarea id="g-desc" rows={2} disabled={isViewer} value={ed.desc} onChange={e => m.setEd({ desc: e.target.value })} placeholder="What this group is for" />
            </FormField>
          </div>
        </Section>

        <Section title="Permissions" sub="Everyone listed can use this group as a receiver when sending a message. Their role decides what else they can do.">
          <div className="flex flex-col gap-[var(--layout-space-tight)]">
            {!canManage ? <Banner tone="neutral">Only owners can change who has access. {owners.length === 1 ? 'Owner: ' : 'Owners: '}{ownerNames}.</Banner> : null}
            {canManage ? (
              <div className="flex flex-wrap items-start gap-2">
                <Popover open={cOpen} onOpenChange={o => { if (!o) m.setEd({ cOpen: false }, true) }}>
                  <PopoverAnchor asChild>
                    <div ref={anchor} className="min-w-60 flex-1">
                      <Input startIcon={UserPlus} autoComplete="off" placeholder="Add a collaborator by name, NT account or employee ID" aria-label="Add collaborator" value={ed.cq}
                        onChange={e => m.setEd({ cq: e.target.value, cOpen: true }, true)}
                        onKeyDown={e => { if (e.key === 'Escape') m.setEd({ cOpen: false }, true); if (e.key === 'Enter') { e.preventDefault(); if (cResults[0]) m.addCollab(cResults[0].id) } }} />
                    </div>
                  </PopoverAnchor>
                  <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1" onOpenAutoFocus={e => e.preventDefault()} onInteractOutside={e => { if (anchor.current?.contains(e.target as Node)) e.preventDefault() }}>
                    {cResults.map(p => (
                      <button key={p.id} type="button" onClick={() => m.addCollab(p.id)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-neutral-hover">
                        <PAvatar p={p} size={28} /><Two a={p.zh + ' ' + p.en} b={p.nt + ' · ' + p.emp + ' · ' + p.org} strong className="flex-1" /><span className="text-caption text-fg-muted">Add as {ed.cRole}</span>
                      </button>
                    ))}
                    {!cResults.length ? <div className="px-3 py-3 text-body text-fg-secondary">No one else matches “{ed.cq}”.</div> : null}
                  </PopoverContent>
                </Popover>
                <div className="w-44"><Select aria-label="Role for new collaborators" value={ed.cRole} onChange={v => m.setEd({ cRole: v as Role }, true)} options={[{ value: 'Editor', label: 'Add as Editor' }, { value: 'Viewer', label: 'Add as Viewer' }, { value: 'Owner', label: 'Add as Owner' }]} /></div>
              </div>
            ) : null}
            <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">
              {ed.collabs.map(c => {
                const p = PMAP[c.pid], me = c.pid === ME, lastOwner = c.role === 'Owner' && owners.length === 1, editable = canManage && !lastOwner
                return (
                  <div key={c.pid} className="flex min-h-12 items-center gap-3 px-3 py-2">
                    <PAvatar p={p} size={28} />
                    <Two a={p.zh + ' ' + p.en + (me ? ' (you)' : '')} b={p.title + ' · ' + p.org} strong className="flex-1" />
                    {canManage && lastOwner ? <span className="text-caption text-fg-muted">Groups need at least one owner</span> : null}
                    {editable ? <div className="w-32"><Select size="sm" aria-label={'Role for ' + p.en} value={c.role} onChange={v => m.setRole(c.pid, v as Role)} options={[{ value: 'Owner', label: 'Owner' }, { value: 'Editor', label: 'Editor' }, { value: 'Viewer', label: 'Viewer' }]} /></div> : <RoleTag r={c.role} />}
                    {canManage ? (!me && !lastOwner ? <Button variant="text" size="sm" iconOnly startIcon={X} aria-label={'Remove ' + p.en} onClick={() => m.removeCollab(c.pid)} /> : <span className="w-7 shrink-0" aria-hidden />) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </Section>

        <Section title="Members" sub={(n ? plural(n, 'member') + '. ' : '') + 'Paste or type a list and MNP matches each entry to an employee.'}>
          <div className="flex flex-col gap-[var(--layout-space-tight)]">
            {canEdit ? (
              <div className="flex flex-col gap-1">
                <span className="text-body font-medium">Add members</span>
                <RecvInput id="ri-group" ri={ed.ri} setRi={ri => m.setEd({ ri }, true)} groups={app.groups} excludeGroup={ed.id || undefined}
                  isAdded={it => { const p = m.pidsOf(it); return p.length > 0 && p.every(id => has[id]) }}
                  onAdd={it => m.addItem(it)}
                  extra={<Button variant="tertiary" startIcon={FileText} aria-expanded={ed.showPaste} onClick={() => m.setEd({ showPaste: !ed.showPaste }, true)}>{ed.showPaste ? 'Hide list' : 'Paste a list'}</Button>} />
                <span className="text-caption text-fg-secondary">Orgs and groups are added as their current members. Contractors added by phone or email get SMS or Email only.</span>
              </div>
            ) : null}
            {canEdit && ed.showPaste ? (
              <div className="flex flex-col gap-2 rounded-md border border-divider bg-neutral-1 p-3">
                <FormField id="g-input" label="Paste a list" count={inputN ? plural(inputN, 'entry', 'entries') : ''}>
                  <Textarea id="g-input" rows={3} className="font-mono" value={ed.input} onChange={e => m.setEd({ input: e.target.value }, true)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (splitTokens(m.s.ed!.input).length) m.parseMembers() } }}
                    placeholder="NT account, employee ID, name, MVPN, mobile number or org code, e.g. ytchang, 115630, 陳怡君, 66904, 0920-775-641, PLT/UX" />
                </FormField>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-caption text-fg-secondary">Separate entries with commas or new lines. Press Enter to add, Shift+Enter for a new line.</span>
                  <Button variant="link" size="sm" onClick={() => m.setEd({ input: SAMPLE_GROUP }, true)}>Try a sample</Button>
                  <Button variant="primary" startIcon={Wand2} className="ml-auto" disabled={!inputN} onClick={() => m.parseMembers()}>Add members</Button>
                </div>
              </div>
            ) : null}
            {canEdit && fb ? <Feedback m={m} ed={ed} fb={fb} /> : null}

            {/* one compact row: search, then how many members each channel reaches (click a short one to list who's missing) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-72"><Input size="sm" startIcon={Search} type="search" placeholder="Search members" aria-label="Search members" value={ed.mq} onChange={e => m.setEd({ mq: e.target.value, mpage: 1 }, true)} /></div>
              <div role="group" aria-label={'Who can receive each channel'} className="flex flex-wrap items-center gap-1.5">
                {covDefs.map(t => {
                  const miss = n - t.ok, on = ed.mf === t.key, I = t.icon
                  const tip = !n ? t.label + ': add members to see who can get it' : miss ? plural(miss, 'person', 'people') + ' with ' + t.word + (on ? ' · Click to show everyone' : ' · Click to show') : 'Everyone can get ' + t.label
                  return (
                    <Tooltip key={t.key}>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label={t.label + ': ' + fmtN(t.ok) + ' / ' + fmtN(n)} aria-pressed={miss ? on : undefined} aria-disabled={!miss || undefined}
                          onClick={() => { if (miss) m.setEd({ mf: on ? 'all' : t.key, mpage: 1 }, true) }}
                          className={cn('inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-body tabular-nums transition-colors',
                            on ? 'border-primary bg-primary-subtle text-primary' : miss ? 'border-[var(--warning-text)] bg-warning-subtle text-warning-text hover:brightness-95' : 'cursor-default border-divider text-fg-secondary')}>
                          <I className="size-3.5 shrink-0" aria-hidden />
                          <span>{n ? fmtN(t.ok) + ' / ' + fmtN(n) : '—'}</span>
                          {n ? (miss ? <CircleAlert className="size-3.5 shrink-0" aria-hidden /> : <Check className="size-3.5 shrink-0 text-success-text" aria-hidden />) : null}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{tip}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-caption text-fg-secondary"><Lock className="size-3.5" aria-hidden />Personal phone numbers are masked under PIP</span>
            </div>
            <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['who']} columns={mcols as any} data={mrows} bordered height="auto" autoRowHeight getRowId={r => r.p.id}
              rowActions={canEdit ? ((r: MRow) => <Button variant="text" size="xs" iconOnly startIcon={X} aria-label={'Remove ' + r.p.en} onClick={() => m.removeMember(r.p.id)} />) : undefined}
              emptyState={<Empty icon={Users} title={n ? 'No members match' : 'No members yet'} description={n ? 'Try another search, or clear the coverage filter.' : (canEdit ? 'Search above to add people, or pick an org or group to add everyone in it.' : 'This group has no members.')} />} />
            {filt.length ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-body text-fg-secondary">{(st + 1) + '–' + Math.min(filt.length, st + PER) + ' of ' + plural(filt.length, 'member') + (filt.length !== n ? ' (filtered from ' + fmtN(n) + ')' : '')}</span>
                <Pagination total={filt.length} pageSize={PER} page={page} onPageChange={p => m.setEd({ mpage: p }, true)} showTotal={false} prevAriaLabel="Previous page" nextAriaLabel="Next page" />
              </div>
            ) : null}
          </div>
        </Section>
      </div>
      {canEdit ? (
        <div className="sticky bottom-0 z-10 border-t border-divider bg-surface">
          <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
            {canManage && !ed.isNew ? <Button variant="text" danger startIcon={Trash2} onClick={() => m.askDelete(ed.id!)}>Delete group</Button> : null}
            <div className="ml-auto flex gap-2">
              <Button variant="text" onClick={() => m.backFromEd()}>Cancel</Button>
              <Button variant="primary" startIcon={Check} onClick={() => m.saveGroup()}>{ed.isNew ? 'Create group' : 'Save changes'}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Feedback({ m, ed, fb }: { m: GCtl; ed: Ed; fb: Fb }) {
  const have: Record<string, boolean> = {}
  ed.members.forEach(x => { have[x.pid] = true })
  const parts = Object.keys(fb.by).filter(k => fb.by[k]).map(k => fb.by[k] + ' by ' + (k === 'Name' ? 'name' : k === 'NT account' ? 'NT account' : k.charAt(0).toLowerCase() + k.slice(1)))
  ;(fb.orgs || []).forEach(o => parts.push(plural(o.n, 'member') + ' from ' + o.code))
  const okText = fb.added ? 'Added ' + plural(fb.added, 'member') + (parts.length ? ': ' + parts.join(', ') : '') + '.' + (fb.dup ? ' ' + plural(fb.dup, 'entry was', 'entries were') + ' already in the group.' : '') : ''
  const noneText = !fb.added && !fb.amb.length && !fb.miss.length ? (fb.undone ? 'Removed the ' + plural(fb.undone, 'member') + ' you just added.' : fb.dup ? 'Everyone you entered is already in the group.' : '') : ''
  return (
    <div className="flex flex-col gap-2">
      {okText ? <Banner tone="success" action={<Button size="sm" variant="secondary" startIcon={Undo2} onClick={() => m.undoAdd()}>Undo</Button>}>{okText}</Banner> : null}
      {noneText ? <Banner tone="neutral">{noneText}</Banner> : null}
      {fb.amb.map(a => {
        const pk = ed.picks[a.id] || {}
        const cands = a.cands.map(pid => ({ p: PMAP[pid], added: !!have[pid], on: !have[pid] && !!pk[pid] }))
        const k = cands.filter(x => x.on).length
        return (
          <div key={a.id} className="flex flex-col gap-1 rounded-md border border-warning bg-warning-subtle/40 p-2">
            <div className="flex flex-wrap items-center gap-2 px-1">
              <span className="flex-1 text-body">“{a.tok}” matches {a.cands.length} people. Choose who you mean.</span>
              <Button size="sm" variant="text" onClick={() => m.ambSkip(a)}>Skip</Button>
              <Button size="sm" variant="primary" disabled={!k} onClick={() => m.ambAdd(a)}>{k ? 'Add ' + plural(k, 'person', 'people') : 'Add selected'}</Button>
            </div>
            {cands.map(x => (
              <div key={x.p.id} className={cn('flex items-center gap-3 rounded-md bg-surface px-2 py-1.5', x.added && 'opacity-60')}>
                <Checkbox checked={x.on || x.added} disabled={x.added} onCheckedChange={() => m.ambPick(a, x.p.id)} aria-label={x.p.zh + ' ' + x.p.en} />
                <PAvatar p={x.p} /><Two a={x.p.zh + ' ' + x.p.en} b={x.p.title + ' · ' + x.p.org + ' · ' + x.p.emp} strong className="flex-1" />
                {x.added ? <Tag size="sm">Already a member</Tag> : null}
              </div>
            ))}
          </div>
        )
      })}
      {fb.miss.length ? (
        <div className="flex flex-col gap-2 rounded-md border border-divider p-3">
          <div className="flex items-center justify-between gap-2"><span className="text-body font-medium">{plural(fb.miss.length, 'entry', 'entries')} couldn’t be matched</span><Button variant="link" size="sm" onClick={() => m.setEd({ fb: { ...ed.fb!, miss: [] } }, true)}>Dismiss all</Button></div>
          <div className="flex flex-wrap gap-2">
            {fb.miss.map(x => <Tag key={x.id} size="md" color="red" unbounded onRemove={() => m.setEd({ fb: { ...m.s.ed!.fb!, miss: m.s.ed!.fb!.miss.filter(y => y.id !== x.id) } }, true)} removeAriaLabel={'Dismiss ' + x.tok}><span className="font-mono">{x.tok}</span> · {x.why}</Tag>)}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function GroupsPage() {
  const [s, m] = useLogic<GS, GCtl>(() => ({ view: 'list', q: '', own: 'all', cf: null, ed: null }), makeCtl)
  useNavHome(() => { if (m.s.view === 'edit') m.backFromEd() })
  return (
    <>
      {s.view === 'edit' && s.ed ? <GroupEditor m={m} /> : (
        <>
          <PageHeader crumbs={[{ label: 'Audience Group' }]} actions={<Button variant="primary" startIcon={Plus} onClick={() => m.openEd(null)}>Create group</Button>} />
          <GroupList m={m} />
        </>
      )}
      <ConfirmDialog cf={s.cf} onClose={() => m.set({ cf: null })} />
    </>
  )
}
