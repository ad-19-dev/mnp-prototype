/// <reference types="vite/client" />
// Sample data and domain rules for MNP, carried over from the v2 prototype.
// Everything here is plain data and pure functions; React state lives in store.ts.

export const DOMAIN = 'tsmc.com'
export const EMAIL_RE = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/
export const CAP = 500
// SMS approval (an SMS reviewer approves every SMS; urgent messages may skip it, on record). On. The UI never names
// the reviewing team; it says "SMS approval" and "the SMS reviewer".
export const ICSD = true
// "one record per channel" version: the list shows a row per channel of a message. It is the version being developed
// and the default build; the earlier one-row-per-message list is frozen (build it with `--mode legacy`).
export const SPLIT = import.meta.env.MODE !== 'legacy'
// a record's details open in a large dialog (the Detail modal, default since 2026-11-11) instead of the side panel
export const MODAL = import.meta.env.MODE !== 'legacy'
export const ME = 'p01'
export const SUPERVISOR = 'Jimmy Chen 陳志明'

export type Channel = 'push' | 'desktop' | 'email' | 'sms'
export const CH_ORDER: Channel[] = ['push', 'desktop', 'email', 'sms']
export const CH_CARDS: Channel[] = ['push', 'desktop', 'email']
export const LIM = { sender: 26, title: 50, push: 534, desktop: 70, dTitle: 20, sms: 534, subject: 70, body: 5000, mail: 100 * 1024, files: 5, bytes: 10 * 1024 * 1024, name: 50 }
export const BLOCKED = ['exe', 'bat', 'cmd', 'com', 'js', 'vbs', 'msi', 'ps1', 'scr']
// Desktop OS notifications show about 2 lines of title and 2–3 lines of text; CJK characters are about twice as wide
export const DESK = { title: 80, text: 120 }

export interface Person {
  id: string; zh: string; en: string; nt: string; emp: string; org: string; title: string
  mvpn: string; co: string; pp: string; dev: boolean; desk: boolean; c: number; ini: string
  gen?: boolean; extKind?: 'phone' | 'email'; value?: string
}
// code: the org's short name (letters only); no: its org number (mostly digits)
export interface Org { code: string; no: string; name: string; count: number }
export interface Group {
  id: string; name: string; desc: string; count: number; updated: string; creator: string
  role: 'Owner' | 'Editor' | 'Viewer'; members?: { pid: string }[]; collabs?: { pid: string; role: string }[]; fresh?: number
  // the team it belongs to; null means the creator's personal space
  team?: string | null
}
export interface EmailBody { mode: 'same' | 'own'; subject?: string; html?: string; atts?: { name: string; size: number }[] }
export interface Template {
  id: string; name: string; sender: string; title: string; content: string; sms: string
  email: EmailBody; shared: [string, string][]; updated: string; owner: string; fresh?: number
  // the team it belongs to; null means the owner's personal space
  team?: string | null
}
// pending: waiting for approval; expired: approved after its scheduled time, so it wasn't sent and waits for
// the sender (send now, reschedule or delete); rejected: the approver turned it down
export type Status = 'pending' | 'expired' | 'rejected' | 'scheduled' | 'progress' | 'sent' | 'error' | 'canceled'
export const STATUS_ORDER: Status[] = ['pending', 'scheduled', 'progress', 'sent', 'error', 'rejected', 'expired', 'canceled']
export interface Row {
  id: string; sender: string; tpl: string | null; title: string; content: string; smsText?: string
  // Desktop OS has its own text; on a message that also uses Device Notifications, title/content above are the device text
  desk?: { sender: string; title: string; content: string } | null
  channels: Channel[]; sms: boolean; status: Status; created: string; sched: string | null
  total: number; ok: number; creator: string; aud: [string, string][]; email?: EmailBody | null
  fr?: string[][]; fo?: string; fw?: string[]; fx?: string[][]; err?: { title: string; text: string } | null
  byCh?: Partial<Record<Channel, [number, number]>> | null; fresh?: number; _f?: Fail[] | null
  // a channel whose own status differs from the message's (e.g. Device Notifications done while SMS still sends)
  chSt?: Partial<Record<Channel, Status>> | null
  // a channel rescheduled on its own (actions work on one channel at a time)
  chSched?: Partial<Record<Channel, string>> | null
  // a channel whose audience was edited on its own (Detail modal study); the other channels keep aud
  chAud?: Partial<Record<Channel, [string, string][]>> | null
  // Device Notifications (SMS): which phones get the SMS, per audience row (company ticked unless false; personal when true)
  chPhones?: { co: Record<string, boolean>; pp: Record<string, boolean> } | null
  team?: string | null
  // ICSD approval skipped because the message was urgent: who, when and why (kept for the record)
  bypass?: { by: string; at: string; reason: string } | null
  // approval: who reviews it (ICSD, the sender's supervisor, or both in turn), when they decided, and why if rejected
  review?: { by: 'icsd' | 'mgr' | 'both'; at?: string; reason?: string } | null
}
export interface Tag { key: string; type: 'person' | 'group' | 'org' | 'ext'; id?: string; email?: string }
// via: on a channel's list, the other channel that still reached the person (null: none did)
export interface Fail { p?: Person; ext?: string; reason: string; fallback: string; via?: Channel | null }

const SUR = [['陳','Chen'],['林','Lin'],['黃','Huang'],['張','Chang'],['李','Lee'],['王','Wang'],['吳','Wu'],['劉','Liu'],['蔡','Tsai'],['楊','Yang'],['許','Hsu'],['鄭','Cheng'],['謝','Hsieh'],['郭','Kuo'],['洪','Hung'],['曾','Tseng'],['邱','Chiu'],['廖','Liao'],['賴','Lai'],['周','Chou']]
const GIV = [['志豪','Jason'],['雅雯','Vivian'],['冠廷','Marcus'],['怡安','Annie'],['柏宇','Brian'],['家瑜','Joyce'],['宗佑','Leo'],['佩芸','Cindy'],['承翰','Ryan'],['思穎','Iris'],['俊傑','Allen'],['欣妤','Tina'],['彥均','Ivan'],['詩婷','Sandy'],['建志','Eric'],['郁芳','Wendy'],['品豪','Sean'],['宜庭','Peggy'],['書瑋','Kevin'],['芷萱','Yvonne'],['育誠','Owen'],['筱涵','Hannah'],['哲維','Victor'],['婉婷','Fiona']]
const TITLES = ['Engineer', 'Senior Engineer', 'Technician', 'Specialist', 'Analyst', 'Shift Lead']

export const ORGS: Org[] = [
  { code: 'PENG', no: '51023A', name: 'Platform Engineering 1', count: 58 },
  { code: 'PDEV', no: '51024A', name: 'Platform Engineering 2', count: 73 },
  { code: 'PUX', no: '51031A', name: 'Platform User Experience', count: 21 },
  { code: 'FMFG', no: '18307B', name: 'Fab 18 Manufacturing 3', count: 412 },
  { code: 'FESH', no: '15042C', name: 'Fab 15 Environment, Safety and Health', count: 96 },
  { code: 'ITIS', no: '72018A', name: 'IT Infrastructure Services', count: 140 },
  { code: 'HRCB', no: '83002A', name: 'HR Compensation and Benefits', count: 64 },
]

function initials(en: string) { const a = en.split(' '); return ((a[0] || '').charAt(0) + (a[1] || '').charAt(0)).toUpperCase() }
type PRow = [string, string, string, string, string, string, string, string, string, string, number, number]
function mkP(a: PRow, i: number): Person {
  return { id: a[0], zh: a[1], en: a[2], nt: a[3], emp: a[4], org: a[5], title: a[6], mvpn: a[7] ? '88' + a[7] : '', co: a[8], pp: a[9], dev: !!a[10], desk: !!a[11], c: i % 8, ini: initials(a[2]) }
}
export const PEOPLE: Person[] = ([
  ['p01','吳佳穎','Grace Wu','gywu','120588','PENG','Senior Engineer','61588','0918226588','0912337415',1,1],
  ['p02','陳志明','Jimmy Chen','cmchen','103217','PENG','Section Manager','60217','0918103217','',1,1],
  ['p03','林冠宇','Kevin Lin','kylin','118842','PDEV','Engineer','68842','0918118842','0933552019',1,1],
  ['p04','林家豪','Kevin Lin','chlinb','121905','FMFG','Shift Lead','','','0921660734',1,0],
  ['p05','陳怡君','Yi-Chun Chen','ycchenz','115630','PUX','UX Designer','65630','0918115630','0975218306',1,1],
  ['p06','陳怡君','Joyce Chen','ycchenq','109472','HRCB','HR Specialist','69472','0918109472','',1,1],
  ['p07','陳怡君','Erin Chen','ycchenm','124118','FESH','ESH Engineer','','','0910884261',0,1],
  ['p08','黃柏翰','Brian Huang','bhhuang','112306','PDEV','Senior Engineer','62306','0918112306','0988130557',1,1],
  ['p09','張雅婷','Tina Chang','ytchang','119774','PUX','Senior UX Designer','69774','0918119774','',1,1],
  ['p10','李承恩','Adrian Lee','celee','126031','PENG','Engineer','','','0937402118',1,1],
  ['p11','王思妤','Iris Wang','sywangd','122487','ITIS','IT Specialist','62487','0918122487','',1,1],
  ['p12','蔡宗翰','Leo Tsai','thtsai','110958','FMFG','Manufacturing Manager','60958','0918110958','0920775641',1,1],
  ['p13','楊佩珊','Peggy Yang','psyang','117263','FESH','Safety Officer','67263','0918117263','',1,0],
  ['p14','許俊宏','Allen Hsu','chhsu','108145','ITIS','Infrastructure Manager','68145','0918108145','',1,1],
  ['p15','鄭詩涵','Sandy Cheng','shcheng','125579','HRCB','HR Partner','','','0963219804',0,1],
  ['p16','謝彥廷','Ryan Hsieh','ythsieh','120113','FMFG','Equipment Engineer','','','',1,0],
  ['p17','郭欣怡','Cindy Kuo','hykuo','123640','PDEV','Product Manager','63640','0918123640','0912708392',1,1],
  ['p18','洪品睿','Sean Hung','prhung','127702','PUX','UX Designer','','','0958441276',1,1],
  ['p19','曾郁婷','Wendy Tseng','yttseng','114389','FESH','ESH Section Manager','64389','0918114389','',1,1],
  ['p20','邱建宏','Eric Chiu','chchiu','106821','FMFG','Shift Lead','66821','0918106821','0935692147',1,0],
  ['p21','廖宜蓁','Vivian Liao','ycliao','128356','ITIS','Security Analyst','68356','0918128356','',0,1],
  ['p22','賴書豪','Ivan Lai','shlai','116904','PENG','Senior Engineer','66904','0918116904','0927583920',1,1],
  ['p23','周芷寧','Yvonne Chou','cnchou','129017','HRCB','Recruiter','','','0971305468',1,1],
  ['p24','劉宗翰','Jason Liu','thliu','111472','FMFG','Section Manager','61472','0918111472','',1,1],
] as PRow[]).map(mkP)
export const PMAP: Record<string, Person> = {}
PEOPLE.forEach(p => { PMAP[p.id] = p })

export const GROUPS: Group[] = [
  { id: 'g1', name: 'Fab 18 Shift Leads', desc: 'Shift leads across Fab 18 phases, for handover and incident notices.', count: 86, updated: '2026/10/16 15:20', creator: 'p12', role: 'Editor' },
  { id: 'g2', name: 'tWorkspace On-call', desc: 'Primary and secondary on-call engineers for tWorkspace services.', count: 24, updated: '2026/10/15 09:12', creator: 'p01', role: 'Owner' },
  { id: 'g3', name: 'tWorkspace Pilot Users', desc: 'Early-access users who try new tWorkspace features first.', count: 312, updated: '2026/10/12 18:40', creator: 'p17', role: 'Editor' },
  { id: 'g4', name: 'ESH Emergency Response Team', desc: 'ERT members for chemical, gas and fire incidents at Fab 15.', count: 45, updated: '2026/10/09 11:05', creator: 'p19', role: 'Viewer' },
  { id: 'g5', name: 'New Hires 2026 Q3', desc: 'Employees who joined between July and September 2026.', count: 128, updated: '2026/09/30 14:22', creator: 'p23', role: 'Viewer' },
  { id: 'g6', name: 'Design System Guild', desc: 'Designers and engineers who contribute to the design system.', count: 37, updated: '2026/09/26 10:48', creator: 'p09', role: 'Editor' },
  { id: 'g7', name: 'IT Major Incident Bridge', desc: 'Responders paged during P1 IT incidents.', count: 18, updated: '2026/09/18 16:03', creator: 'p14', role: 'Viewer' },
  { id: 'g8', name: 'UX Team', desc: 'UX designers and researchers on the platform team.', count: 9, updated: '2026/09/02 13:30', creator: 'p01', role: 'Owner' },
]
export const GSEED: Record<string, { m: string[]; fill: (string | null)[]; col: [string, string][] }> = {
  g1: { m: ['p12','p24','p04','p20','p16'], fill: ['FMFG'], col: [['p12','Owner'],['p01','Editor'],['p24','Editor'],['p20','Viewer']] },
  g2: { m: ['p01','p22','p02','p03','p08','p10','p11','p14','p17','p21'], fill: ['PENG','PDEV','ITIS'], col: [['p01','Owner'],['p22','Editor'],['p02','Viewer']] },
  g3: { m: ['p17','p03','p08','p09','p05','p10'], fill: ['PENG','PDEV','FMFG','ITIS','HRCB'], col: [['p17','Owner'],['p01','Editor'],['p08','Viewer']] },
  g4: { m: ['p19','p13','p07'], fill: ['FESH'], col: [['p19','Owner'],['p13','Editor'],['p01','Viewer']] },
  g5: { m: [], fill: ['PENG','PDEV','FMFG','FESH','ITIS','HRCB','PUX'], col: [['p23','Owner'],['p06','Editor'],['p01','Viewer']] },
  g6: { m: ['p09','p05','p18','p03','p01'], fill: ['PUX','PDEV'], col: [['p09','Owner'],['p01','Editor'],['p05','Editor']] },
  g7: { m: ['p14','p11','p21'], fill: ['ITIS'], col: [['p14','Owner'],['p11','Editor'],['p01','Viewer']] },
  g8: { m: ['p01','p05','p09','p18'], fill: ['PUX'], col: [['p01','Owner'],['p09','Editor']] },
}

// ---------- formatting ----------
const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export function pad(n: number) { return (n < 10 ? '0' : '') + n }
export function fmtN(n: number) { return Number(n).toLocaleString('en-US') }
export function parseDT(s?: string | null) { const m = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null }
export function fmtDT(d: Date) { return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) }
export function niceDT(d: Date) { return WD[d.getDay()] + ', ' + MO[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' at ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) }
export function addMin(d: Date, m: number) { return new Date(d.getTime() + m * 60000) }
// The DS DatePicker reads and writes ISO-like local strings: "YYYY-MM-DDTHH:mm"
export function toIso(d: Date) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) }
export function fromIso(s?: string | null) { const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null }
export function fmtPhone(d: string) { return d ? d.slice(0, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7) : '' }
export function maskPhone(d: string) { return d ? '09••-•••-' + d.slice(7) : '' }
export function plural(n: number, one: string, many?: string) { return fmtN(n) + ' ' + (n === 1 ? one : (many || one + 's')) }
export function joinList(a: string[], conj = 'and') { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' ' + conj + ' ' + a[a.length - 1] }
export function fmtSize(b: number) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB' }
export function cap1(s: string) { return s.replace(/^./, x => x.toUpperCase()) }
function hsh(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
export function reqIdFor(r: Row) { return 'MNP-' + r.created.slice(0, 10).replace(/\//g, '') + '-' + (hsh(r.id) % 9000 + 1000) }
export function vwidth(s: string) { let n = 0; for (const ch of String(s || '')) n += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch) ? 2 : 1; return n }
export function cutAt(s: string, w: number) { let n = 0, i = 0; const a = Array.from(String(s || '')); for (; i < a.length; i++) { n += vwidth(a[i]); if (n > w) break } return a.slice(0, i).join('') }
export function placeholders(s: string) { const out: string[] = []; (String(s || '').match(/\[[^\]\n]{1,40}\]/g) || []).forEach(x => { if (out.indexOf(x) < 0) out.push(x) }); return out }

// ---------- HTML helpers for the email editor ----------
export function escHtml(s: string) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
export function textToHtml(t: string) {
  const s = String(t || '').trim()
  return s ? s.split(/\n{2,}/).map(p => '<p>' + escHtml(p).replace(/\n/g, '<br>') + '</p>').join('') : ''
}
export function htmlToText(h?: string) {
  const d = document.createElement('div')
  d.innerHTML = String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<\/(p|div|li|h\d)>/gi, '\n')
  return (d.textContent || '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
export function cleanHtml(h?: string) {
  return String(h || '').replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/javascript:/gi, '')
}

// ---------- people, groups and orgs ----------
export function genPerson(key: string, org?: string | null): Person {
  const id = 'x' + key
  if (PMAP[id]) return PMAP[id]
  const h = hsh(key), su = SUR[h % SUR.length], gv = GIV[(h >>> 7) % GIV.length], hasCo = (h % 3) !== 0
  const p: Person = { id, zh: su[0] + gv[0], en: gv[1] + ' ' + su[1], nt: (gv[1].charAt(0) + su[1]).toLowerCase() + ((h >>> 13) % 90 + 10), emp: String(100000 + (h % 30000)), org: org || ORGS[(h >>> 3) % ORGS.length].code, title: TITLES[(h >>> 17) % TITLES.length], mvpn: hasCo ? '88' + String(60000 + (h % 9999)) : '', co: hasCo ? '0918' + String(100000 + (h % 899999)) : '', pp: (h % 4) === 0 ? '09' + String(10000000 + (h % 89999999)) : '', dev: (h % 9) !== 0, desk: (h % 6) !== 0, c: h % 8, gen: true, ini: '' }
  p.ini = initials(p.en)
  PMAP[id] = p
  return p
}
// External contacts are stored like people so groups can hold them too
export function extPerson(value: string): Person {
  const id = 'xe:' + value
  if (!PMAP[id]) {
    const phone = value.indexOf('@') < 0
    PMAP[id] = { id, extKind: phone ? 'phone' : 'email', value, zh: '', en: value, nt: '', emp: '', org: 'External', title: phone ? 'External phone number' : 'External email', mvpn: '', co: phone ? value.replace(/\D/g, '') : '', pp: '', dev: false, desk: false, c: 7, ini: phone ? '#' : '@' }
  }
  return PMAP[id]
}
export function membersFor(g: Group): { pid: string }[] {
  if (g.members) return g.members
  const seed = GSEED[g.id] || { m: [], fill: [null] }
  const out = seed.m.map(pid => ({ pid }))
  let i = 0
  while (out.length < g.count) { const p = genPerson(g.id + '-m' + i, seed.fill[i % seed.fill.length]); out.push({ pid: p.id }); i++ }
  return out
}
export function orgMembers(code: string): Person[] {
  const o = ORGS.find(x => x.code === code)
  const out = PEOPLE.filter(p => p.org === code)
  let i = 0
  while (o && out.length < o.count) { out.push(genPerson('org-' + code + '-' + i, code)); i++ }
  return out
}
export function flatten(tags: Tag[], groups: Group[]): { pid: string }[] {
  const seen: Record<string, boolean> = {}, out: { pid: string }[] = []
  const push = (pid?: string) => { if (pid && !seen[pid]) { seen[pid] = true; out.push({ pid }) } }
  tags.forEach(t => {
    if (t.type === 'person') push(t.id)
    else if (t.type === 'group') { const g = groups.find(x => x.id === t.id); if (g) membersFor(g).forEach(m => push(m.pid)) }
    else if (t.type === 'org') orgMembers(t.id!).forEach(p => push(p.id))
  })
  return out
}
export function audToTags(aud: [string, string][]): Tag[] {
  return (aud || []).map(a => a[0] === 'g' ? { key: 'g:' + a[1], type: 'group' as const, id: a[1] } : a[0] === 'o' ? { key: 'o:' + a[1], type: 'org' as const, id: a[1] } : a[0] === 'e' ? { key: 'e:' + a[1], type: 'ext' as const, email: a[1] } : { key: 'p:' + a[1], type: 'person' as const, id: a[1] })
}
export function tagsToAud(tags: Tag[]): [string, string][] { return tags.map(t => [t.type === 'group' ? 'g' : t.type === 'org' ? 'o' : t.type === 'ext' ? 'e' : 'p', (t.type === 'ext' ? t.email : t.id) as string]) }

// external receivers: an email address gets Email only; a phone number has no app, so it gets the SMS fallback
export function phoneDigits(s: string) { const t = String(s || '').trim(); if (!/^\+?[\d\s().-]{8,20}$/.test(t)) return ''; const d = t.replace(/[^\d+]/g, ''); return d.replace(/\+/g, '').length >= 8 ? d : '' }
export function fmtExtPhone(d: string) { return /^09\d{8}$/.test(d) ? d.slice(0, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7) : d }
export function isExtPhone(t: Tag) { return t.type === 'ext' && (t.email || '').indexOf('@') < 0 }

// ---------- list matching (batch import, group member paste) ----------
export type Match =
  | { kind: 'one'; p: Person; by: string; tok?: string }
  | { kind: 'org'; org: Org; by: string; tok?: string }
  | { kind: 'ext'; email: string; by: string; tok?: string }
  | { kind: 'amb'; cands: Person[]; by: string; tok?: string }
  | { kind: 'miss'; why: string; tok?: string }
export function splitTokens(text: string) { return String(text || '').split(/[\n,;，、；\t]+/).map(x => x.trim()).filter(Boolean) }
export function matchOne(tok: string, opts: { allowExt?: boolean; extWhy?: string; phoneBy?: string }): Match {
  const t = tok.trim(), low = t.toLowerCase(), digits = t.replace(/\D/g, '')
  const org = ORGS.find(o => o.code.toLowerCase() === low)
  if (org) return { kind: 'org', org, by: 'Org code' }
  if (t.indexOf('@') > 0) {
    if (!EMAIL_RE.test(t)) return { kind: 'miss', why: 'Not a valid email address' }
    const parts = low.split('@')
    if (parts[1] === DOMAIN) { const p = PEOPLE.find(x => x.nt === parts[0]); return p ? { kind: 'one', p, by: 'Email' } : { kind: 'miss', why: 'No employee with this email' } }
    return opts.allowExt ? { kind: 'ext', email: low, by: 'External email' } : { kind: 'miss', why: opts.extWhy || 'External addresses can’t be group members' }
  }
  if (/^\d{6}$/.test(t)) { const p = PEOPLE.find(x => x.emp === t); return p ? { kind: 'one', p, by: 'Employee ID' } : { kind: 'miss', why: 'No employee with this ID' } }
  if (/^\d{7}$/.test(t)) { const p = PEOPLE.find(x => x.mvpn === t); return p ? { kind: 'one', p, by: 'MVPN' } : { kind: 'miss', why: 'No one uses this MVPN' } }
  if (/^[\d\s+()-]+$/.test(t) && /^09\d{8}$/.test(digits)) {
    const p = PEOPLE.find(x => x.co === digits || x.pp === digits)
    if (p) return { kind: 'one', p, by: opts.phoneBy || (p.co === digits ? 'Company mobile' : 'Personal phone') }
    if (opts.allowExt) return { kind: 'ext', email: fmtExtPhone(digits), by: 'External phone number' }
    return { kind: 'miss', why: 'No employee with this phone number' }
  }
  if (/^[a-z][a-z0-9._-]{1,19}$/i.test(t)) { const p = PEOPLE.find(x => x.nt === low); if (p) return { kind: 'one', p, by: 'NT account' } }
  let hits = PEOPLE.filter(x => x.zh === t || x.en.toLowerCase() === low)
  if (!hits.length) hits = PEOPLE.filter(x => x.en.split(' ')[0].toLowerCase() === low)
  if (hits.length === 1) return { kind: 'one', p: hits[0], by: 'Name' }
  if (hits.length > 1) return { kind: 'amb', cands: hits, by: 'Name' }
  if (opts.allowExt) { const d = phoneDigits(tok); if (d) return { kind: 'ext', email: fmtExtPhone(d), by: 'External phone number' } }
  return { kind: 'miss', why: 'No match in the employee directory' }
}
export function parseList(text: string, opts: { allowExt?: boolean; extWhy?: string; phoneBy?: string }): Match[] {
  const out: Match[] = []
  splitTokens(text).forEach(tok => {
    const m = matchOne(tok, opts)
    if (m.kind === 'miss' && /\s/.test(tok)) {
      const parts = tok.split(/\s+/).filter(Boolean)
      const ms = parts.map(x => matchOne(x, opts))
      if (parts.length > 1 && ms.every(x => x.kind !== 'miss')) { ms.forEach((x, i) => out.push(Object.assign({ tok: parts[i] }, x))); return }
    }
    out.push(Object.assign({ tok }, m))
  })
  return out
}
// A pasted list holds one kind of data, chosen before pasting: every entry is matched as that kind only,
// so "8861588" can't be read as an MVPN in one list and an employee ID in another.
export type ListKind = 'nt' | 'emp' | 'name' | 'email' | 'phone' | 'mvpn' | 'org'
// no Names: with over 100,000 employees, many share the exact same name
export const LIST_KINDS: ListKind[] = ['nt', 'emp', 'email', 'phone', 'mvpn', 'org']
export const LIST_SAMPLES: Record<ListKind, string> = {
  nt: 'gywu, cmchen, ytchang, celee\nsywangd, psyang, a19999',
  emp: '120588, 112306, 110958, 114389\n999999, 12345',
  name: '陳怡君\nKevin Lin\nGrace Wu\n王小明',
  email: 'gywu@tsmc.com, cmchen@tsmc.com\npartner@example.com\nnobody@tsmc.com, not-an-email',
  phone: '0918-226-588\n0921660734\n0988-000-111\n0900-000-000',
  mvpn: '8861588, 8860217, 8868842\n8866904, 9999999',
  org: 'PUX\nFMFG\nXYZ/123',
}
export function matchAs(tok: string, kind: ListKind, opts: { allowExt?: boolean; extWhy?: string; phoneBy?: string }): Match {
  const t = tok.trim(), low = t.toLowerCase(), digits = t.replace(/\D/g, '')
  if (kind === 'org') { const org = ORGS.find(o => o.code.toLowerCase() === low); return org ? { kind: 'org', org, by: 'Org code' } : { kind: 'miss', why: 'No org with this code' } }
  if (kind === 'nt') {
    if (!/^[a-z][a-z0-9._-]{1,19}$/i.test(t)) return { kind: 'miss', why: 'Not an NT account' }
    const p = PEOPLE.find(x => x.nt === low); return p ? { kind: 'one', p, by: 'NT account' } : { kind: 'miss', why: 'No employee with this NT account' }
  }
  if (kind === 'emp') {
    if (!/^\d{6}$/.test(t)) return { kind: 'miss', why: 'Not a 6-digit employee ID' }
    const p = PEOPLE.find(x => x.emp === t); return p ? { kind: 'one', p, by: 'Employee ID' } : { kind: 'miss', why: 'No employee with this ID' }
  }
  if (kind === 'mvpn') {
    if (!/^\d{7}$/.test(t)) return { kind: 'miss', why: 'Not a 7-digit MVPN' }
    const p = PEOPLE.find(x => x.mvpn === t); return p ? { kind: 'one', p, by: 'MVPN' } : { kind: 'miss', why: 'No one uses this MVPN' }
  }
  if (kind === 'email') {
    if (!EMAIL_RE.test(t)) return { kind: 'miss', why: 'Not a valid email address' }
    const parts = low.split('@')
    if (parts[1] === DOMAIN) { const p = PEOPLE.find(x => x.nt === parts[0]); return p ? { kind: 'one', p, by: 'Email' } : { kind: 'miss', why: 'No employee with this email' } }
    return opts.allowExt ? { kind: 'ext', email: low, by: 'External email' } : { kind: 'miss', why: opts.extWhy || 'External addresses can’t be group members' }
  }
  if (kind === 'phone') {
    const d = /^09\d{8}$/.test(digits) ? digits : phoneDigits(t)
    if (!d) return { kind: 'miss', why: 'Not a phone number' }
    const p = PEOPLE.find(x => x.co === d || x.pp === d)
    if (p) return { kind: 'one', p, by: opts.phoneBy || (p.co === d ? 'Company mobile' : 'Personal phone') }
    return opts.allowExt ? { kind: 'ext', email: fmtExtPhone(d), by: 'External phone number' } : { kind: 'miss', why: 'No employee with this phone number' }
  }
  let hits = PEOPLE.filter(x => x.zh === t || x.en.toLowerCase() === low)
  if (!hits.length) hits = PEOPLE.filter(x => x.en.split(' ')[0].toLowerCase() === low)
  if (hits.length === 1) return { kind: 'one', p: hits[0], by: 'Name' }
  if (hits.length > 1) return { kind: 'amb', cands: hits, by: 'Name' }
  return { kind: 'miss', why: 'No employee with this name' }
}
export function parseListAs(text: string, kind: ListKind, opts: { allowExt?: boolean; extWhy?: string; phoneBy?: string }): Match[] {
  return splitTokens(text).map(tok => Object.assign({ tok }, matchAs(tok, kind, opts)))
}
export const SAMPLE_SEND = 'gywu, cmchen, 112306, ytchang, celee, sywangd, 110958, psyang, chhsu, shcheng\nythsieh; hykuo; prhung; 114389; chchiu; ycliao; shlai; cnchou; thliu\n陳怡君\nKevin Lin\nPUX\n0921660734\na19999\n0988-000-111'
export const SAMPLE_GROUP = 'ytchang, 115630, Kevin Lin\n0920-775-641; 66904\nPUX\npartner@example.com, a19999'

// ---------- templates ----------
// Templates store message text by format, not by channel: notification text (Device Notifications and Desktop OS),
// SMS text, and an optional separate email. They don't store receivers or attachments.
export const TEMPLATES: Template[] = [
  { id: 't1', name: 'Emergency drill notice', sender: 'F18 Facility', title: 'Fire drill at [time] today', content: 'A fire evacuation drill starts at [time] in [building]. Follow your area’s evacuation route and gather at [assembly point]. Do not use elevators.', sms: 'Fire drill [time] today at [building]. Gather at [assembly point].', email: { mode: 'same' }, shared: [['o', 'FMFG'], ['o', 'FESH']], updated: '2026/09/12', owner: 'p12' },
  { id: 't2', name: 'Typhoon work arrangement', sender: 'ESH Emergency', title: 'Typhoon alert: work arrangement for [date]', content: 'Due to the typhoon warning, non-fab staff should work from home on [date]. Fab shift staff, follow your section manager’s arrangement. Check tWorkspace for updates.', sms: 'Typhoon alert: non-fab staff WFH on [date]. Fab shifts as arranged.', email: { mode: 'own', subject: 'Typhoon alert: work arrangement for [date]', html: '<p>Due to the typhoon warning, work arrangements for <b>[date]</b> are as follows.</p><ul><li><b>Non-fab staff:</b> work from home. Keep tWorkspace and Teams open during working hours.</li><li><b>Fab shift staff:</b> follow your section manager’s arrangement.</li><li><b>Commuting:</b> don’t travel if your city announces a work and school closure.</li></ul><p>Updates are posted on the <a href="https://tworkspace/esh/typhoon">ESH typhoon page</a>.</p><p>ESH Emergency</p>' }, shared: [['o', 'FESH'], ['o', 'FMFG'], ['o', 'PENG'], ['o', 'ITIS']], updated: '2026/08/28', owner: 'p19' },
  { id: 't3', name: 'Shift change reminder', sender: 'F18 MFG3', title: 'Shift handover moves to [time]', content: 'Starting [date], the shift handover meeting moves to [time] in [room]. Shift leads, please update your handover notes before the meeting.', sms: '', email: { mode: 'same' }, shared: [['o', 'FMFG']], updated: '2026/09/30', owner: 'p24' },
  { id: 't4', name: 'System maintenance window', sender: 'Platform Ops', title: '[System] maintenance: [date] [time]', content: '[System] will be unavailable on [date] from [start] to [end] (GMT+8). Save your work before the window starts.', sms: '', email: { mode: 'own', subject: '[System] maintenance on [date], [start]–[end]', html: '<p>Hi all,</p><p><b>[System]</b> will be unavailable on <b>[date] from [start] to [end]</b> (GMT+8) while we [reason].</p><p>During the window:</p><ul><li>You can’t sign in to [System].</li><li>Unsaved work may be lost, so save before [start].</li></ul><p>Follow progress on the <a href="https://tworkspace/status">tWorkspace status page</a>.</p><p>Platform Ops</p>' }, shared: [['o', 'PENG'], ['o', 'PDEV'], ['p', 'p14']], updated: '2026/10/02', owner: 'p01' },
  { id: 't5', name: 'Password expiry reminder', sender: 'IT Service Desk', title: 'Your password expires in [n] days', content: 'Change your Windows password before [date] to keep access to tWorkspace and email. Press Ctrl+Alt+Del and choose Change a password.', sms: '', email: { mode: 'same' }, shared: [['o', 'ITIS']], updated: '2026/07/19', owner: 'p11' },
  { id: 't6', name: 'Event invitation', sender: 'HR Benefits', title: '', content: '', sms: '', email: { mode: 'own', subject: 'You’re invited: [event] on [date]', html: '<p>Hi all,</p><p>Join us for <b>[event]</b> on [date] at [location]. [One sentence on why it matters.]</p><p>Sign up in <a href="https://tworkspace/hr">tWorkspace › HR Services</a> by [deadline].</p><p>[Team name]</p>' }, shared: [['o', 'HRCB']], updated: '2026/09/05', owner: 'p06' },
  { id: 't7', name: 'Training invitation', sender: 'HR Talent', title: 'Training on [date]: [course name]', content: 'You’re registered for [course name] on [date], [time] in [room]. Details are in your email.', sms: '', email: { mode: 'own', subject: '[Course name]: your session on [date]', html: '<p>Hi,</p><p>You’re registered for <b>[course name]</b> on [date], [time] in [room].</p><ul><li>Bring your badge and laptop.</li><li>Can’t attend? Cancel in <a href="https://tworkspace/learning">tWorkspace › Learning</a> so someone on the waitlist can join.</li></ul><p>[Team name]</p>' }, shared: [['o', 'HRCB']], updated: '2026/08/14', owner: 'p23' },
  { id: 't8', name: 'Incident resolved', sender: 'Platform Ops', title: 'Resolved: [issue]', content: 'The [issue] reported at [start time] is resolved. [What users should do now, if anything.] Thanks for your patience.', sms: '', email: { mode: 'same' }, shared: [['p', 'p22'], ['p', 'p02'], ['o', 'ITIS']], updated: '2026/10/16', owner: 'p01' },
  { id: 't9', name: 'Weekly release digest', sender: 'Platform Ops', title: '', content: '', sms: '', email: { mode: 'own', subject: 'Weekly release digest: [week]', html: '<p>This week in tWorkspace:</p><ul><li>[Change 1]</li><li>[Change 2]</li><li>[Change 3]</li></ul><p>Full changelog in <a href="https://tworkspace/whats-new">tWorkspace › What’s new</a>.</p>' }, shared: [], updated: '2026/10/09', owner: 'p01' },
]
export function tplHasNotif(t: Template) { return !!((t.title || '').trim() || (t.content || '').trim()) }
export function tplHasEmail(t: Template) { return !!(t.email && t.email.mode === 'own') }
export type Fmt = 'notif' | 'sms' | 'email'
export function tplFormats(t: Template): Fmt[] { const f: Fmt[] = []; if (tplHasNotif(t)) f.push('notif'); if ((t.sms || '').trim()) f.push('sms'); if (tplHasEmail(t)) f.push('email'); return f }

// ---------- messages ----------
const R = (r: Omit<Row, 'sms' | 'channels'> & { channel: string; smsText?: string }): Row => {
  const { channel, ...rest } = r
  const channels: Channel[] = channel === 'push_sms' ? ['push'] : [channel as Channel]
  return { ...rest, channels, sms: channel === 'push_sms' }
}
const ROWS_V1: Row[] = [
  R({ id: 'm017', sender: 'Platform Ops', tpl: 't4', title: 'tWorkspace maintenance: Sat 10/24 02:00–04:00', content: 'tWorkspace will be unavailable on Sat, Oct 24 from 02:00 to 04:00 (GMT+8) for a database upgrade. Save your work before 01:50.', channel: 'desktop', status: 'scheduled', created: '2026/10/19 10:42', sched: '2026/10/23 17:00', total: 312, ok: 0, creator: 'p01', aud: [['g','g3']] }),
  R({ id: 'm016', sender: 'F18 Facility', tpl: 't1', title: 'Fire drill at 14:00 today: Fab 18 Phase 5', content: 'A fire evacuation drill starts at 14:00 in Fab 18 Phase 5, Building B. Follow your area’s evacuation route and gather at Assembly Point C. Do not use elevators.', smsText: 'Fire drill 14:00 today at F18 P5 Bldg B. Gather at Assembly Point C.', channel: 'push_sms', status: 'progress', created: '2026/10/19 10:05', sched: null, total: 412, ok: 268, creator: 'p12', aud: [['o','FMFG']] }),
  R({ id: 'm015', sender: 'F18 Facility', tpl: null, title: 'Badge reader upgrade: tap twice after 07:00', content: 'Badge readers at Fab 18 gates 2 to 4 will be upgraded on Oct 20 between 06:00 and 07:00. If your badge isn’t accepted after 07:00, tap it twice and wait 3 seconds.', channel: 'push', status: 'scheduled', created: '2026/10/17 15:55', sched: '2026/10/20 05:30', total: 86, ok: 0, creator: 'p12', aud: [['g','g1']] }),
  R({ id: 'm014', sender: 'IT Service Desk', tpl: null, title: 'VPN client update required by Oct 23', content: 'Update your VPN client to version 6.2 before Oct 23. Open Software Center, search for VPN and select Update. Older versions will be blocked after the deadline.', channel: 'desktop', status: 'sent', created: '2026/10/18 16:30', sched: null, total: 140, ok: 138, creator: 'p14', aud: [['o','ITIS']], fr: [['Desktop agent offline for 7+ days'], ['Desktop agent not installed']], fo: 'ITIS' }),
  R({ id: 'm013', sender: 'HR Benefits', tpl: 't6', title: 'Annual health check sign-up opens Oct 21', content: 'Hi all,\n\nSign-up for the 2026 annual health check opens on Oct 21 at 09:00 in tWorkspace › HR Services. Slots at the Hsinchu clinic fill quickly, so book early.\n\nIf you need a slot outside working hours, reply to this email.\n\nHR Benefits', channel: 'email', status: 'scheduled', created: '2026/10/18 11:15', sched: '2026/10/21 09:00', total: 152, ok: 0, creator: 'p06', aud: [['o','PENG'], ['o','PDEV'], ['o','PUX']] }),
  R({ id: 'm012', sender: 'ESH Emergency', tpl: 't2', title: 'Typhoon alert: work from home on 10/17', content: 'Due to the typhoon warning, non-fab staff in Hsinchu should work from home on Oct 17. Fab shift staff, follow your section manager’s arrangement. Check tWorkspace for updates.', smsText: 'Typhoon alert: non-fab staff WFH on 10/17. Fab shifts as arranged.', channel: 'push_sms', status: 'sent', created: '2026/10/16 18:20', sched: null, total: 96, ok: 93, creator: 'p19', aud: [['o','FESH']], fw: ['p07'], fr: [['App unregistered', 'SMS fallback: number not in service'], ['Device unreachable for 72+ hours', 'SMS fallback: carrier rejected the message'], ['App unregistered', 'SMS fallback: no phone number on file']], fo: 'FESH' }),
  R({ id: 'm011', sender: 'Platform Ops', tpl: null, title: 'Resolved: file sync delay', content: 'The file sync delay reported at 09:40 is resolved. Files uploaded between 09:40 and 10:25 are now available. Thanks for your patience.', channel: 'push', status: 'sent', created: '2026/10/16 10:31', sched: null, total: 24, ok: 24, creator: 'p01', aud: [['g','g2']] }),
  R({ id: 'm010', sender: 'F18 MFG3', tpl: 't3', title: 'Shift handover moves to 07:15 from 10/20', content: 'Starting Oct 20, the day-shift handover meeting moves to 07:15 in room 3F-07. Night-shift leads, please update your handover notes before 07:00.', channel: 'push', status: 'sent', created: '2026/10/15 17:48', sched: null, total: 86, ok: 86, creator: 'p24', aud: [['g','g1']] }),
  R({ id: 'm009', sender: 'F15 ESH', tpl: 't1', title: 'Gas detection drill: ERT standby at 09:00', content: 'ERT members: the gas detection drill starts at 09:00 in Fab 15 Phase 7. Report to the ERT room by 08:45 with your full kit.', smsText: 'Gas drill 09:00 at F15 P7. ERT report to the ERT room by 08:45.', channel: 'push_sms', status: 'error', created: '2026/10/15 08:12', sched: null, total: 45, ok: 0, creator: 'p13', aud: [['g','g4']], fr: [['Not dispatched (MNP-5031)']], fo: 'FESH', err: { title: 'The dispatch service timed out at 08:36.', text: 'No one received this message. The platform team was alerted automatically, and you can resend now.' } }),
  R({ id: 'm008', sender: 'Design System Guild', tpl: null, title: 'Design system 3.2 release notes', content: 'Hi everyone,\n\nDesign system 3.2 is out. Highlights: a denser data table option, a new Stepper component, and status colors that now meet 4.5:1 contrast.\n\nFull notes and migration tips are on the design system site.\n\nDesign System Guild', channel: 'email', status: 'sent', created: '2026/10/14 15:02', sched: null, total: 39, ok: 38, creator: 'p09', aud: [['g','g6'], ['e','lena.ho@example.com'], ['e','mark.tan@example.com']], fx: [['mark.tan@example.com', 'Recipient address rejected (550)']] }),
  R({ id: 'm007', sender: 'HR Talent', tpl: 't7', title: 'New hire orientation: Day 2 agenda', content: 'Welcome to Day 2!\n\nWe start at 09:00 in Training Center Room 2A. Today covers information security, ESH basics and a tour of tWorkspace.\n\nBring your badge and laptop.\n\nHR Talent', channel: 'email', status: 'sent', created: '2026/10/12 17:40', sched: '2026/10/13 08:00', total: 128, ok: 128, creator: 'p23', aud: [['g','g5']] }),
  R({ id: 'm006', sender: 'IT Security', tpl: null, title: 'Phishing alert: fake payroll emails', content: 'Emails claiming to be from Payroll ask you to confirm bank details. Don’t click the links. Use Report Phishing in Outlook, then delete the email.', channel: 'desktop', status: 'sent', created: '2026/10/12 14:12', sched: null, total: 470, ok: 466, creator: 'p21', aud: [['g','g3'], ['o','PDEV'], ['o','HRCB'], ['o','PUX']], fr: [['Desktop agent not installed'], ['Desktop agent offline for 7+ days']] }),
  R({ id: 'm005', sender: 'Platform Ops', tpl: null, title: 'Weekly release digest: W41', content: 'This week in tWorkspace:\n\n• Search: faster results for people and documents\n• Calendar: room booking now shows equipment\n• MNP: approval status for SMS fallback\n\nFull changelog in tWorkspace › What’s new.', channel: 'email', status: 'error', created: '2026/10/09 17:00', sched: '2026/10/10 09:00', total: 58, ok: 0, creator: 'p22', aud: [['o','PENG']], fr: [['Not delivered (MNP-4102)']], fo: 'PENG', err: { title: 'The mail relay rejected this batch at 09:00 on Oct 10.', text: 'No one received this email. Resend once the relay is back to normal.' } }),
  R({ id: 'm004', sender: 'F18 Facility', tpl: null, title: 'Chiller maintenance tonight 18:00–22:00', content: 'Chiller #3 in Fab 18 Phase 3 will be under maintenance from 18:00 to 22:00. Expect higher temperatures in the sub-fab. Contact Facility at ext. 7788 with any issues.', channel: 'push', status: 'sent', created: '2026/10/08 13:26', sched: '2026/10/08 17:30', total: 412, ok: 405, creator: 'p20', aud: [['o','FMFG']], fr: [['App unregistered'], ['App unregistered'], ['Notifications turned off on the device'], ['App unregistered'], ['Device unreachable for 72+ hours'], ['App unregistered'], ['Notifications turned off on the device']], fo: 'FMFG' }),
  R({ id: 'm003', sender: 'UX Team', tpl: null, title: 'Looking for usability test volunteers', content: 'Hi,\n\nWe’re testing a new approval flow in tWorkspace and need 8 volunteers for 30-minute sessions on Oct 8 and 9. Sessions are remote, and there’s a small thank-you gift.\n\nReply to this email to sign up.\n\nUX Team', channel: 'email', status: 'sent', created: '2026/10/06 10:10', sched: null, total: 30, ok: 30, creator: 'p01', aud: [['g','g8'], ['o','PUX']] }),
  R({ id: 'm002', sender: 'IT Service Desk', tpl: null, title: 'Office suite update rolls out this week', content: 'An office suite update is rolling out to IT Infrastructure this week. Restart when prompted to finish installing. Questions? Open a ticket in tWorkspace.', channel: 'desktop', status: 'sent', created: '2026/10/02 11:45', sched: null, total: 140, ok: 140, creator: 'p11', aud: [['o','ITIS']] }),
  R({ id: 'm001', sender: 'ESH Emergency', tpl: null, title: 'Earthquake drill on Oct 3 at 10:00', content: 'The quarterly earthquake drill starts Oct 3 at 10:00. When the alarm sounds: drop, cover and hold on, then follow your floor warden to the assembly point.', smsText: 'Quake drill Oct 3 10:00. Drop, cover, hold on. Follow your warden.', channel: 'push_sms', status: 'sent', created: '2026/09/30 16:20', sched: '2026/10/03 09:30', total: 96, ok: 96, creator: 'p19', aud: [['o','FESH']] }),
]
// v2 additions: multi-channel examples
function buildRows(): Row[] {
  const rows = ROWS_V1.map(r => ({ ...r }))
  const byId = (id: string) => rows.find(r => r.id === id)!
  rows.forEach(r => { if (r.channels.indexOf('email') >= 0 && !r.email) r.email = { mode: 'own', subject: r.title, html: textToHtml(r.content), atts: [] } })
  const hc = byId('m013')
  hc.email = { mode: 'own', subject: hc.title, html: textToHtml(hc.content), atts: [{ name: 'Health_check_2026_guide.pdf', size: 842000 }] }
  Object.assign(hc, { channels: ['push', 'email'], title: 'Health check sign-up opens at 09:00 today', content: 'Book your 2026 annual health check in tWorkspace › HR Services. Slots at the Hsinchu clinic fill quickly.' })
  Object.assign(byId('m006'), { channels: ['desktop', 'email'], ok: 470, email: { mode: 'same' }, byCh: { desktop: [466, 470], email: [470, 470] } })
  Object.assign(byId('m012'), { byCh: { push: [90, 96], sms: [3, 6] } })
  rows.unshift(
    { id: 'm019', sender: 'ESH Emergency', tpl: 't2', title: 'Typhoon alert: work arrangement for 10/22', content: 'Due to the typhoon warning, non-fab staff should work from home on Oct 22. Fab shift staff, follow your section manager’s arrangement. Check tWorkspace for updates.', smsText: 'Typhoon alert: non-fab staff WFH on 10/22. Fab shifts as arranged.', channels: ['push', 'email'], sms: true, status: 'progress', created: '2026/10/21 08:40', sched: null, total: 292, ok: 241, creator: 'p19', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['o', 'PUX']], email: { mode: 'own', subject: 'Typhoon alert: work arrangement for Oct 22', html: (TEMPLATES[1].email.html || '').replace(/\[date\]/g, 'Oct 22'), atts: [] } },
    { id: 'm018', sender: 'F18 Facility', tpl: null, title: 'Power maintenance: F18 Phase 5, Sat 10/25', content: 'Planned power maintenance in Fab 18 Phase 5 on Sat, Oct 25 from 08:00 to 12:00. Tools on UPS aren’t affected. Details are in your email.', channels: ['push', 'desktop', 'email'], sms: false, status: 'scheduled', created: '2026/10/20 16:12', sched: '2026/10/24 17:00', total: 412, ok: 0, creator: 'p20', aud: [['o', 'FMFG']], email: { mode: 'own', subject: 'Planned power maintenance: Fab 18 Phase 5, Sat Oct 25 08:00–12:00', html: '<p>Hi all,</p><p>Planned power maintenance takes place in <b>Fab 18 Phase 5</b> on <b>Sat, Oct 25 from 08:00 to 12:00</b>.</p><ul><li>Tools on UPS aren’t affected.</li><li>Non-UPS tools in zones B and C are powered down at 07:45.</li><li>Shift leads: confirm your tool list with Facility by Oct 23.</li></ul><p>The schedule and the affected tool list are attached.</p><p>F18 Facility · ext. 7788</p>', atts: [{ name: 'F18P5_power_maintenance_schedule.pdf', size: 1240000 }, { name: 'Affected_tools_zone_B_C.xlsx', size: 386000 }] } },
  )
  return rows
}
export const ROWS0 = buildRows()

// ---------- teams ----------
// A team is a set of people who send as one unit, open like a chat group: any member can add or remove
// members, and anyone can leave. A message belongs to one person or one team; a template or audience group
// belongs to one person and can be shared with any number of teams.
export interface Team { id: string; name: string; desc: string; created: string; members: { pid: string }[] }
const TM = (pids: string): Team['members'] => pids.split(' ').map(pid => ({ pid }))
export const TEAMS: Team[] = [
  { id: 'tm1', name: 'Platform Ops', desc: 'tWorkspace operations: maintenance windows, incidents and release notes.', created: '2026/03/02', members: TM('p01 p22 p02 p10 p08 p17') },
  { id: 'tm2', name: 'Fab 18 Communications', desc: 'Facility and shift notices for Fab 18.', created: '2026/05/18', members: TM('p12 p20 p24 p04 p16 p01') },
  { id: 'tm3', name: 'ESH Emergency', desc: 'Emergency alerts and drills.', created: '2026/04/09', members: TM('p19 p13 p07 p01') },
  { id: 'tm4', name: 'UX Team', desc: 'Research recruiting and design system updates.', created: '2026/06/30', members: TM('p09 p01 p05 p18') },
  { id: 'tm5', name: 'IT Service Desk', desc: 'IT notices for employees.', created: '2026/02/11', members: TM('p14 p11 p21') },
]
// which space owns what in the sample data; anything not listed is in its creator's personal space
const ROW_TEAM: Record<string, string> = {
  m017: 'tm1', m005: 'tm1', m011: 'tm1', m016: 'tm2', m015: 'tm2', m018: 'tm2', m004: 'tm2', m010: 'tm2',
  m019: 'tm3', m012: 'tm3', m009: 'tm3', m001: 'tm3', m008: 'tm4', m003: 'tm4', m014: 'tm5', m002: 'tm5', m006: 'tm5',
}
ROWS0.forEach(r => { r.team = ROW_TEAM[r.id] || null })
// urgent messages that skipped ICSD approval keep who, when and why
Object.assign(ROWS0.find(r => r.id === 'm019')!, { bypass: { by: 'p19', at: '2026/10/21 08:38', reason: 'Typhoon warning issued at 07:30. Staff must know before they commute.' } })
TEMPLATES.push(
  { id: 't10', name: 'Personal reminder', sender: '', title: 'Reminder: [what] by [date]', content: 'Quick reminder: please [what] by [date]. Reply to me if anything blocks you.', sms: '', email: { mode: 'same' }, shared: [], updated: '2026/10/10', owner: 'p01' },
  { id: 't11', name: 'Out of office', sender: '', title: 'I’m out of office [dates]', content: 'I’m out of office [dates] with limited access to email. For urgent matters, contact [backup].', sms: '', email: { mode: 'same' }, shared: [], updated: '2026/08/21', owner: 'p01' },
  { id: 't12', name: 'Research recruiting', sender: 'UX Team', title: '', content: '', sms: '', email: { mode: 'own', subject: 'Help us test [feature]: [length] sessions on [dates]', html: '<p>Hi,</p><p>We’re testing <b>[feature]</b> and need [n] volunteers for [length] remote sessions on [dates].</p><p>Reply to this email to pick a slot.</p><p>UX Team</p>' }, shared: [], updated: '2026/09/29', owner: 'p09' },
)
GROUPS.push(
  { id: 'g9', name: 'Project Atlas core', desc: 'People I work with on Project Atlas.', count: 7, updated: '2026/10/18 11:20', creator: 'p01', role: 'Owner' },
)
GSEED.g9 = { m: ['p01', 'p02', 'p03', 'p08', 'p10', 'p17', 'p22'], fill: [], col: [['p01', 'Owner']] }
const TPL_TEAM: Record<string, string> = { t1: 'tm2', t3: 'tm2', t2: 'tm3', t4: 'tm1', t8: 'tm1', t9: 'tm1', t5: 'tm5', t12: 'tm4' }
TEMPLATES.forEach(t => { t.team = TPL_TEAM[t.id] || null })
const GROUP_TEAM: Record<string, string> = { g1: 'tm2', g2: 'tm1', g3: 'tm1', g4: 'tm3', g6: 'tm4', g7: 'tm5' }
GROUPS.forEach(g => { g.team = GROUP_TEAM[g.id] || null })

// More of your own messages, covering each case: personal and team, every status, every channel mix,
// SMS fallback, external receivers, attachments and a blank sender name (sent as your NT account).
const em = (subject: string, text: string, atts: { name: string; size: number }[] = []): EmailBody => ({ mode: 'own', subject, html: textToHtml(text), atts })
const MINE: Row[] = [
  { id: 'm122', sender: 'Grace Wu', tpl: null, title: 'Team lunch moves to 12:30 today', content: 'Lunch with the Platform intern group moves to 12:30 today, same place: B1 cafeteria, table area C.', channels: ['push'], sms: false, status: 'sent', created: '2026/10/21 10:12', sched: null, total: 6, ok: 6, creator: 'p01', team: null, aud: [['p', 'p02'], ['p', 'p03'], ['p', 'p08'], ['p', 'p10'], ['p', 'p17'], ['p', 'p22']] },
  { id: 'm121', sender: 'Platform Ops', tpl: 't4', title: 'Search service maintenance: Fri 10/24 22:00–23:00', content: 'tWorkspace search will be unavailable on Fri, Oct 24 from 22:00 to 23:00 (GMT+8) while we rebuild the index. Everything else keeps working.', channels: ['desktop', 'email'], sms: false, status: 'scheduled', created: '2026/10/21 09:30', sched: '2026/10/24 12:00', total: 560, ok: 0, creator: 'p01', team: 'tm1', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3']], email: { mode: 'same' } },
  { id: 'm120', bypass: { by: 'p01', at: '2026/10/21 08:54', reason: 'Warning lifted at 08:30. Offices reopen tomorrow, and people plan tonight.' }, sender: 'ESH Emergency', tpl: 't2', title: 'Typhoon update: offices reopen 10/23', content: 'The typhoon warning has been lifted. Offices in Hsinchu reopen on Oct 23 at normal hours. Fab shift staff, follow your section manager’s arrangement.', smsText: 'Typhoon lifted: offices reopen 10/23 at normal hours.', channels: ['push'], sms: true, status: 'progress', created: '2026/10/21 08:55', sched: null, total: 683, ok: 410, creator: 'p01', team: 'tm3', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'FMFG'], ['o', 'ITIS']] },
  { id: 'm119', sender: 'gywu', tpl: null, title: 'Reminder: submit your Q4 OKR draft by Friday', content: 'Please put your Q4 OKR draft in the team folder by Friday, Oct 24. We’ll go through them together on Monday.', channels: ['desktop'], sms: false, status: 'sent', created: '2026/10/20 18:05', sched: null, total: 9, ok: 9, creator: 'p01', team: null, aud: [['g', 'g8']] },
  { id: 'm118', sender: 'UX Team', tpl: null, title: 'Usability test: new approval flow, round 2', content: 'Hi,\n\nThanks to everyone who joined round 1. For round 2 we need 6 more people for 30-minute remote sessions on Oct 28 and 29. The consent form is attached.\n\nReply to this email to pick a slot.\n\nUX Team', channels: ['email'], sms: false, status: 'scheduled', created: '2026/10/20 15:40', sched: '2026/10/22 09:00', total: 132, ok: 0, creator: 'p01', team: 'tm4', aud: [['o', 'PENG'], ['o', 'PDEV'], ['e', 'lena.ho@example.com']], email: em('Usability test: new approval flow, round 2', 'Hi,\n\nThanks to everyone who joined round 1. For round 2 we need 6 more people for 30-minute remote sessions on Oct 28 and 29. The consent form is attached.\n\nReply to this email to pick a slot.\n\nUX Team', [{ name: 'Consent_form_round2.pdf', size: 214000 }, { name: 'Session_slots.xlsx', size: 38000 }]) },
  { id: 'm117', sender: 'Platform Ops', tpl: null, title: 'Login errors on tWorkspace: investigating', content: 'Some people can’t sign in to tWorkspace since 14:20. We’re investigating and will update you within 30 minutes. Mobile sign-in still works.', channels: ['push', 'desktop'], sms: false, status: 'error', created: '2026/10/20 14:31', sched: null, total: 560, ok: 0, creator: 'p01', team: 'tm1', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3']], fr: [['Not dispatched (MNP-5107)']], fo: 'PDEV', err: { title: 'The push gateway returned an authentication error at 14:31.', text: 'No one received this message. The platform team was alerted automatically, and you can resend now.' } },
  { id: 'm116', sender: 'F18 Facility', tpl: 't1', title: 'Fire drill at 10:00 today: Fab 18 Phase 3', content: 'A fire evacuation drill starts at 10:00 in Fab 18 Phase 3, Building A. Follow your area’s evacuation route and gather at Assembly Point A. Do not use elevators.', smsText: 'Fire drill 10:00 today at F18 P3 Bldg A. Gather at Assembly Point A.', channels: ['push'], sms: true, status: 'sent', created: '2026/10/20 08:20', sched: null, total: 412, ok: 405, creator: 'p01', team: 'tm2', aud: [['o', 'FMFG']], byCh: { push: [400, 412], sms: [5, 12] }, fr: [['App unregistered', 'SMS fallback: number not in service'], ['Device unreachable for 72+ hours', 'SMS fallback: carrier rejected the message'], ['App unregistered', 'SMS fallback: no phone number on file']], fo: 'FMFG' },
  { id: 'm115', sender: 'Grace Wu', tpl: null, title: 'Vendor visit Thu 10/23: guest Wi-Fi and badges', content: 'Our vendor visits on Thu, Oct 23 from 13:30. Guest badges are at the B lobby. Guest Wi-Fi: TSMC-Guest, code on your badge.', smsText: 'Vendor visit Thu 10/23 13:30. Badges at B lobby.', channels: ['push', 'email'], sms: true, status: 'sent', created: '2026/10/19 17:22', sched: null, total: 5, ok: 4, creator: 'p01', team: null, aud: [['p', 'p02'], ['p', 'p22'], ['e', 'ken.lu@vendor-example.com'], ['e', '0988-000-111'], ['e', 'amy.lai@vendor-example.com']], email: { mode: 'same' }, byCh: { push: [2, 2], email: [3, 4], sms: [1, 1] }, fx: [['amy.lai@vendor-example.com', 'Mailbox full (552)']] },
  { id: 'm114', sender: 'F18 MFG3', tpl: 't3', title: 'Shift handover moves to 19:15 from 10/27', content: 'Starting Oct 27, the night-shift handover meeting moves to 19:15 in room 3F-07. Day-shift leads, please update your handover notes before 19:00.', channels: ['push'], sms: false, status: 'scheduled', created: '2026/10/19 11:03', sched: '2026/10/26 18:00', total: 86, ok: 0, creator: 'p01', team: 'tm2', aud: [['g', 'g1']] },
  { id: 'm113', sender: 'Platform Ops', tpl: 't8', title: 'Resolved: slow page loads in tWorkspace', content: 'The slow page loads reported at 08:50 are resolved. If pages still load slowly, clear your browser cache and sign in again. Thanks for your patience.', channels: ['push', 'desktop'], sms: false, status: 'sent', created: '2026/10/17 10:40', sched: null, total: 560, ok: 551, creator: 'p01', team: 'tm1', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3']], byCh: { push: [532, 560], desktop: [551, 560] }, fr: [['Desktop agent offline for 7+ days'], ['Notifications turned off on the device'], ['Desktop agent not installed']], fo: 'PDEV' },
  { id: 'm111', sender: 'UX Team', tpl: null, title: 'Design critique: bring one screen you’re stuck on', content: 'Design critique this Thursday, 15:00–16:00 in 5F-Ocean. Bring one screen you’re stuck on; 10 minutes each.', channels: ['desktop'], sms: false, status: 'sent', created: '2026/10/15 16:10', sched: null, total: 37, ok: 37, creator: 'p01', team: 'tm4', aud: [['g', 'g6']] },
  { id: 'm110', sender: 'Platform Ops', tpl: 't9', title: 'Weekly release digest: W42', content: 'This week in tWorkspace:\n\n• Profile: pronouns and working hours\n• MNP: send for a team\n• Search: filter by file type\n\nFull changelog in tWorkspace › What’s new.', channels: ['email'], sms: false, status: 'error', created: '2026/10/16 17:00', sched: '2026/10/17 09:00', total: 560, ok: 290, creator: 'p01', team: 'tm1', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3']], email: em('Weekly release digest: W42', 'This week in tWorkspace:\n\n• Profile: pronouns and working hours\n• MNP: send for a team\n• Search: filter by file type\n\nFull changelog in tWorkspace › What’s new.'), fr: [['Not delivered (MNP-4188)']], fo: 'PDEV', err: { title: 'The mail relay stopped accepting this batch halfway at 09:12.', text: '290 people received the email; 270 didn’t. Resend goes only to the people who didn’t get it.' } },
  { id: 'm109', sender: 'ESH Emergency', tpl: null, title: 'Chemical spill drill: Fab 15 Phase 7, Wed 10:30', content: 'ERT members: a chemical spill drill starts Wed, Oct 15 at 10:30 in Fab 15 Phase 7, sub-fab level. Report to the ERT room by 10:15 with full PPE.', smsText: 'Spill drill Wed 10:30 F15 P7 sub-fab. ERT room by 10:15, full PPE.', channels: ['push'], sms: true, status: 'sent', created: '2026/10/14 16:45', sched: '2026/10/15 07:30', total: 45, ok: 45, creator: 'p01', team: 'tm3', aud: [['g', 'g4']], byCh: { push: [42, 45], sms: [3, 3] } },
  { id: 'm108', sender: 'Grace Wu', tpl: null, title: 'Notes from the Q4 planning workshop with the Platform, IT Infrastructure and Fab 18 teams, plus next steps for the notification rollout', content: 'Thanks for joining. Notes and the decision log are attached. Next steps: confirm owners by Oct 17, then a pilot in Fab 18 from Nov 3.', channels: ['email'], sms: false, status: 'sent', created: '2026/10/13 18:30', sched: null, total: 24, ok: 24, creator: 'p01', team: null, aud: [['p', 'p02'], ['p', 'p12'], ['p', 'p14'], ['o', 'PUX']], email: em('Q4 planning workshop: notes and next steps', 'Thanks for joining. Notes and the decision log are attached.\n\nNext steps: confirm owners by Oct 17, then a pilot in Fab 18 from Nov 3.', [{ name: 'Q4_workshop_notes.pdf', size: 1260000 }, { name: 'Decision_log.xlsx', size: 54000 }, { name: 'Rollout_timeline.png', size: 418000 }]) },
  { id: 'm105', sender: 'Grace Wu', tpl: null, title: 'On-call swap: I’m covering Oct 11–12', content: 'Heads-up: I’m swapping on-call with Jimmy and covering Oct 11–12. Page me as primary for those two days.', channels: ['push', 'desktop'], sms: false, status: 'error', created: '2026/10/08 09:40', sched: null, total: 4, ok: 0, creator: 'p01', team: null, aud: [['p', 'p02'], ['p', 'p22'], ['p', 'p10'], ['p', 'p08']], fr: [['Not dispatched (MNP-5022)']], fo: 'PENG', err: { title: 'Sending was interrupted by a platform restart at 09:41.', text: 'No one received this message. You can resend now.' } },
  { id: 'm104', sender: 'UX Team', tpl: null, title: 'Design system 3.1: migration office hours', content: 'Hi all,\n\nWe’re holding office hours for the 3.1 migration every Tuesday in October, 14:00–15:00, in 5F-Ocean or on Teams.\n\nBring your questions and a screen you’re migrating.\n\nUX Team', channels: ['email'], sms: false, status: 'sent', created: '2026/09/30 10:00', sched: null, total: 39, ok: 38, creator: 'p01', team: 'tm4', aud: [['g', 'g6'], ['e', 'mark.tan@example.com'], ['e', 'lena.ho@example.com']], email: em('Design system 3.1: migration office hours', 'Hi all,\n\nWe’re holding office hours for the 3.1 migration every Tuesday in October, 14:00–15:00, in 5F-Ocean or on Teams.\n\nBring your questions and a screen you’re migrating.\n\nUX Team'), fx: [['mark.tan@example.com', 'Recipient address rejected (550)']] },
  { id: 'm103', sender: 'Platform Ops', tpl: 't4', title: 'tWorkspace maintenance: Sat 9/27 01:00–03:00', content: 'tWorkspace will be unavailable on Sat, Sep 27 from 01:00 to 03:00 (GMT+8) for a storage upgrade. Save your work before 00:50.', channels: ['push', 'desktop', 'email'], sms: false, status: 'sent', created: '2026/09/24 15:30', sched: '2026/09/26 17:00', total: 560, ok: 560, creator: 'p01', team: 'tm1', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3']], email: em('tWorkspace maintenance on Sep 27, 01:00–03:00', 'Hi all,\n\ntWorkspace will be unavailable on Sat, Sep 27 from 01:00 to 03:00 (GMT+8) for a storage upgrade. Save your work before 00:50.\n\nPlatform Ops'), byCh: { push: [560, 560], desktop: [560, 560], email: [560, 560] } },
  { id: 'm102', sender: 'F18 Facility', tpl: null, title: 'Water outage: F18 Phase 5 office building, 9/20', content: 'Tap water in the Phase 5 office building is off on Sat, Sep 20 from 09:00 to 15:00. Restrooms on 1F stay open.', channels: ['push'], sms: false, status: 'sent', created: '2026/09/18 13:00', sched: null, total: 412, ok: 398, creator: 'p01', team: 'tm2', aud: [['o', 'FMFG']], fr: [['App unregistered'], ['Device unreachable for 72+ hours'], ['Notifications turned off on the device']], fo: 'FMFG' },
  { id: 'm101', sender: 'Grace Wu', tpl: null, title: 'Welcome to the team, Kevin!', content: 'Please welcome Kevin Lin, who joins Platform Engineering 2 today. Say hi at desk 5F-B12.', channels: ['push'], sms: false, status: 'sent', created: '2026/09/01 09:05', sched: null, total: 73, ok: 73, creator: 'p01', team: null, aud: [['o', 'PDEV']] },
]
// Platform Ops is a busy team: routine notices from several members, so its list fills two pages
const OPS: [string, string, string, string, Channel[], Status, string, number, number, string | null][] = [
  ['m140', 'p22', 'Deploy freeze starts Fri 18:00', 'No production deploys from Fri 18:00 to Mon 09:00. Hotfixes need approval in #platform-ops.', ['desktop'], 'sent', '2026/10/17 16:20', 131, 131, null],
  ['m139', 'p02', 'On-call handover: week 43', 'Week 43 on-call: primary Kevin Lin, secondary Grace Wu. The runbook link is pinned in the channel.', ['push'], 'sent', '2026/10/17 09:00', 24, 24, null],
  ['m138', 'p10', 'Resolved: calendar sync delay', 'The calendar sync delay reported at 13:10 is resolved. Events created during the delay now show up.', ['push', 'desktop'], 'sent', '2026/10/14 14:05', 560, 552, 't8'],
  ['m137', 'p08', 'Weekly release digest: W41', 'This week in tWorkspace: faster people search, room equipment in Calendar, MNP approval status.', ['email'], 'sent', '2026/10/10 09:00', 560, 560, 't9'],
  ['m136', 'p22', 'Database failover test tonight 23:00', 'We test database failover tonight at 23:00. tWorkspace may pause for up to 2 minutes.', ['desktop'], 'sent', '2026/10/09 15:40', 560, 548, 't4'],
  ['m135', 'p17', 'Pilot: new search beta opens Monday', 'Pilot users: the new search beta opens Monday. Turn it on in Settings › Labs and tell us what breaks.', ['push', 'email'], 'sent', '2026/10/08 10:30', 312, 309, null],
  ['m134', 'p02', 'On-call handover: week 42', 'Week 42 on-call: primary Marcus Huang, secondary Vivian Lin.', ['push'], 'sent', '2026/10/10 09:00', 24, 24, null],
  ['m133', 'p10', 'Resolved: login loop on Safari', 'The login loop on Safari is fixed. If you still see it, clear cookies for tworkspace and sign in again.', ['push', 'desktop'], 'sent', '2026/10/06 11:15', 560, 557, 't8'],
  ['m132', 'p08', 'Weekly release digest: W40', 'This week in tWorkspace: profile working hours, MNP drafts, faster file preview.', ['email'], 'sent', '2026/10/03 09:00', 560, 560, 't9'],
  ['m131', 'p22', 'tWorkspace maintenance: Sat 10/4 01:00–02:00', 'tWorkspace will be unavailable on Sat, Oct 4 from 01:00 to 02:00 (GMT+8) for a network upgrade.', ['desktop', 'email'], 'sent', '2026/10/01 16:00', 560, 560, 't4'],
  ['m130', 'p02', 'On-call handover: week 41', 'Week 41 on-call: primary Grace Wu, secondary Kevin Lin.', ['push'], 'sent', '2026/10/03 09:00', 24, 24, null],
  ['m129', 'p17', 'Pilot feedback survey closes Friday', 'Pilot users: 3 minutes, 5 questions. The survey closes Friday 18:00.', ['email'], 'sent', '2026/09/29 14:00', 312, 305, null],
  ['m128', 'p10', 'Resolved: notification badges stuck', 'Unread badges that stayed after reading are fixed. Restart the app if you still see them.', ['push'], 'sent', '2026/09/25 17:30', 560, 541, 't8'],
  ['m127', 'p08', 'Weekly release digest: W39', 'This week in tWorkspace: dark mode for Calendar, bulk file move, MNP templates by format.', ['email'], 'sent', '2026/09/26 09:00', 560, 560, 't9'],
]
OPS.forEach(([id, creator, title, content, channels, status, created, total, ok, tpl]) => {
  const email = channels.indexOf('email') >= 0 ? (channels.length > 1 ? { mode: 'same' as const } : { mode: 'own' as const, subject: title, html: textToHtml(content), atts: [] }) : null
  MINE.push({ id, sender: 'Platform Ops', tpl, title, content, channels, sms: false, status, created, sched: null, total, ok, creator, team: 'tm1', aud: total === 24 ? [['g', 'g2']] : total === 312 ? [['g', 'g3']] : [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3']], email, fr: [['App unregistered'], ['Desktop agent offline for 7+ days']], fo: 'PDEV' })
})
// a few personal test sends: the personal space is also where you try things out
MINE.push(
  { id: 'm126', sender: '', tpl: 't10', title: 'Test: reminder layout on desktop', content: 'Quick reminder: please check how this looks on your desktop by Friday.', channels: ['desktop'], sms: false, status: 'sent', created: '2026/10/16 11:02', sched: null, total: 1, ok: 1, creator: 'p01', team: null, aud: [['p', 'p01']] },
  { id: 'm125', sender: 'Grace Wu', tpl: 't11', title: 'I’m out of office 10/27–10/29', content: 'I’m out of office Oct 27–29 with limited access to email. For urgent matters, contact Jimmy Chen.', channels: ['push', 'email'], sms: false, status: 'scheduled', created: '2026/10/20 17:40', sched: '2026/10/24 17:30', total: 9, ok: 0, creator: 'p01', team: null, aud: [['g', 'g8']], email: { mode: 'same' } },
  { id: 'm124', sender: 'Grace Wu', tpl: null, title: 'Project Atlas: kickoff notes', content: 'Kickoff notes are in the Atlas folder. Owners: please confirm your milestones by Oct 22.', channels: ['email'], sms: false, status: 'sent', created: '2026/10/18 11:30', sched: null, total: 7, ok: 7, creator: 'p01', team: null, aud: [['g', 'g9']], email: { mode: 'own', subject: 'Project Atlas: kickoff notes', html: textToHtml('Kickoff notes are in the Atlas folder. Owners: please confirm your milestones by Oct 22.'), atts: [{ name: 'Atlas_kickoff.pdf', size: 520000 }] } },
)
// messages still in approval, or stopped by it: one waiting with a schedule, one rejected, one approved too
// late for its schedule (scheduled expired) and one waiting for the supervisor because it goes outside
MINE.push(
  { id: 'm153', sender: 'Platform Ops', tpl: null, title: 'Vendor maintenance window: Sat 11/8 01:00–03:00', content: 'Our hosting vendor will patch the load balancers on Sat, Nov 8 from 01:00 to 03:00. Expect brief reconnects.', channels: ['email'], sms: false, status: 'pending', created: '2026/11/03 08:50', sched: null, total: 562, ok: 0, creator: 'p01', team: 'tm1', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3'], ['e', 'noc@vendor-example.com'], ['e', 'ops@vendor-example.com']], email: { mode: 'own', subject: 'Vendor maintenance window: Sat 11/8 01:00–03:00', html: textToHtml('Our hosting vendor will patch the load balancers on Sat, Nov 8 from 01:00 to 03:00. Expect brief reconnects.'), atts: [] }, review: { by: 'mgr' } },
  { id: 'm152', sender: 'Platform Ops', tpl: 't4', title: 'tWorkspace maintenance: Fri 10/31 22:00–23:00', content: 'tWorkspace will be unavailable on Fri, Oct 31 from 22:00 to 23:00 (GMT+8) for a security patch.', smsText: 'tWorkspace down Fri 10/31 22:00-23:00 for a patch.', channels: ['push'], sms: true, status: 'expired', created: '2026/10/27 10:00', sched: '2026/10/30 09:00', total: 560, ok: 0, creator: 'p22', team: 'tm1', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3']], review: { by: 'icsd', at: '2026/11/02 14:10' } },
  { id: 'm151', sender: 'Grace Wu', tpl: null, title: 'Reminder: badge photo update by 11/7', content: 'Please upload a new badge photo in tWorkspace › Profile by Nov 7. Questions? Call me at 0912-337-415.', smsText: 'Upload a new badge photo by 11/7. Call 0912-337-415.', channels: ['push'], sms: true, status: 'rejected', created: '2026/10/31 15:40', sched: null, total: 9, ok: 0, creator: 'p01', team: null, aud: [['g', 'g8']], review: { by: 'icsd', at: '2026/11/01 10:05', reason: 'The SMS text includes a personal phone number. Remove it and submit again.' } },
  { id: 'm150', sender: 'Grace Wu', tpl: null, title: 'Project Atlas demo moves to Mon 11/10 09:00', content: 'The Atlas demo moves to Mon, Nov 10 at 09:00 in 5F-Ocean. Bring your laptop.', smsText: 'Atlas demo moves to Mon 11/10 09:00, 5F-Ocean.', channels: ['push'], sms: true, status: 'pending', created: '2026/11/02 16:20', sched: '2026/11/10 08:30', total: 7, ok: 0, creator: 'p01', team: null, aud: [['g', 'g9']], review: { by: 'icsd' } },
)
// one message that uses every kind of audience: an org, a group, two colleagues and two external vendors
{
  const aud: [string, string][] = [['o', 'PUX'], ['g', 'g6'], ['p', 'p02'], ['p', 'p22'], ['e', 'lisa.ho@vendor-example.com'], ['e', '0988-000-222']]
  const total = flatten(audToTags(aud), GROUPS).length + 2
  MINE.push({ id: 'm154', sender: 'Grace Wu', tpl: null, title: 'Design review with Northwind Studio: Thu 11/6 14:00', content: 'Design review with Northwind Studio on Thu, Nov 6 at 14:00 in 5F-Ocean. Guests get badges at the B lobby.', smsText: 'Design review Thu 11/6 14:00, 5F-Ocean. Badges at B lobby.',
    channels: ['push', 'email'], sms: true, status: 'sent', created: '2026/11/03 11:20', sched: null, total, ok: total - 2, creator: 'p01', team: null, aud,
    email: { mode: 'own', subject: 'Design review with Northwind Studio: Thu, Nov 6, 14:00', html: textToHtml('Hi all,\n\nOur design review with Northwind Studio is on Thu, Nov 6 at 14:00 in 5F-Ocean. Guests get badges at the B lobby.\n\nGrace'), atts: [] },
    byCh: { push: [total - 6, total - 2], email: [total - 3, total], sms: [3, 4] }, fr: [['App unregistered', 'SMS fallback: number not in service']], fx: [['lisa.ho@vendor-example.com', 'Mailbox full (552)']] })
}
// still going out: Device Notifications has finished, Email and SMS fallback are still sending
MINE.push({ id: 'm155', sender: 'Grace Wu', tpl: null, title: 'Fire alarm test in Building B today at 15:00', content: 'The fire alarm in Building B will be tested today at 15:00 for about 10 minutes. No need to evacuate.', smsText: 'Fire alarm test in Bldg B today 15:00, about 10 min. No need to evacuate.',
  channels: ['push', 'email'], sms: true, status: 'progress', created: '2026/11/05 14:30', sched: null, total: 21, ok: 19, creator: 'p01', team: null, aud: [['o', 'PUX']], email: { mode: 'same' },
  byCh: { push: [19, 21], email: [15, 21], sms: [1, 2] }, chSt: { push: 'sent' } })
// One-record-per-channel version only: every status in every space you're in, and channels whose status
// differs from the rest of their message (one still sending, or one that failed while the others went out)
if (SPLIT) {
  const ESH = 'ESH Emergency', F18 = 'F18 Facility', OPS = 'Platform Ops', UX = 'UX Team'
  MINE.push(
    // personal
    { id: 'm160', sender: 'Grace Wu', tpl: null, title: 'UX sync moves to Tue 11/4 10:00', content: 'Our weekly UX sync moves to Tue, Nov 4 at 10:00 in 5F-Ocean.', smsText: 'UX sync moves to Tue 11/4 10:00, 5F-Ocean.', channels: ['push'], sms: true, status: 'expired', created: '2026/11/03 17:10', sched: '2026/11/04 09:00', total: 9, ok: 0, creator: 'p01', team: null, aud: [['g', 'g8']], review: { by: 'icsd', at: '2026/11/04 11:25' } },
    { id: 'm161', sender: 'Grace Wu', tpl: null, title: 'Team lunch on Fri 11/7: pick your order by Thu', content: 'Team lunch is on Fri, Nov 7 at 12:00. Pick your order in the shared sheet by Thu.', channels: ['push', 'email'], sms: false, status: 'sent', created: '2026/11/04 10:02', sched: null, total: 9, ok: 9, creator: 'p01', team: null, aud: [['g', 'g8']], email: { mode: 'same' },
      byCh: { push: [9, 9], email: [0, 9] }, chSt: { email: 'error' }, err: { title: 'The mail server rejected the batch at 10:02.', text: 'No one got this by Email. Device Notifications went out as usual.' } },
    // personal: urgent sends (SMS approval skipped, with the reason written at send time) in every status.
    // An outside contact still needs the supervisor, so pending / expired / rejected are the supervisor's.
    { id: 'm180', sender: 'Grace Wu', tpl: null, title: 'Parking lot A closed from 15:00 today', content: 'Parking lot A is closed from 15:00 today for an emergency water-pipe repair. Please use lot C.', smsText: 'Lot A closed from 15:00 today (pipe repair). Use lot C.', channels: ['push', 'email'], sms: true, status: 'pending', created: '2026/11/06 13:10', sched: null, total: 10, ok: 0, creator: 'p01', team: null, aud: [['g', 'g8'], ['e', 'joy.wu@vendor-example.com']], email: { mode: 'same' }, review: { by: 'mgr' }, bypass: { by: 'p01', at: '2026/11/06 13:10', reason: 'The repair crew starts at 15:00 and staff park from 14:30, so this can’t wait for SMS approval.' } },
    { id: 'm181', sender: 'Grace Wu', tpl: null, title: 'Badge reader outage at the B lobby until 12:00', content: 'The badge readers at the B lobby are down until 12:00. Use the side entrance and show your badge to security.', smsText: 'B lobby badge readers down until 12:00. Use the side entrance.', channels: ['push', 'email'], sms: true, status: 'expired', chSt: { email: 'canceled' }, created: '2026/11/05 17:40', sched: '2026/11/06 07:30', total: 10, ok: 0, creator: 'p01', team: null, aud: [['g', 'g8'], ['e', 'joy.wu@vendor-example.com']], email: { mode: 'same' }, review: { by: 'mgr', at: '2026/11/06 09:20' }, bypass: { by: 'p01', at: '2026/11/05 17:40', reason: 'People start arriving at 07:30; the outage was found after SMS reviewers left.' } },
    { id: 'm182', sender: 'Grace Wu', tpl: null, title: 'Fire drill moved to 14:00 today', content: 'The fire drill in Building A moves up to 14:00 today. Follow your floor warden to the assembly point.', smsText: 'Fire drill moved to 14:00 today. Follow your floor warden.', channels: ['push', 'email'], sms: true, status: 'rejected', created: '2026/11/05 09:05', sched: null, total: 10, ok: 0, creator: 'p01', team: null, aud: [['g', 'g8'], ['e', 'joy.wu@vendor-example.com']], email: { mode: 'same' }, review: { by: 'mgr', at: '2026/11/05 09:40', reason: 'A drill time change goes through the facility team first. Ask them to confirm, then submit again.' }, bypass: { by: 'p01', at: '2026/11/05 09:05', reason: 'The time changed an hour ago and some staff have already planned around the old one.' } },
    { id: 'm183', sender: 'Grace Wu', tpl: null, title: 'Network maintenance tonight 22:00: save your work', content: 'The office network restarts tonight at 22:00 for about 10 minutes. Save your work before then.', smsText: 'Office network restarts 22:00 tonight, about 10 min. Save your work.', channels: ['push'], sms: true, status: 'scheduled', created: '2026/11/06 10:30', sched: '2026/11/06 21:30', total: 9, ok: 0, creator: 'p01', team: null, aud: [['g', 'g8']], bypass: { by: 'p01', at: '2026/11/06 10:30', reason: 'The vendor moved the window to tonight this morning; SMS approval would not finish before 21:30.' } },
    { id: 'm184', sender: 'Grace Wu', tpl: null, title: 'Water leak on 5F: avoid the east corridor', content: 'There is a water leak on 5F near the east corridor. Please avoid the area until facility staff clear it.', smsText: 'Water leak on 5F east corridor. Avoid the area.', channels: ['push', 'desktop'], sms: true, status: 'progress', created: '2026/11/06 11:50', sched: null, total: 9, ok: 6, creator: 'p01', team: null, aud: [['g', 'g8']], byCh: { push: [6, 9], desktop: [4, 9] }, bypass: { by: 'p01', at: '2026/11/06 11:50', reason: 'People are walking through the leak area right now.' } },
    { id: 'm185', sender: 'Grace Wu', tpl: null, title: 'Elevator 3 out of service until 16:00', content: 'Elevator 3 is out of service until 16:00 for an emergency repair. Please use elevators 1 and 2 or the stairs.', smsText: 'Elevator 3 out of service until 16:00. Use 1, 2 or the stairs.', channels: ['push'], sms: true, status: 'sent', created: '2026/11/06 09:15', sched: null, total: 9, ok: 8, creator: 'p01', team: null, aud: [['g', 'g8']], byCh: { push: [8, 9], sms: [1, 1] }, fr: [['App unregistered', 'SMS fallback: number not in service']], bypass: { by: 'p01', at: '2026/11/06 09:15', reason: 'An elderly visitor was stuck this morning; people need to know before the next meeting block.' } },
    { id: 'm186', sender: 'Grace Wu', tpl: null, title: 'Power dip in Building C: check your equipment', content: 'There was a short power dip in Building C at 08:20. Please check that your equipment restarted correctly.', smsText: 'Power dip in Bldg C at 08:20. Check your equipment.', channels: ['push'], sms: true, status: 'error', created: '2026/11/06 08:25', sched: null, total: 9, ok: 0, creator: 'p01', team: null, aud: [['g', 'g8']], fr: [['Not dispatched (MNP-5307)']], fo: 'PUX', err: { title: 'The push gateway returned an authentication error at 08:25.', text: 'No one received this message. You can resend now.' }, bypass: { by: 'p01', at: '2026/11/06 08:25', reason: 'Equipment can be damaged if it restarts wrongly; people need to check right away.' } },
    // Platform Ops
    { id: 'm162', sender: OPS, tpl: 't4', title: 'tWorkspace upgrade tonight at 23:00: save your work', content: 'tWorkspace will restart for an upgrade tonight at 23:00 (GMT+8). Save your work before then; it takes about 15 minutes.', smsText: 'tWorkspace restarts tonight 23:00 for an upgrade, about 15 min. Save your work before then. Details in tWorkspace.', channels: ['push'], sms: true, status: 'rejected', created: '2026/11/04 15:30', sched: null, total: 312, ok: 0, creator: 'p22', team: 'tm1', aud: [['g', 'g3']], review: { by: 'icsd', at: '2026/11/04 16:40', reason: 'The SMS text is longer than one message. Shorten it to 70 characters.' } },
    { id: 'm163', sender: OPS, tpl: null, title: 'tWorkspace 5.2 is live: what’s new', content: 'tWorkspace 5.2 is live: faster search, a new files panel and dark mode on desktop. Release notes are in the Help center.', channels: ['push', 'desktop', 'email'], sms: false, status: 'progress', created: '2026/11/05 14:10', sched: null, total: 586, ok: 520, creator: 'p10', team: 'tm1', aud: [['o', 'PENG'], ['o', 'PDEV'], ['o', 'ITIS'], ['g', 'g3'], ['p', 'p17'], ['e', 'alex.chen@vendor-example.com']], email: { mode: 'same' },
      review: { by: 'mgr', at: '2026/11/05 14:05' }, byCh: { push: [570, 585], desktop: [410, 585], email: [520, 586] }, chSt: { push: 'sent' } },
    // Fab 18 Communications
    { id: 'm164', sender: F18, tpl: null, title: 'Water shutdown: Fab 18 Phase 3, Sat 11/8 08:00–12:00', content: 'Water supply in Fab 18 Phase 3, Building A is shut off on Sat, Nov 8 from 08:00 to 12:00 for pipe repairs. Restrooms on 1F stay open.', smsText: 'Water off F18 P3 Bldg A Sat 11/8 08:00-12:00. 1F restrooms open.', channels: ['push'], sms: true, status: 'pending', created: '2026/11/05 11:40', sched: '2026/11/07 17:00', total: 500, ok: 0, creator: 'p24', team: 'tm2', aud: [['o', 'FMFG'], ['g', 'g1'], ['p', 'p02'], ['e', '0933-200-415']], review: { by: 'both' } },
    { id: 'm165', sender: F18, tpl: null, title: 'Parking lot B closed for resurfacing on 11/4', content: 'Parking lot B is closed all day on Tue, Nov 4 for resurfacing. Please use lot D; shuttles run every 10 minutes.', smsText: 'Lot B closed Tue 11/4. Use lot D, shuttle every 10 min.', channels: ['push'], sms: true, status: 'expired', created: '2026/11/02 16:00', sched: '2026/11/03 07:30', total: 86, ok: 0, creator: 'p20', team: 'tm2', aud: [['g', 'g1']], review: { by: 'icsd', at: '2026/11/03 09:15' } },
    { id: 'm166', sender: F18, tpl: null, title: 'Shuttle bus route change from 11/10', content: 'From Mon, Nov 10 the Fab 18 shuttle also stops at Gate 3. The new timetable is on tWorkspace.', smsText: 'F18 shuttle stops at Gate 3 from 11/10. Timetable: tsmc.link/shuttle', channels: ['push'], sms: true, status: 'rejected', created: '2026/11/04 09:50', sched: null, total: 412, ok: 0, creator: 'p12', team: 'tm2', aud: [['o', 'FMFG']], review: { by: 'icsd', at: '2026/11/04 10:20', reason: 'The SMS includes a link. Links aren’t allowed in SMS; remove it and submit again.' } },
    { id: 'm167', sender: F18, tpl: 't3', title: 'Shift handover moves to 07:40 from Monday', content: 'From Mon, Nov 10 the morning shift handover starts at 07:40 instead of 07:30, in the same room.', channels: ['push'], sms: false, status: 'error', created: '2026/11/03 08:12', sched: null, total: 86, ok: 0, creator: 'p16', team: 'tm2', aud: [['g', 'g1']], fr: [['Not dispatched (MNP-5233)']], fo: 'FMFG', err: { title: 'The push gateway timed out at 08:12.', text: 'No one received this message. You can resend now.' } },
    // ESH Emergency
    { id: 'm168', sender: ESH, tpl: null, title: 'Gas leak drill: Fab 15 Phase 6, Mon 11/10 10:00', content: 'ERT members: a gas leak drill starts Mon, Nov 10 at 10:00 in Fab 15 Phase 6. Report to the ERT room by 09:45.', smsText: 'Gas leak drill Mon 11/10 10:00 F15 P6. ERT room by 09:45.', channels: ['push'], sms: true, status: 'pending', created: '2026/11/05 10:15', sched: '2026/11/09 18:00', total: 45, ok: 0, creator: 'p13', team: 'tm3', aud: [['g', 'g4']], review: { by: 'icsd' } },
    { id: 'm169', sender: ESH, tpl: null, title: 'Earthquake drill reminder: Tue 11/4 10:00', content: 'Reminder: the quarterly earthquake drill starts Tue, Nov 4 at 10:00. Drop, cover and hold on, then follow your area’s route.', smsText: 'Quake drill Tue 11/4 10:00. Drop, cover, hold on.', channels: ['push'], sms: true, status: 'expired', created: '2026/11/03 15:20', sched: '2026/11/04 08:00', total: 96, ok: 0, creator: 'p19', team: 'tm3', aud: [['o', 'FESH']], review: { by: 'icsd', at: '2026/11/04 09:40' } },
    { id: 'm170', sender: ESH, tpl: null, title: 'Air quality alert: limit outdoor work today', content: 'Air quality is poor today (AQI 160). Limit outdoor work, and wear an N95 mask if you must work outside.', smsText: 'Poor air today (AQI 160). Limit outdoor work, wear N95 outside.', channels: ['push'], sms: true, status: 'rejected', created: '2026/11/03 12:40', sched: null, total: 96, ok: 0, creator: 'p07', team: 'tm3', aud: [['o', 'FESH']], review: { by: 'icsd', at: '2026/11/03 13:05', reason: 'Alerts need the ESH duty officer’s contact in the text. Add it and submit again.' } },
    { id: 'm171', sender: ESH, tpl: null, title: 'Quarterly ERT training: Thu 11/13 14:00', content: 'ERT members: quarterly training is on Thu, Nov 13 at 14:00 in the Fab 15 training room. Bring your PPE.', channels: ['push', 'email'], sms: false, status: 'scheduled', created: '2026/11/05 09:05', sched: '2026/11/12 09:00', total: 45, ok: 0, creator: 'p19', team: 'tm3', aud: [['g', 'g4']], email: { mode: 'same' } },
    { id: 'm172', sender: ESH, tpl: null, title: 'Chemical delivery at Dock 2 today 13:00–14:00', content: 'A chemical delivery arrives at Dock 2 today from 13:00 to 14:00. Keep the dock area clear and follow the ESH staff’s directions.', smsText: 'Chemical delivery Dock 2 today 13:00-14:00. Keep the area clear.', channels: ['push'], sms: true, status: 'sent', created: '2026/11/04 12:30', sched: null, total: 143, ok: 133, creator: 'p13', team: 'tm3', aud: [['o', 'FESH'], ['g', 'g4'], ['p', 'p11'], ['e', '0912-555-018']], review: { by: 'both', at: '2026/11/04 12:20' },
      byCh: { push: [133, 142], sms: [0, 10] }, chSt: { sms: 'error' }, err: { title: 'The SMS gateway was unavailable at 12:31.', text: 'The SMS fallback didn’t go out. Device Notifications reached everyone else as usual.' } },
    // UX Team
    { id: 'm173', sender: UX, tpl: 't12', title: 'Usability study invitation: tWorkspace search', content: 'We’re testing the new tWorkspace search. Join a 30-minute session next week; pick a slot in the sign-up sheet.', channels: ['email'], sms: false, status: 'pending', created: '2026/11/05 09:30', sched: null, total: 61, ok: 0, creator: 'p05', team: 'tm4', aud: [['o', 'PUX'], ['g', 'g6'], ['p', 'p02'], ['e', 'pat.lin@research-example.com'], ['e', 'joy.wu@research-example.com']], review: { by: 'mgr' },
      email: { mode: 'own', subject: 'Invitation: 30-minute usability study on tWorkspace search', html: textToHtml('Hi,\n\nWe’re testing the new tWorkspace search and would love your help. Sessions are 30 minutes, next week. Pick a slot in the sign-up sheet.\n\nThanks,\nUX Team'), atts: [] } },
    { id: 'm174', sender: UX, tpl: null, title: 'Design critique moves to Tue 11/4 15:00', content: 'This week’s design critique moves to Tue, Nov 4 at 15:00 in 7F-Forest.', smsText: 'Design critique moves to Tue 11/4 15:00, 7F-Forest.', channels: ['push'], sms: true, status: 'expired', created: '2026/11/03 18:00', sched: '2026/11/04 13:00', total: 37, ok: 0, creator: 'p09', team: 'tm4', aud: [['g', 'g6']], review: { by: 'icsd', at: '2026/11/04 15:30' } },
    { id: 'm175', sender: UX, tpl: null, title: 'Design System office hours: Wed 15:00', content: 'Design System office hours are on Wed at 15:00 in 7F-Forest. Bring your questions about components and tokens.', smsText: 'DS office hours Wed 15:00, 7F-Forest.', channels: ['push'], sms: true, status: 'rejected', created: '2026/11/02 10:30', sched: null, total: 37, ok: 0, creator: 'p18', team: 'tm4', aud: [['g', 'g6']], review: { by: 'icsd', at: '2026/11/02 11:10', reason: 'SMS is for urgent or time-critical notices. Send this by Device Notifications or Email instead.' } },
    { id: 'm176', sender: UX, tpl: null, title: 'Figma library update: new table components', content: 'The Figma library has new table components and updated tokens. Update your files from the Assets panel.', channels: ['push', 'desktop'], sms: false, status: 'progress', created: '2026/11/05 14:40', sched: null, total: 37, ok: 30, creator: 'p09', team: 'tm4', aud: [['g', 'g6']],
      byCh: { push: [35, 37], desktop: [24, 37] }, chSt: { push: 'sent' } },
    { id: 'm177', sender: UX, tpl: null, title: 'Reminder: send design review topics by Thu', content: 'Please send your topics for next week’s design review by Thu, Nov 6.', channels: ['desktop'], sms: false, status: 'error', created: '2026/11/03 16:02', sched: null, total: 37, ok: 0, creator: 'p01', team: 'tm4', aud: [['g', 'g6']], fr: [['Not dispatched (MNP-5241)']], fo: 'PUX', err: { title: 'Sending was interrupted by a platform restart at 16:02.', text: 'No one received this message. You can resend now.' } },
  )
}
MINE.forEach(r => { if (r.sender === '') r.sender = 'gywu' })
ROWS0.push(...MINE)
ROWS0.sort((a, b) => b.created.localeCompare(a.created))


// channels of a sent message, with SMS fallback listed after Device Notifications
export function rowChs(r: Row): Channel[] { return CH_ORDER.filter(k => k === 'sms' ? !!r.sms : r.channels.indexOf(k) >= 0) }

export function failList(r: Row): Fail[] {
  if (r._f) return r._f
  const n = (r.status === 'sent' || r.status === 'error') ? r.total - r.ok : 0
  const out: Fail[] = [], fx = r.fx || [], fr = r.fr || [['Not delivered']]
  for (let i = 0; i < n; i++) {
    if (i < fx.length) { out.push({ ext: fx[i][0], reason: fx[i][1], fallback: '' }); continue }
    const who = r.fw && r.fw[i]
    const p = who ? PMAP[who] : genPerson(r.id + '-' + i, r.fo)
    const rs = fr[i % fr.length]
    out.push({ p, reason: rs[0], fallback: rs[1] || '' })
  }
  r._f = out
  return out
}

// Who a single channel missed: the people no channel reached come first (they missed every channel),
// then made-up people this channel missed but another channel reached
const CH_WHY: Record<Channel, string[]> = {
  push: ['App unregistered'],
  desktop: ['Desktop agent not installed', 'Desktop agent offline for 7+ days'],
  sms: ['Number not in service', 'Carrier rejected the message', 'No phone number on file'],
  email: ['Mailbox full (552)', 'Address not found (550)'],
}
const chFailCache: Record<string, Fail[]> = {}
export function chFailList(r: Row, k: Channel, n: number): Fail[] {
  const key = r.id + '|' + k + '|' + n
  if (chFailCache[key]) return chFailCache[key]
  const all = failList(r), out: Fail[] = []
  const fits = (f: Fail) => f.ext ? (k === 'email' ? f.ext.indexOf('@') >= 0 : k === 'sms' ? f.ext.indexOf('@') < 0 : false) : true
  all.filter(fits).forEach(f => {
    if (out.length >= n) return
    // the person's recorded reason when it belongs to this channel, otherwise a typical one for it
    const sms = (f.fallback || '').replace(/^SMS fallback: /, '').replace(/^./, x => x.toUpperCase())
    const own = k === 'sms' ? sms : f.reason, why = f.ext || CH_WHY[k].indexOf(own) >= 0 ? own : CH_WHY[k][out.length % CH_WHY[k].length]
    // on Device Notifications with SMS fallback on, these people's SMS failed too: say why
    out.push({ p: f.p, ext: f.ext, reason: why, fallback: k === 'push' && r.sms ? f.fallback || 'SMS fallback: no phone number on file' : '', via: null })
  })
  // another channel that reached the rest; SMS only goes to people Device Notifications missed
  const other = rowChs(r).find(x => x !== k && x !== 'sms' && !(k === 'sms' && x === 'push')) || null
  // with SMS fallback on, the people Device Notifications missed first get it by SMS
  let bySms = k === 'push' && r.sms ? ((r.byCh && r.byCh.sms) ? r.byCh.sms[0] : 0) : 0
  for (let i = 0; out.length < n; i++) out.push({ p: genPerson(r.id + '-' + k + '-' + i, r.fo), reason: CH_WHY[k][i % CH_WHY[k].length], fallback: '', via: bySms-- > 0 ? 'sms' : other })
  chFailCache[key] = out
  return out
}

// How a person was added to an audience group: by NT account, email, mobile number or employee ID. Contractors
// are always their own address or number. Sample data: picked from the person, so it stays the same.
export type AddedAs = { type: 'nt' | 'email' | 'phone' | 'emp'; value: string }
export function addedAs(groupId: string, p: Person): AddedAs {
  if (p.extKind) return { type: p.extKind === 'phone' ? 'phone' : 'email', value: p.value || '' }
  const h = hsh(groupId + p.id) % 10
  if (h < 6 || !p.nt) return { type: 'nt', value: p.nt }
  if (h < 8) return { type: 'email', value: p.nt + '@' + DOMAIN }
  if (h === 8 && (p.co || p.pp)) return { type: 'phone', value: (p.co || p.pp).replace(/^(\d{4})(\d{3})(\d{3})$/, '$1-$2-$3') }
  return { type: 'emp', value: p.emp }
}
