// Messages page controller: list, row actions, the 3-step send flow and its dialogs.
import {
  BLOCKED, CAP, CH_ORDER, DOMAIN, LIM, ME, PMAP, SUPERVISOR, addMin, audToTags, cleanHtml, failList, flatten, fmtDT, fromIso, htmlToText,
  joinList, pad, parseDT, parseListAs, plural, rowChs, splitTokens, tagsToAud, textToHtml, toIso, tplHasEmail,
  type Channel, type Group, type ListKind, type Match, type Row, type Status, type Tag, type Template,
} from '../../lib/data'
import {
  approval, blankCompose, effEmailMode, errs, hasNotif, msgErr, multiPeople, reach, recvFlat, seedEmail, selChs, smsOn,
  stepOk, unresolved, type Compose,
} from '../../lib/compose'
import { flash, getApp, patchRow, setApp } from '../../lib/store'
import { groupInSpace, rowInSpace, spaceName, spaceTeam, tplInSpace } from '../../lib/teams'
import { scrollTop } from '../../lib/logic'
import type { Confirm } from '../../components/ui'
import { CHN, chText } from '../../components/ui'
import { L, P, joinL, niceDT } from '../../lib/i18n'
import { CircleAlert, LayoutTemplate, Trash2, Ban, Send, ShieldAlert } from 'lucide-react'
import type { RiState } from '../../components/RecvInput'

// kind: what the pasted list holds; done: how many were added in the last round, when the not-found ones came back to fix
export interface ImpState { text: string; file: string; res: Match[] | null; picks: Record<number, Record<string, boolean>>; kind: ListKind | null; done: number }
export interface SendState {
  view: 'list' | 'compose'
  // fs / fch: the Status and Channels filter buttons; sender, template and creator are found by search
  q: string; fs: Status[]; fch: Channel[]; page: number
  det: string | null; ns: string | null; cf: Confirm | null
  // reschedule a message whose approval came after its scheduled time
  rs: { id: string; at: string; tried: boolean; k?: Channel } | null
  c: Compose
  ri: RiState; rf: string
  imp: ImpState | null
  num: { draft: Record<string, 'co' | 'pp'> } | null
  sg: { name: string; desc: string; tried: boolean } | null
  stpl: { name: string; tried: boolean } | null
  tp: { q: string } | null
  unr: boolean
  gp: { q: string; tab: 'all' | 'mine' | 'shared'; sel: Record<string, boolean> } | null
}
export const initSend = (): SendState => ({
  view: 'list', q: '', fs: [], fch: [], page: 1, det: null, ns: null, cf: null, rs: null,
  c: blankCompose(), ri: { type: 'person', q: '', open: false, exp: null }, rf: '',
  imp: null, num: null, sg: null, stpl: null, tp: null, unr: false, gp: null,
})

// the name of the open space, for headers and breadcrumbs
// the sender shown in the list: Device Notifications (required) and Desktop OS (optional) carry a sender name; Email doesn't
// three calendar months ahead
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate(), d.getHours(), d.getMinutes())
export const listSender = (r: Row) => (r.channels.indexOf('push') >= 0 || r.channels.indexOf('desktop') >= 0 ? r.sender : '')
// what the filter panel compares, one field per filterable column ('' = no sender name / no template)
export const filterFields = (r: Row) => ({ status: r.status, chs: rowChs(r), sender: listSender(r), tpl: r.tpl || '' })
export const scopeLabel = () => spaceName(getApp().space)

let seq = 0
export type SendCtl = ReturnType<typeof makeSendCtl>

export function makeSendCtl(get: () => SendState, set: (p: Partial<SendState> | ((s: SendState) => Partial<SendState>)) => void) {
  const app = getApp
  let afterNum: number | null = null

  const m = {
    get s() { return get() },
    set,
    setC(patch: Partial<Compose>, clean?: boolean) {
      const c = { ...get().c, ...patch }
      if (!clean) c.dirty = true
      set({ c })
    },
    tplById(id?: string | null) { return app().templates.find(x => x.id === id) },
    tplName(id?: string | null) { const t = m.tplById(id); return t ? t.name : '' },

    // ---------- list ----------
    // the open space's messages: your personal ones, or everything a team's members sent
    visible() { return app().rows.filter(r => rowInSpace(r)) },
    filtered() {
      const s = get(), q = s.q.trim().toLowerCase()
      return m.visible().filter(r => {
        if (s.fs.length && s.fs.indexOf(r.status) < 0) return false
        if (s.fch.length && !rowChs(r).some(k => s.fch.indexOf(k) >= 0)) return false
        if (!q) return true
        const cr = PMAP[r.creator] || ({} as any)
        return [r.sender, m.tplName(r.tpl), r.title, r.content, r.email && r.email.subject, cr.en, cr.zh].join(' ').toLowerCase().indexOf(q) >= 0
      })
    },
    retry(id: string) {
      const r = app().rows.find(x => x.id === id)!
      set({ ns: null, det: null })
      patchRow(id, { status: 'progress', ok: 0, err: null, fresh: Date.now() })
      flash(L('Retrying', '重新傳送中'), 'ok')
      setTimeout(() => patchRow(id, { ok: Math.round(r.total * 0.6) }), 1300)
      setTimeout(() => patchRow(id, { status: 'sent', ok: r.total }), 2800)
    },
    // delete a message that hasn't gone out (scheduled, expired or rejected): the row is removed
    askDelete(r: Row) {
      set({ cf: { title: L('Delete this message?', '要刪除這則訊息嗎？'), text: L('“' + r.title + '” won’t be sent, and it’s removed from the list. This can’t be undone.', '「' + r.title + '」不會送出，也會從列表移除，無法復原。'), icon: Trash2, tone: 'err', cancel: L('Cancel', '取消'), ok: L('Delete', '刪除'), danger: true, run: () => m.deleteRow(r.id) } })
    },
    deleteRow(id: string) {
      const r = app().rows.find(x => x.id === id)!
      setApp(s => ({ rows: s.rows.filter(x => x.id !== id) }))
      set({ cf: null, det: null })
      flash(L('Message deleted', '已刪除訊息'), 'ok')
    },
    // ---------- one channel of a message (the per-channel list acts on one channel at a time) ----------
    // a record's own status (and schedule); "sms" is Device Notifications with its SMS fallback, so both parts
    setCh(id: string, k: Channel, st: Status, sched?: string | null) {
      const r = app().rows.find(x => x.id === id)!, ks: Channel[] = k === 'sms' ? ['push', 'sms'] : [k]
      const chSt = { ...(r.chSt || {}) }, chSched = { ...(r.chSched || {}) }
      ks.forEach(x => { chSt[x] = st; if (sched !== undefined) { if (sched) chSched[x] = sched; else delete chSched[x] } })
      patchRow(id, { chSt, chSched, fresh: Date.now() })
    },
    // Edit content: one channel's text on its own screen; saving changes that channel only
    startEditContent(r: Row, k: Channel) {
      m.startCompose('edit', r)
      m.setC({ only: k, step: 2, maxStep: 2, ch: { push: k === 'push' || k === 'sms', desktop: k === 'desktop', email: k === 'email', sms: k === 'sms' } }, true)
    },
    saveContent() {
      const c = get().c, k = c.only!, id = c.editId!, r = app().rows.find(x => x.id === id)!
      if (msgErr(m.errs())) { m.setC({ tried: { ...(c.tried || {}), 2: true } }, true); return }
      const p: Partial<Row> = { fresh: Date.now() }
      if (k === 'push' || k === 'sms') { p.sender = c.sender.trim(); p.title = c.title.trim(); p.content = c.content.trim(); if (k === 'sms') p.smsText = c.smsText.trim() }
      if (k === 'desktop') { const d = { sender: c.dSender.trim(), title: c.dTitle.trim(), content: c.dContent.trim() }; if (r.channels.indexOf('push') >= 0) p.desk = d; else { p.sender = d.sender; p.title = d.title; p.content = d.content } }
      if (k === 'email') p.email = m.emailOut() as any
      patchRow(id, p)
      set({ view: 'list', cf: null, c: blankCompose() })
      scrollTop()
      flash(L('Content saved', '已儲存內容'), 'ok')
    },
    sendNowCh(id: string, k: Channel) {
      const r = app().rows.find(x => x.id === id)!, ks: Channel[] = k === 'sms' ? ['push', 'sms'] : [k]
      set({ cf: null })
      m.setCh(id, k, 'progress', null)
      flash(L('Sending on ', '傳送中：') + CHN[k].name, 'ok')
      setTimeout(() => { const byCh = { ...(r.byCh || {}) }; ks.forEach(x => { const of = x === 'sms' ? 0 : r.total; byCh[x] = [of, of] }); patchRow(id, { byCh }); m.setCh(id, k, 'sent') }, 2800)
    },
    cancelCh(id: string, k: Channel) {
      set({ cf: null })
      m.setCh(id, k, 'canceled', null)
      flash(L('Canceled on ', '已取消：') + CHN[k].name, 'ok')
    },
    // expired: approved too late for its schedule. Send it now, ignoring the old time
    askSendNow(r: Row) {
      set({ cf: { title: L('Send it now?', '要立即傳送嗎？'), text: L('It goes out right away instead of at ' + r.sched + '. It’s already approved.', '會立刻送出，不再等原訂的 ' + r.sched + '。這則訊息已經核准。'), icon: Send, tone: 'info', cancel: L('Cancel', '取消'), ok: L('Send now', '立即傳送'), run: () => m.sendNow(r.id) } })
    },
    sendNow(id: string) {
      const r = app().rows.find(x => x.id === id)!
      set({ cf: null })
      patchRow(id, { status: 'progress', sched: null, ok: 0, fresh: Date.now() })
      flash(L('Sending to ', '傳送給 ') + P(r.total, 'audience', '位收件人'), 'ok')
      setTimeout(() => patchRow(id, { ok: Math.round(r.total * 0.6) }), 1300)
      setTimeout(() => patchRow(id, { status: 'sent', ok: r.total }), 2800)
    },
    // expired: pick a new time; the approval still holds, so it doesn't go back for review
    openReschedule(r: Row, k?: Channel) { const d = new Date(); set({ rs: { id: r.id, k, at: toIso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 9, 0)), tried: false } }) },
    rescheduleErr() {
      const rs = get().rs, d = rs ? fromIso(rs.at) : null, now = new Date()
      if (!d) return L('Pick a date and time.', '請選擇日期和時間。')
      if (d < now || d > addMonths(now, 3)) return L('Please select a date between now and next 3 months.', '請選擇現在到未來 3 個月內的日期。')
      return ''
    },
    reschedule() {
      const rs = get().rs!
      if (m.rescheduleErr()) { set({ rs: { ...rs, tried: true } }); return }
      const d = fromIso(rs.at)!
      if (rs.k) m.setCh(rs.id, rs.k, 'scheduled', fmtDT(d))
      else patchRow(rs.id, { status: 'scheduled', sched: fmtDT(d), fresh: Date.now() })
      set({ rs: null })
      flash(L('Rescheduled for ', '已改為 ') + niceDT(d), 'ok')
    },
    // delivery per channel; SMS counts the people the device notification missed
    chStats(r: Row) {
      const b = r.byCh || {}
      return rowChs(r).map(k => {
        let v = b[k]
        if (!v) v = k === 'sms' ? [0, Math.max(0, r.total - r.ok)] : (r.status === 'error' ? [0, r.total] : [r.ok, r.total])
        return { k, ok: v[0], of: v[1] }
      })
    },
    resendNotSent(r: Row) {
      // a failed message is retried as is; anything else goes out again as a new message to the people it missed
      if (r.status === 'error') { m.retry(r.id); return }
      const tags: Tag[] = failList(r).map(f => f.ext ? { key: 'e:' + f.ext, type: 'ext' as const, email: f.ext } : { key: 'p:' + f.p!.id, type: 'person' as const, id: f.p!.id })
      m.startCompose('resend', r, tags)
    },

    // ---------- compose: setup ----------
    startCompose(mode: Compose['mode'], r?: Row, recv?: Tag[], only?: Channel) {
      const c = blankCompose()
      c.mode = mode || 'new'
      c.htmlKey = (get().c.htmlKey || 0) + 1
      if (r) {
        // one channel's record (Duplicate, Resend): that channel only, with its own text; otherwise every channel of the row
        c.ch = only ? { push: only === 'push' || only === 'sms', desktop: only === 'desktop', email: only === 'email', sms: only === 'sms' } : { push: r.channels.indexOf('push') >= 0, desktop: r.channels.indexOf('desktop') >= 0, email: r.channels.indexOf('email') >= 0, sms: !!r.sms }
        c.sender = r.sender
        c.tplId = r.tpl || null
        c.smsText = r.smsText || ''
        if (c.ch.push) { c.title = r.title; c.content = r.content }
        if (c.ch.desktop) { const d = r.desk || (c.ch.push ? null : r); c.dSender = d ? d.sender : r.sender; c.dTitle = d ? d.title : r.title; c.dContent = d ? d.content : r.content }
        // an Email that reuses the notification text starts from it
        if (c.ch.email && !(r.email && r.email.mode === 'own')) Object.assign(c, seedEmail(c, r.title, textToHtml(r.content)))
        if (r.email && r.email.mode === 'own') {
          c.emailMode = 'own'
          c.subject = r.email.subject || ''
          c.html = r.email.html || ''
          c.bodyText = htmlToText(r.email.html)
          c.atts = (r.email.atts || []).map(a => ({ id: 'f' + (++seq), name: a.name, size: a.size }))
        }
        c.receivers = audToTags(r.aud)
        c.maxStep = 3
        if (mode === 'edit') { c.editId = r.id; const d = parseDT(r.sched); if (d) { c.sendMode = 'schedule'; c.schedAt = toIso(d) } }
      }
      // a message belongs to the space it's written in
      c.team = spaceTeam()
      if (recv) c.receivers = recv
      set({ view: 'compose', c, det: null, ns: null, cf: null, tp: null, unr: false, rf: '' })
      scrollTop()
    },
    toList() { set({ view: 'list', c: blankCompose(), cf: null }); scrollTop() },
    goList() {
      const s = get()
      if (s.view === 'compose' && s.c.dirty && !s.c.result) {
        const ed = !!s.c.only
        set({ cf: { title: ed ? L('Leave without saving?', '還沒儲存，要離開嗎？') : L('Leave without sending?', '還沒送出，要離開嗎？'), text: ed ? L('Your changes won’t be kept.', '你的修改不會保留。') : L('What you’ve written won’t be kept.', '你填寫的內容不會保留。'), icon: CircleAlert, tone: 'warn', cancel: L('Cancel', '取消'), ok: L('Discard', '捨棄'), danger: true, run: () => m.toList() } })
        return
      }
      m.toList()
    },

    // ---------- receivers ----------
    addRecv(tag: Tag) {
      const c = get().c
      if (c.receivers.some(x => x.key === tag.key)) return
      m.setC({ receivers: c.receivers.concat([tag]) })
    },
    removeRecv(key: string) {
      const c = get().c, pick = { ...c.pick }
      delete pick[key]
      m.setC({ receivers: c.receivers.filter(x => x.key !== key), pick })
    },
    recvTotal() { const f = recvFlat(get().c, app().groups); return f.people.length + f.ext.length },
    reach() { return reach(get().c, app().groups) },
    approval() { return approval(get().c) },
    errs() { return errs(get().c, app().groups) },
    // groups shown first in pickers: this space's, most recently updated first
    groupSuggest() {
      return app().groups.filter(g => groupInSpace(g)).sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 5)
    },
    openGroups() { set({ gp: { q: '', tab: 'all', sel: {} } }) },
    gpToggle(id: string) { const gp = get().gp!; set({ gp: { ...gp, sel: { ...gp.sel, [id]: !gp.sel[id] } } }) },
    gpAdd() {
      const s = get(), ids = Object.keys(s.gp!.sel).filter(k => s.gp!.sel[k])
      const add: Tag[] = ids.filter(id => !s.c.receivers.some(t => t.key === 'g:' + id)).map(id => ({ key: 'g:' + id, type: 'group' as const, id }))
      m.setC({ receivers: s.c.receivers.concat(add) })
      set({ gp: null })
      flash(L('Added ', '已加入 ') + P(add.length, 'group', '個群組'))
    },

    // ---------- channels and message ----------
    pickChannel(id: Channel) {
      const c = get().c, ch = { ...c.ch }
      ch[id] = !ch[id]
      // SMS is only a fallback for Device Notifications
      if (id === 'push' && !ch.push) ch.sms = false
      if (id === 'sms' && ch.sms) ch.push = true
      const p: Partial<Compose> = { ch }
      // Email on its own needs its own text: start it from the notification text
      if (ch.email && !ch.push && !ch.desktop && !c.bodyText.trim() && (c.title.trim() || c.content.trim())) Object.assign(p, seedEmail(c, c.subject || c.title, textToHtml(c.content)))
      m.setC(p)
    },
    setEmailMode(mode: 'same' | 'own') {
      const c = get().c, p: Partial<Compose> = { emailMode: mode }
      if (mode === 'own' && !c.bodyText.trim() && !c.subject.trim()) Object.assign(p, seedEmail(c, c.title, textToHtml(c.content)))
      m.setC(p)
    },
    // fill the email from the notification text, replacing what's there
    copyEmail() { const c = get().c; m.setC({ ...seedEmail({ ...c, subject: '', html: '', bodyText: '' }, c.title, textToHtml(c.content)) }) },
    onEmailInput(html: string, text: string) { m.setC({ html, bodyText: text.trim() ? text : '' }) },
    addFiles(files: File[]) {
      const atts = get().c.atts.slice()
      let err = ''
      files.forEach(f => {
        const ext = (f.name.split('.').pop() || '').toLowerCase(), used = atts.reduce((a, x) => a + x.size, 0)
        if (BLOCKED.indexOf(ext) >= 0) err = L(f.name + ': program files aren’t allowed.', f.name + '：不能附加執行檔。')
        else if (atts.length >= LIM.files) err = L('Up to ' + LIM.files + ' files.', '最多 ' + LIM.files + ' 個檔案。')
        else if (used + f.size > LIM.bytes) err = L(f.name + ' is too big. 10 MB total max.', f.name + ' 太大，附件總共最多 10 MB。')
        else atts.push({ id: 'f' + (++seq), name: f.name, size: f.size })
      })
      m.setC({ atts, attErr: err })
    },
    removeFile(id: string) { m.setC({ atts: get().c.atts.filter(a => a.id !== id), attErr: '' }) },
    copySms() {
      const c = get().c, b = (c.title.trim() ? c.title.trim() + ': ' : '') + c.content.replace(/\s+/g, ' ').trim()
      m.setC({ smsText: b.length > LIM.sms ? b.slice(0, LIM.sms - 1).trim() + '…' : b })
    },

    // ---------- steps ----------
    // show the first problem in place instead of a toast that could cover it
    scrollToErr() {
      setTimeout(() => {
        const el = document.querySelector('[data-compose] [aria-invalid="true"], [data-compose] [data-err]')
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 60)
    },
    goStep(n: number) {
      const c = get().c
      if (n === c.step || n < 1 || n > 3) return
      if (n < c.step) { m.setC({ step: n }, true); scrollTop(); return }
      const e = m.errs()
      for (let k = c.step; k < n; k++) {
        if (!stepOk(k, e)) { m.setC({ step: k, tried: { ...c.tried, [k]: true } }, true); m.scrollToErr(); return }
        if (k === 1 && unresolved(get().c).length) { afterNum = n; m.openNumbers(); return }
      }
      m.setC({ step: n, maxStep: Math.max(c.maxStep, n) }, true)
      scrollTop()
    },
    openNumbers() { set({ num: { draft: { ...get().c.pick } } }) },
    closeNumbers() { afterNum = null; set({ num: null }) },
    numPick(key: string, v: 'co' | 'pp') { set({ num: { draft: { ...get().num!.draft, [key]: v } } }) },
    numAllCo() { const d = { ...get().num!.draft }; multiPeople(get().c).forEach(p => { d['p:' + p.id] = 'co' }); set({ num: { draft: d } }) },
    confirmNum() {
      const d = get().num!.draft, next = afterNum
      afterNum = null
      m.setC({ pick: d })
      set({ num: null })
      if (next && !unresolved(get().c).length) m.goStep(next)
      else flash(L('SMS numbers saved', '已儲存 SMS 號碼'))
    },

    // ---------- templates ----------
    askTemplate(t: Template) {
      const c = get().c, has = (c.title + c.content + c.dTitle + c.dContent + c.smsText + c.subject + c.bodyText).trim()
      if (!has || c.tplId === t.id) { m.applyTemplate(t); return }
      set({ tp: null, cf: { title: L('Replace your text?', '要取代目前的內容嗎？'), text: L('“' + t.name + '” will replace what you’ve written. Audiences and channels stay the same.', '「' + t.name + '」會取代你寫的內容，收件人和通道不變。'), icon: LayoutTemplate, tone: 'warn', cancel: L('Cancel', '取消'), ok: L('Replace', '取代'), run: () => m.applyTemplate(t) } })
    },
    applyTemplate(t: Template, quiet?: boolean) {
      const c = get().c, own = tplHasEmail(t)
      const sub = own ? t.email.subject || '' : (t.title || ''), body = own ? t.email.html || '' : textToHtml(t.content)
      m.setC({ tplId: t.id, sender: t.sender || c.sender, title: t.title || '', content: t.content || '', dSender: t.sender || c.dSender, dTitle: t.title || '', dContent: t.content || '', smsText: t.sms || '', emailMode: own ? 'own' : 'same', ...seedEmail(c, sub, body) })
      set({ tp: null, cf: null })
      if (!quiet) flash(L('Template applied', '已套用模板'), 'ok')
    },
    clearTemplate() { m.setC({ tplId: null }); flash(L('Template removed. Your text stays.', '已取消模板，內容保留。')) },

    // ---------- sending ----------
    submit(confirmed?: boolean) {
      const c = get().c, e = m.errs()
      for (let k = 1; k <= 3; k++) {
        if (!stepOk(k, e)) { m.setC({ step: k, tried: { ...c.tried, [k]: true } }, true); m.scrollToErr(); return }
      }
      if (unresolved(c).length) { m.openNumbers(); return }
      const ap = approval(c)
      // skipping ICSD is confirmed separately: it can't be undone and it's logged on the message
      if (ap.skipped && !confirmed) {
        const me = PMAP[ME]
        set({ cf: { title: L('Send without SMS approval?', '要略過 SMS 核准直接送出嗎？'), text: L('Only for urgent, important messages. This request will be kept on record.', '僅限緊急且重要的訊息，此次申請將會留存紀錄。'),
          rows: [{ k: L('Logged as', '記錄為'), v: me.en + ' ' + me.zh + ' · ' + fmtDT(new Date()) }, { k: L('Notified', '通知對象'), v: L('The SMS reviewer and your supervisor, ' + SUPERVISOR, 'SMS 審核人員和你的主管 ' + SUPERVISOR) }],
          icon: ShieldAlert, tone: 'warn', cancel: L('Cancel', '取消'), ok: L('Skip approval and send', '略過核准並送出'), danger: true, run: () => { set({ cf: null }); m.submit(true) } } })
        return
      }
      // waiting for approval: back to the list with a short toast (no result page)
      if (ap.need) { m.doSend({ by: ap.icsd && ap.mgr ? 'both' : ap.icsd ? 'icsd' : 'mgr' }); return }
      m.doSend()
    },
    emailOut() {
      const c = get().c
      if (!c.ch.email) return null
      return effEmailMode(c) === 'own' ? { mode: 'own' as const, subject: c.subject.trim(), html: cleanHtml(c.html), atts: c.atts.map(a => ({ name: a.name, size: a.size })) } : { mode: 'same' as const }
    },
    // review: the message waits for approval instead of going out
    doSend(review?: NonNullable<Row['review']>) {
      const c = get().c, now = new Date(), rc = m.reach(), hasN = hasNotif(c)
      const schedD = c.sendMode === 'schedule' ? fromIso(c.schedAt) : null, em = m.emailOut()
      const channels = CH_ORDER.filter(k => k !== 'sms' && c.ch[k])
      const why: string[] = []
      if (c.ch.push) why.push('app unregistered')
      if (c.ch.desktop) why.push('no desktop agent')
      const reason = why.length ? why.join(' and ').replace(/^./, x => x.toUpperCase()) : 'Not delivered' // stored in English; shown through tx()
      const base: Partial<Row> = {
        sender: c.ch.push ? c.sender.trim() : c.ch.desktop ? c.dSender.trim() : '', tpl: c.tplId, team: c.team,
        title: c.ch.push ? c.title.trim() : c.ch.desktop ? c.dTitle.trim() : (em as any).subject, content: c.ch.push ? c.content.trim() : c.ch.desktop ? c.dContent.trim() : htmlToText((em as any).html),
        desk: c.ch.push && c.ch.desktop ? { sender: c.dSender.trim(), title: c.dTitle.trim(), content: c.dContent.trim() } : null,
        smsText: smsOn(c) ? c.smsText.trim() : '', channels, sms: smsOn(c), email: em,
        bypass: smsOn(c) && c.urgent ? { by: ME, at: fmtDT(now), reason: c.urgentReason.trim() } : null,
        total: rc.total, ok: 0, aud: tagsToAud(c.receivers), fresh: Date.now(), _f: null, err: null, byCh: null,
        fw: rc.unr.map(p => p.id), fr: [[reason]],
        status: review ? 'pending' : schedD ? 'scheduled' : 'progress', sched: schedD ? fmtDT(schedD) : null, review: review || null,
      }
      let id: string
      if (c.mode === 'edit' && c.editId) { id = c.editId; setApp(s => ({ rows: s.rows.map(r => r.id === id ? { ...r, ...base } as Row : r) })) }
      else { id = 'n' + (++seq); setApp(s => ({ rows: [{ id, creator: ME, created: fmtDT(now), ...base } as Row].concat(s.rows) })) }
      set({ view: 'list', cf: null, c: blankCompose(), page: 1, q: '', fs: [], fch: [] })
      scrollTop()
      if (review) { flash(L('Sent for approval', '已送出審核'), 'ok'); return }
      if (schedD) { flash(L('Scheduled for ', '已排程：') + niceDT(schedD)); return }
      flash(L('Sending to ', '傳送給 ') + P(rc.total, 'audience', '位收件人'), 'ok')
      const byCh: Partial<Record<Channel, [number, number]>> = {}
      if (c.ch.push) byCh.push = [rc.push, rc.people]
      if (c.ch.sms) byCh.sms = [rc.sms, rc.extP + (c.ch.push ? rc.noDev : 0)]
      if (c.ch.desktop) byCh.desktop = [rc.desktop, rc.people]
      if (c.ch.email) byCh.email = [rc.email, rc.total]
      setTimeout(() => patchRow(id, { ok: Math.round(rc.reachable * 0.55) }), 1400)
      setTimeout(() => patchRow(id, { status: 'sent', ok: rc.reachable, byCh }), 3000)
    },
    sendTest() {
      if (msgErr(m.errs())) { m.setC({ tried: { ...get().c.tried, 2: true } }, true); flash(L('Finish the message first', '請先完成訊息內容'), 'err'); return }
      const c = get().c, where: string[] = []
      if (c.ch.push) where.push(L('your phone', '你的手機'))
      if (c.ch.desktop) where.push(L('your PC', '你的電腦'))
      if (c.ch.email) where.push('gywu@' + DOMAIN)
      flash(L('Test sent', '已寄出測試'), 'ok')
    },
    openSaveTpl() {
      if (msgErr(m.errs())) { m.setC({ tried: { ...get().c.tried, 2: true } }, true); flash(L('Finish the message first', '請先完成訊息內容'), 'err'); return }
      set({ stpl: { name: '', tried: false } })
    },
    saveTpl() {
      const s = get(), st = s.stpl!, name = st.name.trim(), c = s.c, templates = app().templates
      if (!name || name.length > LIM.name || templates.some(t => tplInSpace(t) && t.name.toLowerCase() === name.toLowerCase())) { set({ stpl: { ...st, tried: true } }); return }
      const hasN = hasNotif(c), em = m.emailOut()
      const t: Template = { id: 'tn' + (++seq), team: c.team, name, sender: (c.ch.push ? c.sender : c.dSender).trim(), title: hasN ? (c.ch.push ? c.title : c.dTitle).trim() : '', content: hasN ? (c.ch.push ? c.content : c.dContent).trim() : '', sms: smsOn(c) ? c.smsText.trim() : '', email: em && em.mode === 'own' ? { mode: 'own', subject: em.subject, html: em.html } : { mode: 'same' }, shared: [], updated: fmtDT(new Date()).slice(0, 10), owner: ME, fresh: Date.now() }
      setApp({ templates: [t].concat(templates) })
      set({ stpl: null })
      m.setC({ tplId: t.id }, true)
      flash(L('Template saved', '已存成模板'), 'ok')
    },
    saveGroup() {
      const s = get(), sg = s.sg!, name = sg.name.trim(), groups = app().groups
      if (!name || name.length > 50 || sg.desc.length > 200 || groups.some(g => groupInSpace(g) && g.name.toLowerCase() === name.toLowerCase())) { set({ sg: { ...sg, tried: true } }); return }
      const members = flatten(s.c.receivers, groups)
      const g = { id: 'gs' + (++seq), team: s.c.team, name, desc: sg.desc.trim(), count: members.length, updated: fmtDT(new Date()), creator: ME, role: 'Owner' as const, members, collabs: [{ pid: ME, role: 'Owner' }], fresh: Date.now() }
      setApp({ groups: [g as Group].concat(groups) })
      set({ sg: null })
      flash(L('Group saved', '已存成群組'), 'ok')
    },
    askRemoveAll() {
      set({ cf: { title: L('Remove all audiences?', '移除所有收件人？'), text: L('Channels and text stay the same.', '通道和內容不受影響。'), icon: Trash2, tone: 'warn', cancel: L('Cancel', '取消'), ok: L('Remove all', '全部移除'), danger: true, run: () => { m.setC({ receivers: [], pick: {} }); set({ cf: null }) } } })
    },

    // ---------- batch import ----------
    openImport() { set({ imp: { text: '', file: '', res: null, picks: {}, kind: null, done: 0 } }) },
    setImp(p: Partial<ImpState>) { set({ imp: { ...get().imp!, ...p } }) },
    identify() { const imp = get().imp!; if (!imp.kind) return; m.setImp({ res: parseListAs(imp.text, imp.kind, { allowExt: true }), picks: {} }) },
    // put the entries that weren't found back in the box, to fix and match again
    impFixMissing(done = 0) { const imp = get().imp!, miss = m.impSets().miss.map(x => x.tok!); m.setImp({ text: miss.join('\n'), file: '', res: null, picks: {}, done }) },
    impSets() {
      const s = get(), imp = s.imp!, have: Record<string, boolean> = {}, seen: Record<string, boolean> = {}
      const ready: { m: Match; tag: Tag }[] = [], amb: { m: Match & { kind: 'amb' }; i: number }[] = [], miss: (Match & { kind: 'miss' })[] = []
      let dup = 0
      s.c.receivers.forEach(t => { have[t.key] = true })
      ;(imp.res || []).forEach((x, i) => {
        if (x.kind === 'one' || x.kind === 'org' || x.kind === 'ext') {
          const tag: Tag = x.kind === 'one' ? { key: 'p:' + x.p.id, type: 'person', id: x.p.id } : x.kind === 'org' ? { key: 'o:' + x.org.code, type: 'org', id: x.org.code } : { key: 'e:' + x.email, type: 'ext', email: x.email }
          if (have[tag.key] || seen[tag.key]) { dup++; return }
          seen[tag.key] = true
          ready.push({ m: x, tag })
        } else if (x.kind === 'amb') amb.push({ m: x, i })
        else miss.push(x)
      })
      return { ready, amb, miss, dup, have, seen }
    },
    impPick(i: number, pid: string) {
      const picks = { ...get().imp!.picks }, cur = { ...(picks[i] || {}) }
      cur[pid] = !cur[pid]
      picks[i] = cur
      m.setImp({ picks })
    },
    impAdd() {
      const s = get(), imp = s.imp!, sets = m.impSets(), tags = sets.ready.map(x => x.tag)
      sets.amb.forEach(a => {
        const pk = imp.picks[a.i] || {}
        a.m.cands.forEach(p => { const key = 'p:' + p.id; if (pk[p.id] && !sets.have[key] && !sets.seen[key] && !tags.some(t => t.key === key)) tags.push({ key, type: 'person', id: p.id }) })
      })
      m.setC({ receivers: s.c.receivers.concat(tags) })
      if (sets.miss.length) { m.impFixMissing(tags.length); return }
      set({ imp: null })
      flash(L('Added ', '已加入 ') + P(tags.length, 'audience', '位收件人'))
    },
    onImpFile(f?: File) {
      if (!f) return
      const rd = new FileReader()
      rd.onload = () => m.setImp({ text: String(rd.result || ''), file: f.name, res: null })
      rd.onerror = () => flash(L('Can’t read that file. Use .csv or .txt.', '無法讀取檔案，請用 .csv 或 .txt。'), 'err')
      rd.readAsText(f)
    },
    tokenCount(text: string) { return splitTokens(text).length },
    over: (n: number) => n > CAP,
  }
  return m
}
