// Teams: the people who send as one unit. A team owns messages, templates and audience groups,
// and everything it owns is visible to all of its members (rules in lib/teams.ts).
import * as React from 'react'
import { Button, DataTable, Empty, Input, Popover, PopoverAnchor, PopoverContent, Select, Tag, Textarea } from '@qijenchen/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { Check, CircleAlert, LayoutTemplate, LogOut, Plus, Send, UserPlus, Users, X } from 'lucide-react'
import { ME, PEOPLE, PMAP, fmtN, type Team, type TeamRole } from '../../lib/data'
import { flash, getApp, go, setApp, useApp } from '../../lib/store'
import { useLogic, scrollTop } from '../../lib/logic'
import { ConfirmDialog, FormField, NO_HIDE, PAvatar, Section, Trunc, Two, type Confirm } from '../../components/ui'
import { PageHeader, useNavHome } from '../../components/shell'
import { L, P } from '../../lib/i18n'

interface TEd { id: string | null; name: string; desc: string; members: { pid: string; role: TeamRole }[]; q: string; open: boolean; tried: boolean; dirty: boolean }
interface TS { view: 'list' | 'edit'; ed: TEd | null; cf: Confirm | null }

const roleOf = (t: { members: { pid: string; role: TeamRole }[] }, pid = ME) => t.members.find(x => x.pid === pid)?.role
const owned = (id: string) => {
  const a = getApp()
  return { msgs: a.rows.filter(r => r.team === id).length, tpls: a.templates.filter(t => t.team === id).length, groups: a.groups.filter(g => g.team === id).length }
}
const RoleTag = ({ r }: { r?: TeamRole }) => r === 'admin' ? <Tag size="sm" color="blue">{L('Admin', '管理員')}</Tag> : <Tag size="sm">{L('Member', '成員')}</Tag>

let seq = 0
function makeCtl(get: () => TS, set: (p: Partial<TS> | ((s: TS) => Partial<TS>)) => void) {
  const m = {
    get s() { return get() },
    set,
    setEd(patch: Partial<TEd>, clean?: boolean) { const ed = { ...get().ed!, ...patch }; if (!clean) ed.dirty = true; set({ ed }) },
    open(t: Team | null) {
      const ed: TEd = t
        ? { id: t.id, name: t.name, desc: t.desc, members: t.members.map(x => ({ ...x })), q: '', open: false, tried: false, dirty: false }
        : { id: null, name: '', desc: '', members: [{ pid: ME, role: 'admin' }], q: '', open: false, tried: false, dirty: false }
      set({ view: 'edit', ed }); scrollTop()
    },
    back() {
      const ed = get().ed
      if (ed && ed.dirty) {
        set({ cf: { title: L('Discard changes?', '要捨棄變更嗎？'), text: L('Your changes haven’t been saved.', '你的變更還沒儲存。'), icon: CircleAlert, tone: 'warn', cancel: L('Keep editing', '繼續編輯'), ok: L('Discard', '捨棄'), danger: true, run: () => { set({ view: 'list', ed: null, cf: null }); scrollTop() } } })
        return
      }
      set({ view: 'list', ed: null }); scrollTop()
    },
    candidates() {
      const ed = get().ed!, q = ed.q.trim().toLowerCase()
      if (!q) return []
      return PEOPLE.filter(p => !ed.members.some(x => x.pid === p.id) && [p.zh, p.en, p.nt, p.emp, p.org].join(' ').toLowerCase().indexOf(q) >= 0).slice(0, 6)
    },
    add(pid: string) { const ed = get().ed!; m.setEd({ members: ed.members.concat([{ pid, role: 'member' }]), q: '', open: false }) },
    remove(pid: string) { const ed = get().ed!; m.setEd({ members: ed.members.filter(x => x.pid !== pid) }) },
    setRole(pid: string, role: TeamRole) { const ed = get().ed!; m.setEd({ members: ed.members.map(x => x.pid === pid ? { ...x, role } : x) }) },
    save() {
      const ed = get().ed!, name = ed.name.trim()
      const dup = getApp().teams.some(t => t.id !== ed.id && t.name.toLowerCase() === name.toLowerCase())
      if (!name || name.length > 50 || dup) { m.setEd({ tried: true }, true); return }
      const patch = { name, desc: ed.desc.trim(), members: ed.members }
      if (ed.id) setApp(a => ({ teams: a.teams.map(t => t.id === ed.id ? { ...t, ...patch } : t) }))
      else setApp(a => ({ teams: a.teams.concat([{ id: 'tn' + (++seq), created: new Date().toISOString().slice(0, 10).replace(/-/g, '/'), ...patch }]) }))
      set({ view: 'list', ed: null })
      flash(ed.id ? L('Changes saved', '已儲存變更') : L('Team created', '已建立團隊'), 'ok', name + ' · ' + P(patch.members.length, 'member', '人'))
      scrollTop()
    },
    // leaving: the team keeps what it owns; you keep read-only access to the messages you sent for it
    askLeave(t: Team) {
      const admins = t.members.filter(x => x.role === 'admin')
      if (roleOf(t) === 'admin' && admins.length === 1 && t.members.length > 1) {
        set({ cf: { title: L('Make someone else an admin first', '請先指定另一位管理員'), text: L('You’re the only admin of ' + t.name + '. Give another member the admin role, then leave.', '你是「' + t.name + '」唯一的管理員。請先把另一位成員設為管理員，再離開團隊。'), icon: CircleAlert, tone: 'warn', cancel: L('Close', '關閉'), ok: L('Got it', '知道了'), run: () => set({ cf: null }) } })
        return
      }
      const mine = getApp().rows.filter(r => r.team === t.id && r.creator === ME).length
      set({ cf: {
        title: L('Leave ' + t.name + '?', '要離開「' + t.name + '」嗎？'),
        text: L('You’ll no longer see this team’s messages, templates and groups. An admin can add you back.', '離開後你會看不到這個團隊的訊息、模板和群組，管理員可以再把你加回來。'),
        rows: [{ k: L('You keep', '你仍保有'), v: mine ? L(P(mine, 'message', '') + ' you sent for the team, to view and duplicate', '你以團隊名義送出的 ' + mine + ' 則訊息（只能查看和複製）') : L('Nothing; you haven’t sent for this team', '沒有，你沒有以這個團隊發過訊息') },
               { k: L('The team keeps', '團隊保留'), v: L('Everything it owns, including your messages', '團隊擁有的所有內容，包括你送出的訊息') }],
        icon: LogOut, tone: 'warn', cancel: L('Stay', '留下'), ok: L('Leave team', '離開團隊'), danger: true,
        run: () => {
          setApp(a => ({ teams: a.teams.map(x => x.id === t.id ? { ...x, members: x.members.filter(y => y.pid !== ME) } : x).filter(x => x.members.length > 0) }))
          set({ cf: null, view: 'list', ed: null })
          flash(L('You left ' + t.name, '已離開「' + t.name + '」'))
          scrollTop()
        },
      } })
    },
    // jump to what the team owns, with the list filtered to it
    show(page: 'send' | 'templates' | 'groups', id: string) { setApp({ presetTeam: id }); go(page) },
  }
  return m
}
type TCtl = ReturnType<typeof makeCtl>

const tcol = createColumnHelper<Team>()
function TeamList({ m }: { m: TCtl }) {
  const app = useApp(), mine = app.teams.filter(t => roleOf(t))
  const cols = React.useMemo(() => [
    tcol.accessor('name', { header: L('Team', '團隊'), meta: { width: 320 }, cell: i => (
      <span className="flex min-w-0 flex-col">
        <Trunc text={i.getValue()} className="font-medium text-primary hover:text-primary-hover hover:underline" onClick={() => m.open(i.row.original)} />
        <Trunc text={i.row.original.desc || L('No description', '沒有說明')} className="text-caption text-fg-secondary" />
      </span>
    ) }),
    tcol.display({ id: 'role', header: L('Your role', '你的角色'), meta: { width: 120 }, cell: i => <RoleTag r={roleOf(i.row.original)} /> }),
    tcol.display({ id: 'n', header: L('Members', '成員'), meta: { width: 160 }, cell: i => {
      const t = i.row.original
      return <span className="flex items-center gap-2"><span className="flex -space-x-1.5">{t.members.slice(0, 4).map(x => PMAP[x.pid] ? <span key={x.pid} className="rounded-full ring-2 ring-surface"><PAvatar p={PMAP[x.pid]} /></span> : null)}</span><span className="tabular-nums text-fg-secondary">{fmtN(t.members.length)}</span></span>
    } }),
    tcol.display({ id: 'own', header: L('Owns', '擁有'), meta: { width: 300 }, cell: i => {
      const t = i.row.original, o = owned(t.id)
      const link = (n: number, en: string, zh: string, page: 'send' | 'templates' | 'groups') => <Button variant="link" size="sm" className="!h-auto !px-0" onClick={() => m.show(page, t.id)}>{L(fmtN(n) + ' ' + en, fmtN(n) + ' ' + zh)}</Button>
      return <span className="flex flex-wrap items-center gap-x-3">{link(o.msgs, o.msgs === 1 ? 'message' : 'messages', '則訊息', 'send')}{link(o.tpls, o.tpls === 1 ? 'template' : 'templates', '個模板', 'templates')}{link(o.groups, o.groups === 1 ? 'group' : 'groups', '個群組', 'groups')}</span>
    } }),
    tcol.accessor('created', { header: L('Created', '建立日期'), meta: { width: 120 } }),
  ], [m, app.lang, app.teams, app.rows, app.templates, app.groups])
  return (
    <div className="flex h-full flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)]">
      <p className="text-body text-fg-secondary">{L('A team’s messages, templates and groups are visible to all its members.', '團隊的訊息、模板和群組，所有成員都看得到。')}</p>
      <DataTable tableOptions={NO_HIDE} pinnedLeftColumns={['name']} columns={cols as any} data={mine} bordered height="100%" autoRowHeight getRowId={t => t.id}
        emptyState={<Empty icon={Users} title={L('You’re not in a team yet', '你還沒有加入團隊')} description={L('Create one, or ask a team admin to add you.', '建立一個團隊，或請團隊管理員把你加進去。')} action={<Button variant="primary" startIcon={Plus} onClick={() => m.open(null)}>{L('New team', '建立團隊')}</Button>} />} />
      <span className="text-body text-fg-secondary">{P(mine.length, 'team', '個團隊')}</span>
    </div>
  )
}

function TeamEditor({ m }: { m: TCtl }) {
  const app = useApp(), ed = m.s.ed!, saved = ed.id ? app.teams.find(t => t.id === ed.id) || null : null
  const admin = !ed.id || roleOf(saved || ed) === 'admin', admins = ed.members.filter(x => x.role === 'admin').length
  const dup = app.teams.some(t => t.id !== ed.id && t.name.toLowerCase() === ed.name.trim().toLowerCase())
  const nameErr = ed.tried && !ed.name.trim() ? L('Enter a name.', '請輸入名稱。') : ed.name.length > 50 ? L('Use 50 characters or fewer.', '最多 50 個字。') : ed.tried && dup ? L('Another team already uses this name.', '已有團隊使用這個名稱。') : ''
  const cands = m.candidates(), anchor = React.useRef<HTMLDivElement>(null), o = ed.id ? owned(ed.id) : null
  const title = ed.name.trim() || (ed.id ? L('Untitled team', '未命名團隊') : L('New team', '新團隊'))
  return (
    <div className="flex min-h-full flex-col">
      <PageHeader crumbs={[{ label: L('Teams', '團隊'), onClick: () => m.back() }, { label: title }]} actions={ed.id ? <RoleTag r={roleOf(saved || ed)} /> : null} />
      <div data-layout-space="lg" className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-[var(--layout-space-loose)] p-[var(--layout-space-loose)] pb-[var(--layout-space-bottom)]">
        <Section title={L('Details', '基本資料')}>
          <div className="flex flex-col gap-[var(--layout-space-loose)]">
            <FormField id="tm-name" label={L('Name', '名稱')} required count={ed.name.length + ' / 50'} over={ed.name.length > 50} error={nameErr}>
              <Input id="tm-name" disabled={!admin} value={ed.name} error={!!nameErr} onChange={e => m.setEd({ name: e.target.value })} placeholder={L('e.g. Fab 18 Communications', '例如：Fab 18 Communications')} />
            </FormField>
            <FormField id="tm-desc" label={L('Description', '說明')} count={ed.desc.length + ' / 200'} over={ed.desc.length > 200}>
              <Textarea id="tm-desc" rows={2} disabled={!admin} value={ed.desc} onChange={e => m.setEd({ desc: e.target.value })} placeholder={L('What this team sends', '這個團隊負責發送什麼')} />
            </FormField>
          </div>
        </Section>

        <Section title={L('Members', '成員')} sub={P(ed.members.length, 'member', '人') + L(' · Admins manage members and can change any of the team’s messages.', '・管理員能管理成員，也能修改團隊的任何訊息。')}>
          <div className="flex flex-col gap-[var(--layout-space-tight)]">
            {admin ? (
              <Popover open={ed.open && !!ed.q.trim()} onOpenChange={x => { if (!x) m.setEd({ open: false }, true) }}>
                <PopoverAnchor asChild>
                  <div ref={anchor}>
                    <Input startIcon={UserPlus} autoComplete="off" placeholder={L('Add people by name, NT account or employee ID', '用姓名、NT 帳號或工號加入成員')} aria-label={L('Add members', '加入成員')} value={ed.q}
                      onChange={e => m.setEd({ q: e.target.value, open: true }, true)}
                      onKeyDown={e => { if (e.key === 'Escape') m.setEd({ open: false }, true); if (e.key === 'Enter' && cands[0]) { e.preventDefault(); m.add(cands[0].id) } }} />
                  </div>
                </PopoverAnchor>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1" onOpenAutoFocus={e => e.preventDefault()} onInteractOutside={e => { if (anchor.current?.contains(e.target as Node)) e.preventDefault() }}>
                  {cands.length ? cands.map(p => (
                    <button key={p.id} type="button" onClick={() => m.add(p.id)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-neutral-hover">
                      <PAvatar p={p} size={28} /><Two a={p.zh + ' ' + p.en} b={p.title + ' · ' + p.org} strong className="flex-1" />
                    </button>
                  )) : <div className="px-3 py-3 text-body text-fg-secondary">{L('No match for “' + ed.q.trim() + '”.', '找不到「' + ed.q.trim() + '」。')}</div>}
                </PopoverContent>
              </Popover>
            ) : null}
            <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">
              {ed.members.map(x => {
                const p = PMAP[x.pid], me = x.pid === ME, lastAdmin = x.role === 'admin' && admins === 1
                if (!p) return null
                return (
                  <div key={x.pid} className="flex min-h-12 items-center gap-3 px-3 py-2">
                    <PAvatar p={p} size={28} />
                    <Two a={p.zh + ' ' + p.en + (me ? L(' (you)', '（你）') : '')} b={p.title + ' · ' + p.org} strong className="flex-1" />
                    {admin && !lastAdmin ? (
                      <div className="w-32"><Select size="sm" aria-label={L('Role for ', '角色：') + p.en} value={x.role} onChange={v => m.setRole(x.pid, v as TeamRole)} options={[{ value: 'admin', label: L('Admin', '管理員') }, { value: 'member', label: L('Member', '成員') }]} /></div>
                    ) : <RoleTag r={x.role} />}
                    {admin ? (!me && !lastAdmin ? <Button variant="text" size="sm" iconOnly startIcon={X} aria-label={L('Remove ', '移除 ') + p.en} onClick={() => m.remove(x.pid)} /> : <span className="w-7 shrink-0" aria-hidden />) : null}
                  </div>
                )
              })}
            </div>
            {!admin ? <p className="text-caption text-fg-secondary">{L('Only admins can add or remove members.', '只有管理員能加入或移除成員。')}</p> : null}
          </div>
        </Section>

        {o && ed.id ? (
          <Section title={L('What this team owns', '團隊擁有的內容')} sub={L('Everyone in the team can see these.', '團隊成員都看得到這些內容。')}>
            <div className="grid gap-[var(--layout-space-tight)] sm:grid-cols-3">
              {([['send', Send, o.msgs, 'messages', '則訊息'], ['templates', LayoutTemplate, o.tpls, 'templates', '個模板'], ['groups', Users, o.groups, 'audience groups', '個收件群組']] as const).map(([page, I, n, en, zh]) => (
                <button key={page} type="button" onClick={() => m.show(page, ed.id!)} className="flex items-center gap-3 rounded-lg border border-divider p-3 text-left hover:border-border-hover focus-visible:outline-2 focus-visible:outline-ring">
                  <I className="size-5 text-fg-secondary" aria-hidden />
                  <span className="flex flex-col"><span className="text-h5 font-semibold tabular-nums">{fmtN(n)}</span><span className="text-caption text-fg-secondary">{L(en, zh)}</span></span>
                </button>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
      <div className="sticky bottom-0 z-10 border-t border-divider bg-surface">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-[var(--layout-space-loose)] py-[var(--layout-space-tight)]">
          {saved ? <Button variant="text" danger startIcon={LogOut} onClick={() => m.askLeave(saved)}>{L('Leave team', '離開團隊')}</Button> : null}
          <div className="ml-auto flex gap-2">
            <Button variant="text" onClick={() => m.back()}>{admin ? L('Cancel', '取消') : L('Back', '返回')}</Button>
            {admin ? <Button variant="primary" startIcon={Check} onClick={() => m.save()}>{ed.id ? L('Save', '儲存') : L('Create team', '建立團隊')}</Button> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TeamsPage() {
  const [s, m] = useLogic<TS, TCtl>(() => ({ view: 'list', ed: null, cf: null }), makeCtl)
  useNavHome(() => { if (m.s.view === 'edit') m.back() })
  return (
    <>
      {s.view === 'edit' && s.ed ? <TeamEditor m={m} /> : (
        <>
          <PageHeader crumbs={[{ label: L('Teams', '團隊') }]} actions={<Button variant="primary" startIcon={Plus} onClick={() => m.open(null)}>{L('New team', '建立團隊')}</Button>} />
          <TeamList m={m} />
        </>
      )}
      <ConfirmDialog cf={s.cf} onClose={() => m.set({ cf: null })} />
    </>
  )
}
