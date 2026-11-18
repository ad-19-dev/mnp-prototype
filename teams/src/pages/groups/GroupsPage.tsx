// Audience groups: reusable receiver lists. Each belongs to one sending space; everyone in the space can use and edit it.
import * as React from 'react'
import {
  Button, DataTable, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Empty,
  Input, Pagination, Tag, Textarea,
  Checkbox, Tooltip, TooltipContent, TooltipTrigger, cn,
} from '@qijenchen/design-system'
import { ListKindField, NO_HIDE, Trunc, Tip, PageSize, listKindExample } from '../../components/ui'
import { ME_SPACE, groupInSpace, spaceName, spaceTeam } from '../../lib/teams'
import { createColumnHelper } from '@tanstack/react-table'
import {
  Check, Copy, FileText, Lock, Mail, MessageSquareText, Monitor, MoreVertical, Pencil, Plus,
  Search, Smartphone, Trash2, Undo2, Upload, Users, Wand2, X, CircleAlert, BookUser } from 'lucide-react'
import {
  GSEED, ME, PEOPLE, PMAP, LIST_SAMPLES, extPerson, fmtDT, fmtN, maskPhone, membersFor, orgMembers, parseListAs, plural,
  splitTokens, type Group, type ListKind, type Person, type Tag as RTag,
} from '../../lib/data'
import { flash, getApp, setApp, useApp } from '../../lib/store'
import { useLogic, scrollTop } from '../../lib/logic'
import { Banner, CHN, ConfirmDialog, ErrText, FormField, PAvatar, Section, Two, personVal, type Confirm } from '../../components/ui'
import { PageHeader, SpaceIntro, SpaceSettings, useNavHome } from '../../components/shell'
import { RecvInput, riKey, type RiItem, type RiState } from '../../components/RecvInput'
import { AudTable } from '../messages/DetailModal'
import { BatchImportDialog } from '../../components/BatchImport'
import { L, P, tx } from '../../lib/i18n'

type Role = 'Owner' | 'Editor' | 'Viewer'

interface Fb { added: number; by: Record<string, number>; orgs: { code: string; n: number }[]; dup: number; amb: { id: string; tok: string; cands: string[] }[]; miss: { id: string; tok: string; why: string }[]; undo: string[]; undone?: number }
interface Ed {
  id: string | null; isNew: boolean; role: Role; name: string; desc: string; collabs: { pid: string; role: Role }[]; aud: RTag[]
  updated: string; creator: string; team: string | null; input: string; fb: Fb | null; picks: Record<string, Record<string, boolean>>
  cq: string; cOpen: boolean; cRole: Role; mq: string; mf: 'all' | 'dev' | 'desk' | 'email' | 'sms'; mpage: number
  fresh: Record<string, boolean>; tried: boolean; dirty: boolean; ri: RiState; showPaste: boolean; listKind: ListKind | null
}
interface GS { view: 'list' | 'edit'; q: string; cf: Confirm | null; ed: Ed | null }

function makeEd(g: Group | null, dup?: boolean): Ed {
  const base = { listKind: null as ListKind | null, input: '', fb: null, picks: {}, cq: '', cOpen: false, cRole: 'Editor' as Role, mq: '', mf: 'all' as const, mpage: 1, fresh: {}, tried: false, dirty: false, ri: { type: 'person' as const, q: '', open: false, exp: null }, showPaste: false }
  if (!g) return { ...base, id: null, isNew: true, role: 'Owner', name: '', desc: '', collabs: [{ pid: ME, role: 'Owner' }], aud: [], updated: '', creator: ME, team: spaceTeam() }
  const seed = GSEED[g.id] || ({} as any)
  // the audience as added; older groups (a list of people) come in one person per row
  const aud: RTag[] = g.aud ? g.aud.map(t => ({ ...t })) : membersFor(g).map(x => { const p = PMAP[x.pid]; return p && p.extKind ? { key: 'e:' + p.value, type: 'ext' as const, email: p.value } : { key: 'p:' + x.pid, type: 'person' as const, id: x.pid } })
  const collabs = g.collabs ? g.collabs.map(x => ({ pid: x.pid, role: x.role as Role })) : ((seed.col || [[g.creator, 'Owner']]) as [string, Role][]).map(x => ({ pid: x[0], role: x[1] }))
  if (dup) return { ...base, id: null, isNew: true, role: 'Owner', name: (L('Copy of ', '複製 - ') + g.name).slice(0, 50), desc: g.desc, collabs: [{ pid: ME, role: 'Owner' }], aud, updated: '', creator: ME, team: spaceTeam(), dirty: true }
  return { ...base, id: g.id, isNew: false, role: 'Owner', name: g.name, desc: g.desc, collabs, aud, updated: g.updated, creator: g.creator, team: g.team || null }
}

let seq = 0
function makeCtl(get: () => GS, set: (p: Partial<GS> | ((s: GS) => Partial<GS>)) => void) {
  const m = {
    get s() { return get() },
    set,
    setEd(patch: Partial<Ed>, clean?: boolean) { const ed = { ...get().ed!, ...patch }; if (!clean) ed.dirty = true; set({ ed }) },
    listRows() {
      const s = get(), q = s.q.trim().toLowerCase()
      return getApp().groups.filter(g => groupInSpace(g)).filter(g => {
        if (!q) return true
        const cr = PMAP[g.creator] || ({} as any)
        return [g.name, g.desc, cr.en, cr.zh].join(' ').toLowerCase().indexOf(q) >= 0
      }).sort((a, b) => b.updated.localeCompare(a.updated))
    },
    openEd(g: Group | null, dup?: boolean) { set({ view: 'edit', ed: makeEd(g, dup) }); scrollTop() },
    askDelete(id: string) {
      const g = getApp().groups.find(x => x.id === id) || ({ name: '' } as Group)
      set({ cf: { title: L('Delete “' + g.name + '”?', '刪除「' + g.name + '」？'), text: L('No one can use it anymore. Messages already sent aren’t affected.', '刪除後就不能再選這個群組，已送出的訊息不受影響。'), icon: Trash2, tone: 'err', cancel: L('Cancel', '取消'), ok: L('Delete', '刪除'), danger: true, run: () => m.deleteGroup(id) } })
    },
    deleteGroup(id: string) {
      const g = getApp().groups.find(x => x.id === id)
      setApp(s => ({ groups: s.groups.filter(x => x.id !== id) }))
      set({ cf: null, view: 'list', ed: null })
      flash(L('Group deleted', '已刪除群組'), 'ok')
      scrollTop()
    },
    backFromEd() {
      const ed = get().ed
      if (ed && ed.dirty && ed.role !== 'Viewer') {
        set({ cf: { title: L('Discard changes?', '要捨棄變更嗎？'), text: L('Your changes haven’t been saved.', '你的變更還沒儲存。'), icon: CircleAlert, tone: 'warn', cancel: L('Cancel', '取消'), ok: L('Discard', '捨棄'), danger: true, run: () => { set({ cf: null, view: 'list', ed: null }); scrollTop() } } })
        return
      }
      set({ view: 'list', ed: null })
      scrollTop()
    },
    removeTag(key: string) { m.setEd({ aud: get().ed!.aud.filter(x => x.key !== key) }) },
    // from the search: one entry (an org or group stays one row, like the send flow's audience list)
    addItem(it: RiItem) {
      const ed = get().ed!, key = riKey(it)
      if (ed.aud.some(x => x.key === key)) return
      const t: RTag = it.kind === 'ext' ? { key, type: 'ext', email: it.value } : { key, type: it.kind, id: it.id }
      m.setEd({ aud: [t].concat(ed.aud) })
    },
    // from Batch import: several at once; left: entries not added
    addTags(tags: RTag[], left: number) {
      const ed = get().ed!, has: Record<string, boolean> = {}
      ed.aud.forEach(x => { has[x.key] = true })
      const add = tags.filter(t => !has[t.key] && (has[t.key] = true))
      m.setEd({ aud: add.concat(ed.aud) })
      flash(L('Added ', '已加入 ') + P(add.length, 'member', '位成員') + (left ? L(' · ' + left + ' not added', '・' + left + ' 筆未加入') : ''))
    },
    saveGroup() {
      const s = get(), ed = s.ed!, name = ed.name.trim(), groups = getApp().groups
      const dupName = groups.some(g => g.id !== ed.id && groupInSpace(g) && g.name.toLowerCase() === name.toLowerCase())
      if (!name || name.length > 50 || ed.desc.length > 200 || dupName) { m.setEd({ tried: true }, true); flash(L('Check the group name', '請檢查群組名稱'), 'err'); scrollTop(); return }
      if (!ed.aud.length) { m.setEd({ tried: true }, true); flash(L('Add at least one member', '請加入至少一位成員'), 'err'); return }
      const mine = ed.collabs.find(c => c.pid === ME)
      const patch = { team: ed.team, name, desc: ed.desc.trim(), count: membersFor({ aud: ed.aud } as Group, groups).length, updated: fmtDT(new Date()), aud: ed.aud.map(t => ({ ...t })), members: undefined, collabs: ed.collabs.map(c => ({ pid: c.pid, role: c.role })), role: mine ? mine.role : ed.role, fresh: Date.now() }
      if (ed.id) setApp(a => ({ groups: a.groups.map(g => g.id === ed.id ? { ...g, ...patch } : g) }))
      else setApp(a => ({ groups: [{ id: 'gn' + (++seq), creator: ME, ...patch } as Group].concat(a.groups) }))
      set({ view: 'list', ed: null })
      flash(ed.id ? L('Changes saved', '已儲存變更') : L('Group created', '已建立群組'), 'ok')
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
      <DropdownMenuTrigger asChild><Button variant="text" size="xs" iconOnly startIcon={MoreVertical} aria-label={L('Actions for ', '操作：') + g.name} /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" minWidth={208}>
        <DropdownMenuItem startIcon={Pencil} onSelect={() => m.openEd(g)}>{L('Edit', '編輯')}</DropdownMenuItem>
        <DropdownMenuItem startIcon={Copy} onSelect={() => m.openEd(g, true)}>{L('Duplicate', '複製')}</DropdownMenuItem>
        <DropdownMenuSeparator /><DropdownMenuItem startIcon={Trash2} className="text-error-text" onSelect={() => m.askDelete(g.id)}>{L('Delete', '刪除')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function GroupList({ m }: { m: GCtl }) {
  const app = useApp(), s = m.s, rows = m.listRows()
  const nAll = app.groups.filter(g => groupInSpace(g)).length
  const cols = React.useMemo(() => [
    gcol.accessor('name', { header: L('Group', '群組'), meta: { width: 420 }, cell: i => (
      <span className="flex min-w-0 flex-col">
        <Trunc text={i.getValue()} className="font-medium text-primary hover:text-primary-hover hover:underline" onClick={() => m.openEd(i.row.original)} />
        <Trunc text={i.row.original.desc || L('No description', '沒有說明')} className="text-caption text-fg-secondary" />
      </span>
    ) }),
    gcol.accessor('count', { header: L('Members', '人數'), meta: { width: 96 }, cell: i => <span className="font-medium tabular-nums">{fmtN(i.getValue())}</span> }),
    gcol.accessor('updated', { header: L('Updated', '更新時間'), meta: { width: 140 }, cell: i => { const p = i.getValue().split(' '); return <Two a={p[0]} b={p[1]} /> } }),
    // the personal space holds only your own groups, so Created by appears in team spaces only
    ...(app.space === ME_SPACE ? [] : [gcol.accessor(g => personVal(PMAP[g.creator] || PEOPLE[0]), { id: 'creator', header: L('Creator', '建立者'), meta: { width: 200, type: 'person' } })]),
  ], [m, app.lang, app.space])
  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      <SpaceIntro />
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-60 max-w-sm flex-1"><Input startIcon={Search} type="search" placeholder={L('Search groups', '搜尋群組')} aria-label={L('Search groups', '搜尋群組')} value={s.q} onChange={e => m.set({ q: e.target.value })} /></div>
      </div>
      <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['name']} columns={cols as any} data={rows} bordered height="100%" autoRowHeight getRowId={g => g.id}
        rowActions={(g: Group) => <GroupMenu m={m} g={g} />}
        emptyState={<Empty icon={BookUser} title={L('No matching groups', '找不到符合的群組')} description={L('Try another search.', '換個關鍵字試試。')} action={<Button onClick={() => m.set({ q: '' })}>{L('Show all', '顯示全部')}</Button>} />} />
      <span className="text-body text-fg-secondary">{rows.length === nAll ? P(nAll, 'group', '個群組') : L(rows.length + ' of ' + nAll, rows.length + ' / ' + nAll + ' 個群組')}</span>
    </div>
  )
}

// ---------- editor ----------
function GroupEditor({ m }: { m: GCtl }) {
  const [imp, setImp] = React.useState(false)
  const app = useApp(), s = m.s, ed = s.ed!
  const isViewer = false, canEdit = true
  const cr = PMAP[ed.creator] || PEOPLE[0]
  const nm = ed.name.trim(), dupName = app.groups.some(g => g.id !== ed.id && g.name.toLowerCase() === nm.toLowerCase())
  const nameErr = (ed.tried && !nm) ? L('Enter a name.', '請輸入名稱。') : ed.name.length > 50 ? L('Up to 50 characters.', '最多 50 字。') : (nm && dupName) ? L('This name is taken.', '這個名稱已經有人用了。') : ''
  const title = nm || (ed.isNew ? L('New group', '新群組') : L('Untitled group', '未命名群組'))
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader crumbs={[{ label: spaceName(getApp().space), onClick: () => m.backFromEd() }, { label: title }]} actions={<>{ed.isNew ? null : <span className="hidden text-caption text-fg-secondary lg:inline">{L('Updated ' + ed.updated + ' · by ' + cr.en, ed.updated + ' 更新 · 建立者 ' + cr.en)}</span>}</>} />
      <div data-layout-space="lg" className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[calc(var(--layout-space-loose)*2)] p-[var(--layout-space-loose)] pb-[var(--layout-space-bottom)]">
        <Section title={L('Details', '基本資料')}>
          <div className="flex flex-col gap-[var(--layout-space-loose)]">
            <FormField id="g-name" label={L('Name', '名稱')} required count={ed.name.length + ' / 50'} over={ed.name.length > 50} error={nameErr}>
              <Input id="g-name" disabled={isViewer} value={ed.name} error={!!nameErr} onChange={e => m.setEd({ name: e.target.value })} placeholder={L('e.g. Fab 18 drill wardens', '例如：F18 演習引導員')} />
            </FormField>
            <FormField id="g-desc" label={L('Description', '說明')} count={ed.desc.length + ' / 200'} over={ed.desc.length > 200} hint={L('Helps others in this project pick the right group.', '幫助專案裡的其他人選對群組。')}>
              <Textarea id="g-desc" rows={2} disabled={isViewer} value={ed.desc} onChange={e => m.setEd({ desc: e.target.value })} placeholder={L('What this group is for', '這個群組的用途')} />
            </FormField>
          </div>
        </Section>

        <Section title={L('Audience', '收件人')}>
          <div className="flex flex-col gap-[var(--layout-space-tight)]">
            {/* the send flow's search and Batch import; the list below is the send flow's audience list (2026-11-18): an org
                or group is one row with a link to its people, no per-channel columns */}
            <RecvInput id="ri-group" ri={ed.ri} setRi={ri => m.setEd({ ri }, true)} groups={app.groups.filter(g => groupInSpace(g))} excludeGroup={ed.id || undefined}
              isAdded={it => ed.aud.some(x => x.key === riKey(it))}
              onAdd={it => m.addItem(it)}
              extra={<Button variant="tertiary" startIcon={Upload} onClick={() => setImp(true)}>{L('Batch import', '批次匯入')}</Button>} />
            <BatchImportDialog open={imp} onClose={() => setImp(false)} noun="member" opts={{ allowExt: true }}
              has={key => ed.aud.some(x => x.key === key)}
              onAdd={(ok, left) => { setImp(false); m.addTags(ok.map(x => x.tag), left) }} />
            <AudTable tags={ed.aud} onRemove={key => m.removeTag(key)} />
            {ed.tried && !ed.aud.length ? <ErrText>{L('Add at least one member.', '請加入至少一位成員。')}</ErrText> : null}
          </div>
        </Section>
      </div>
      {canEdit ? (
        <div className="sticky bottom-0 z-10 border-t border-divider bg-surface">
          <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
            {!ed.isNew ? <Button variant="text" danger startIcon={Trash2} onClick={() => m.askDelete(ed.id!)}>{L('Delete group', '刪除群組')}</Button> : null}
            <div className="ml-auto flex gap-2">
              <Button variant="text" onClick={() => m.backFromEd()}>{L('Cancel', '取消')}</Button>
              <Button variant="primary" startIcon={Check} onClick={() => m.saveGroup()}>{ed.isNew ? L('Create group', '建立群組') : L('Save', '儲存')}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function GroupsPage() {
  const [s, m] = useLogic<GS, GCtl>(() => ({ view: 'list', q: '', cf: null, ed: null }), makeCtl)
  const { space } = useApp()
  // another space opens on its list
  React.useEffect(() => { m.set({ view: 'list', ed: null, q: '' }) }, [space, m])
  useNavHome(() => { if (m.s.view === 'edit') m.backFromEd() })
  return (
    <>
      {s.view === 'edit' && s.ed ? <GroupEditor m={m} /> : (
        <>
          <PageHeader crumbs={[{ label: spaceName(space) }]} actions={<><Button variant="primary" startIcon={Plus} onClick={() => m.openEd(null)}>{L('New group', '新增群組')}</Button><SpaceSettings /></>} />
          <GroupList m={m} />
        </>
      )}
      <ConfirmDialog cf={s.cf} onClose={() => m.set({ cf: null })} />
    </>
  )
}
