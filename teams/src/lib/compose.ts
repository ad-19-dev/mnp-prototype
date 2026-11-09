// Send flow state and rules: receivers, reach per channel, approvals and validation.
import {
  CAP, CH_ORDER, ICSD, LIM, ORGS, PMAP, SUPERVISOR, addMin, flatten, fromIso, fmtN, htmlToText, isExtPhone, joinList, plural,
  tplHasEmail, tplHasNotif, type Channel, type Group, type Person, type Tag, type Template,
} from './data'
import { L, P, joinL } from './i18n'

export interface Att { id: string; name: string; size: number }
export interface Compose {
  mode: 'new' | 'edit' | 'duplicate' | 'resend'
  editId: string | null
  // Edit content: only this channel's content, on its own screen (no steps, audiences or other channels)
  only: Channel | null
  step: number
  maxStep: number
  receivers: Tag[]
  pick: Record<string, 'co' | 'pp'>
  // SMS fallback, per audience row (key), as in GMC: the company phone is ticked by default (smsCO false = unticked),
  // the personal phone only when ticked
  smsCO: Record<string, boolean>; smsPP: Record<string, boolean>
  ch: Record<Channel, boolean>
  tplId: string | null
  // who the message belongs to: a team (all its members see it) or null for personal
  team: string | null
  // Device Notifications text, and Desktop OS's own (kept short so the pop-up shows it all)
  sender: string; title: string; content: string; smsText: string
  dSender: string; dTitle: string; dContent: string
  emailMode: 'same' | 'own'; subject: string; html: string; bodyText: string; htmlKey: number
  atts: Att[]; attErr: string
  sendMode: 'now' | 'schedule'; schedAt: string
  // urgent: send without waiting for ICSD; needs a reason, and it's logged on the message
  urgent: boolean; urgentReason: string
  tried: Record<number, boolean>
  dirty: boolean
  result: null | { reqId: string; ap: Approval; when: string; sends: string; total: number; chs: Channel[] }
}
// icsd: ICSD still has to approve; skipped: SMS is on but ICSD approval is skipped as urgent
export interface Approval { icsd: boolean; skipped: boolean; mgr: boolean; ext: number; need: boolean; who: string[] }

export function blankCompose(): Compose {
  return {
    mode: 'new', editId: null, only: null, step: 1, maxStep: 1,
    receivers: [], pick: {}, smsCO: {}, smsPP: {},
    ch: { push: false, desktop: false, email: false, sms: false },
    tplId: null, team: null, sender: '', title: '', content: '', smsText: '', dSender: '', dTitle: '', dContent: '',
    emailMode: 'same', subject: '', html: '', bodyText: '', htmlKey: 0, atts: [], attErr: '',
    sendMode: 'now', schedAt: '', urgent: false, urgentReason: '', tried: {}, dirty: false, result: null,
  }
}

export const hasNotif = (c: Compose) => !!(c.ch.push || c.ch.desktop)
// SMS reaches employees only as a fallback when the device notification can't
export const smsOn = (c: Compose) => !!(c.ch.push && c.ch.sms)
export const effEmailMode = (c: Compose) => (c.ch.email ? 'own' as const : null)
export const selChs = (c: Compose) => CH_ORDER.filter(k => c.ch[k])

export function recvCount(t: Tag, groups: Group[]) {
  if (t.type === 'person' || t.type === 'ext') return 1
  if (t.type === 'group') { const g = groups.find(x => x.id === t.id); return g ? g.count : 0 }
  const o = ORGS.find(x => x.code === t.id)
  return o ? o.count : 0
}

export function recvFlat(c: Compose, groups: Group[]) {
  const internal = c.receivers.filter(t => t.type !== 'ext')
  const all = flatten(internal, groups).map(x => PMAP[x.pid]).filter(Boolean)
  const ext = c.receivers.filter(t => t.type === 'ext').map(t => t.email as string)
  // contractors saved inside audience groups count as external receivers
  all.forEach(p => { if (p.extKind && ext.indexOf(p.value!) < 0) ext.push(p.value!) })
  return { people: all.filter(p => !p.extKind), ext }
}

export type Reach = ReturnType<typeof reach>
// who each selected channel can reach, worked out from the expanded receiver list
export function reach(c: Compose, groups: Group[]) {
  const f = recvFlat(c, groups), P = f.people
  const extE = f.ext.filter(x => x.indexOf('@') >= 0).length, extP = f.ext.length - extE
  const phone = (p: Person) => !!(p.co || p.pp), fb = !!(c.ch.sms && c.ch.push)
  const ok = (p: Person) => (c.ch.push && (p.dev || (fb && phone(p)))) || (c.ch.desktop && p.desk) || c.ch.email
  const unr = P.filter(p => !ok(p)), unrE = c.ch.email ? 0 : extE, unrP = c.ch.sms ? 0 : extP
  const noDev = P.filter(p => !p.dev), smsable = noDev.filter(phone).length, total = P.length + f.ext.length, unrN = unr.length + unrE + unrP
  return {
    flat: f, total, people: P.length, ext: f.ext.length, extE, extP,
    push: P.length - noDev.length, desktop: P.filter(p => p.desk).length, email: P.length + extE, sms: extP + (c.ch.push ? smsable : 0),
    noDev: noDev.length, smsable, unr, unrE, unrP, unrExt: unrE + unrP, unrN, reachable: total - unrN,
    viaEmail: c.ch.email ? 0 : unr.length + unrE,
    viaSms: c.ch.sms ? 0 : unrP + (c.ch.push ? unr.filter(p => !p.dev && phone(p)).length : 0),
  }
}

// ICSD reviews every SMS, unless the sender skips it as urgent; your supervisor approves anything going
// outside the company, and that can't be skipped
export function approval(c: Compose): Approval {
  const skipped = ICSD && !!c.ch.sms && c.urgent, icsd = ICSD && !!c.ch.sms && !c.urgent
  const ext = c.receivers.filter(t => t.type === 'ext' && (isExtPhone(t) ? c.ch.sms : c.ch.email)).length, mgr = ext > 0
  const who: string[] = []
  if (mgr) who.push(L('your supervisor', '你的主管'))
  if (icsd) who.push(L('the SMS reviewer', 'SMS 審核人員'))
  return { icsd, skipped, mgr, ext, need: icsd || mgr, who }
}

export function peopleTags(c: Compose) { return c.receivers.filter(t => t.type === 'person').map(t => PMAP[t.id!]).filter(Boolean) }
// The SMS number is picked by the system, not the sender: company mobile first, else personal phone. So there's
// never anyone to pick a number for (the Choose SMS numbers dialog and its prompts don't show).
export function multiPeople(_c: Compose): Person[] { return [] }
export function unresolved(c: Compose) { return multiPeople(c).filter(p => !c.pick['p:' + p.id]) }
export function noNumber(c: Compose) { return smsOn(c) ? peopleTags(c).filter(p => !p.co && !p.pp) : [] }

// Sender names: half-width English letters, numbers and spaces
export const SENDER_RE = /^[A-Za-z0-9 ]*$/
export const SENDER_ERR = () => L('Please use half-width English letters, numbers, and spaces only.', '請只使用半形英文字母、數字和空格。')
// the email's size (text, tables, embedded images) in bytes against its 100 KB limit
export const emailTooBig = (c: Compose) => new Blob([c.html || '']).size > LIM.mail
// Device Notifications has no title: where one is still needed (the list), it's the first line of the content
export const pushTitle = (content: string) => content.split('\n').map(x => x.trim()).find(Boolean) || ''

export type Errs = Partial<Record<'recv' | 'ch' | 'ext' | 'extp' | 'sender' | 'title' | 'content' | 'dsender' | 'dtitle' | 'dcontent' | 'sms' | 'subject' | 'body' | 'sched' | 'urgent', string>>
export function errs(c: Compose, groups: Group[]): Errs {
  const e: Errs = {}, lim = LIM.push, total = recvFlat(c, groups)
  const totalN = total.people.length + total.ext.length
  const tooLong = (n: number) => L('Up to ' + fmtN(n) + ' characters.', '最多 ' + fmtN(n) + ' 字。')
  // every empty required field says the same thing
  const req = L('This field is required.', '此欄位為必填。')
  // 1. Receivers and channels
  if (!c.receivers.length) e.recv = L('Add at least one audience.', '請加入至少一位收件人。')
  const extP = c.receivers.filter(t => isExtPhone(t)).length, extE = c.receivers.filter(t => t.type === 'ext').length - extP
  if (!c.ch.push && !c.ch.desktop && !c.ch.email) e.ch = L('Pick at least one channel.', '請選擇至少一個通道。')
  // 2. Message
  // a sender name is required on Device Notifications, optional on Desktop OS, and Email has none
  if (c.ch.push) {
    if (!c.sender.trim()) e.sender = req
    else if (!SENDER_RE.test(c.sender)) e.sender = SENDER_ERR()
    else if (c.sender.length > LIM.sender) e.sender = tooLong(LIM.sender)
    // Device Notifications has no title field; the list's title is the start of the content (see pushTitle)
    if (!c.content.trim()) e.content = req
    else if (c.content.length > lim) e.content = tooLong(lim)
  }
  if (c.ch.desktop) {
    if (c.dSender.trim() && !SENDER_RE.test(c.dSender)) e.dsender = SENDER_ERR()
    else if (c.dSender.length > LIM.sender) e.dsender = tooLong(LIM.sender)
    if (!c.dTitle.trim()) e.dtitle = req
    else if (c.dTitle.length > LIM.dTitle) e.dtitle = tooLong(LIM.dTitle)
    if (!c.dContent.trim()) e.dcontent = req
    else if (c.dContent.length > LIM.desktop) e.dcontent = tooLong(LIM.desktop)
  }
  if (smsOn(c)) {
    if (!c.smsText.trim()) e.sms = req
    else if (c.smsText.length > LIM.sms) e.sms = tooLong(LIM.sms)
  }
  if (effEmailMode(c) === 'own') {
    if (!c.subject.trim()) e.subject = req
    else if (c.subject.length > LIM.subject) e.subject = tooLong(LIM.subject)
    const n = c.bodyText.trim().length
    // no character limit: only the total size (text, tables and embedded images) counts
    if (!n) e.body = req
    else if (emailTooBig(c)) e.body = L('Message content exceeds the 100 KB limit. Please reduce content size or remove/compress embedded images.', '訊息內容超過 100 KB 上限。請減少內容，或移除、壓縮內嵌圖片。')
  }
  // 3. Schedule
  if (c.sendMode === 'schedule') {
    const d = fromIso(c.schedAt), now = new Date()
    if (!d) e.sched = req
    else if (d < now || d > new Date(now.getFullYear(), now.getMonth() + 3, now.getDate(), now.getHours(), now.getMinutes())) e.sched = L('Please select a date between now and next 3 months.', '請選擇現在到未來 3 個月內的日期。')
  }
  return e
}
export function stepOk(n: number, e: Errs) {
  // people a channel can't reach are only a notice (the red line under Channels), never a reason to stop on this step
  if (n === 1) return !e.recv && !e.ch && !e.urgent
  if (n === 2) return !e.sender && !e.title && !e.content && !e.dsender && !e.dtitle && !e.dcontent && !e.sms && !e.subject && !e.body
  return !e.sched
}
export const msgErr = (e: Errs) => e.sender || e.title || e.content || e.dsender || e.dtitle || e.dcontent || e.sms || e.subject || e.body

// which parts of the message a template fills, given the channels picked
export function tplFit(c: Compose, t: Template) {
  const fills: string[] = [], gaps: string[] = []
  const notif = L('notification', '通知'), smsW = 'SMS', emailW = 'Email'
  if (hasNotif(c)) (tplHasNotif(t) ? fills : gaps).push(notif)
  if (smsOn(c)) ((t.sms || '').trim() ? fills : gaps).push(smsW)
  if (c.ch.email) {
    if (tplHasEmail(t)) fills.push(emailW)
    else if (!tplHasNotif(t)) gaps.push(emailW)
  }
  const text = fills.length
    ? L('Fills ', '會填入') + joinL(fills) + (gaps.length ? L('. You’ll write the ' + joinL(gaps) + '.', '；' + joinL(gaps) + '要自己寫') : '')
    : L('No text for your channels', '沒有你選的通道的內容')
  return { text, warn: gaps.some(g => g !== smsW) }
}

export function seedEmail(c: Compose, subject: string, h: string) {
  return { subject: subject || '', html: h, bodyText: htmlToText(h), htmlKey: (c.htmlKey || 0) + 1 }
}

export function smsCoverText(rc: Reach) {
  const miss = rc.noDev - rc.smsable
  const parts: string[] = []
  if (rc.smsable) parts.push(L('Reaches ' + P(rc.smsable, 'person', '', 'people') + ' without the app', '可送到 ' + rc.smsable + ' 位沒裝 App 的人'))
  if (rc.extP) parts.push(L(P(rc.extP, 'external phone', '', 'external phones'), rc.extP + ' 支外部電話'))
  let t = parts.length ? ' ' + parts.join(L(' and ', '和')) + L('.', '。') : ''
  if (miss) t += L(' ' + P(miss, 'person has', '', 'people have') + ' no phone number.', miss + ' 人沒有電話。')
  return t
}
export function reachNote(k: Channel, rc: Reach, c: Compose) {
  if (k === 'email') return rc.extP ? L('External phones can’t get it', '外部電話收不到') : L('Everyone has a mailbox', '每個人都有信箱')
  if (k === 'sms') return ''
  const miss = k === 'push' ? rc.noDev : rc.people - rc.desktop, parts: string[] = []
  if (miss) parts.push(k === 'push' ? L(P(miss, 'person', '', 'people') + ' without a device', miss + ' 人沒有裝置') : L(P(miss, 'person', '', 'people') + ' without the agent', miss + ' 人沒裝桌面程式'))
  if (rc.ext) parts.push(L(P(rc.ext, 'external audience', '', 'external audiences') + ' can’t get it', rc.ext + ' 位外部收件人收不到'))
  return parts.length ? parts.join(L('; ', '；')) : L('Everyone can get it', '每個人都收得到')
}

// SMS fallback goes to the people the push can't reach, on the phones ticked for their audience row(s). With the
// company phone ticked, someone who has none gets it on their personal phone instead.
export function smsPhones(c: Compose, groups: Group[]) {
  const co: Record<string, boolean> = {}, pp: Record<string, boolean> = {}
  c.receivers.forEach(t => {
    if (t.type === 'ext') return
    const ids = flatten([t], groups).map(x => x.pid)
    if (c.smsCO[t.key] !== false) ids.forEach(id => { co[id] = true })
    if (c.smsPP[t.key]) ids.forEach(id => { pp[id] = true })
  })
  const f = recvFlat(c, groups), miss = f.people.filter(p => !p.dev)
  let nCo = 0, nPp = 0, auto = 0, none = 0, off = 0
  miss.forEach(p => {
    if (pp[p.id] && p.pp) nPp++
    if (co[p.id]) { if (p.co) nCo++; else if (p.pp && !pp[p.id]) auto++; else if (!p.pp) none++ }
    else if (!pp[p.id]) off++
  })
  return { miss: miss.length, co: nCo, pp: nPp, auto, none, off, ext: f.ext.filter(x => x.indexOf('@') < 0).length }
}
