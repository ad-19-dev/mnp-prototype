// Sample data and domain rules for MNP, carried over from the v2 prototype.
// Everything here is plain data and pure functions; React state lives in store.ts.

export const DOMAIN = 'tsmc.com'
export const EMAIL_RE = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/
export const CAP = 500
export const ME = 'p01'
export const SUPERVISOR = 'Jimmy Chen 陳志明'

export type Channel = 'push' | 'desktop' | 'email' | 'sms'
export const CH_ORDER: Channel[] = ['push', 'desktop', 'email', 'sms']
export const CH_CARDS: Channel[] = ['push', 'desktop', 'email']
export const LIM = { sender: 20, title: 50, push: 300, desktop: 200, sms: 70, subject: 120, body: 5000, files: 5, bytes: 10 * 1024 * 1024, name: 50 }
export const BLOCKED = ['exe', 'bat', 'cmd', 'com', 'js', 'vbs', 'msi', 'ps1', 'scr']
// Desktop OS notifications show about 2 lines of title and 2–3 lines of text; CJK characters are about twice as wide
export const DESK = { title: 80, text: 120 }

export interface Person {
  id: string; zh: string; en: string; nt: string; emp: string; org: string; title: string
  mvpn: string; co: string; pp: string; dev: boolean; desk: boolean; c: number; ini: string
  gen?: boolean; extKind?: 'phone' | 'email'; value?: string
}
export interface Org { code: string; name: string; count: number }
export interface Group {
  id: string; name: string; desc: string; count: number; updated: string; creator: string
  role: 'Owner' | 'Editor' | 'Viewer'; members?: { pid: string }[]; collabs?: { pid: string; role: string }[]; fresh?: number
}
export interface EmailBody { mode: 'same' | 'own'; subject?: string; html?: string; atts?: { name: string; size: number }[] }
export interface Template {
  id: string; name: string; sender: string; title: string; content: string; sms: string
  email: EmailBody; shared: [string, string][]; updated: string; owner: string; fresh?: number
}
export type Status = 'scheduled' | 'progress' | 'sent' | 'error'
export interface Row {
  id: string; sender: string; tpl: string | null; title: string; content: string; smsText?: string
  channels: Channel[]; sms: boolean; status: Status; created: string; sched: string | null
  total: number; ok: number; creator: string; aud: [string, string][]; email?: EmailBody | null
  fr?: string[][]; fo?: string; fw?: string[]; fx?: string[][]; err?: { title: string; text: string } | null
  byCh?: Partial<Record<Channel, [number, number]>> | null; fresh?: number; _f?: Fail[] | null
  // ICSD approval skipped because the message was urgent: who, when and why (kept for the record)
  bypass?: { by: string; at: string; reason: string } | null
}
export interface Tag { key: string; type: 'person' | 'group' | 'org' | 'ext'; id?: string; email?: string }
export interface Fail { p?: Person; ext?: string; reason: string; fallback: string }

const SUR = [['陳','Chen'],['林','Lin'],['黃','Huang'],['張','Chang'],['李','Lee'],['王','Wang'],['吳','Wu'],['劉','Liu'],['蔡','Tsai'],['楊','Yang'],['許','Hsu'],['鄭','Cheng'],['謝','Hsieh'],['郭','Kuo'],['洪','Hung'],['曾','Tseng'],['邱','Chiu'],['廖','Liao'],['賴','Lai'],['周','Chou']]
const GIV = [['志豪','Jason'],['雅雯','Vivian'],['冠廷','Ethan'],['怡安','Annie'],['柏宇','Brian'],['家瑜','Joyce'],['宗佑','Leo'],['佩芸','Cindy'],['承翰','Ryan'],['思穎','Iris'],['俊傑','Allen'],['欣妤','Tina'],['彥均','Ivan'],['詩婷','Sandy'],['建志','Eric'],['郁芳','Wendy'],['品豪','Sean'],['宜庭','Peggy'],['書瑋','Kevin'],['芷萱','Yvonne'],['育誠','Owen'],['筱涵','Hannah'],['哲維','Victor'],['婉婷','Fiona']]
const TITLES = ['Engineer', 'Senior Engineer', 'Technician', 'Specialist', 'Analyst', 'Shift Lead']

export const ORGS: Org[] = [
  { code: 'PLT/ENG1', name: 'Platform Engineering 1', count: 58 },
  { code: 'PLT/ENG2', name: 'Platform Engineering 2', count: 73 },
  { code: 'PLT/UX', name: 'Platform User Experience', count: 21 },
  { code: 'F18/MFG3', name: 'Fab 18 Manufacturing 3', count: 412 },
  { code: 'F15/ESH', name: 'Fab 15 Environment, Safety and Health', count: 96 },
  { code: 'IT/INFRA', name: 'IT Infrastructure Services', count: 140 },
  { code: 'HR/CB', name: 'HR Compensation and Benefits', count: 64 },
]

function initials(en: string) { const a = en.split(' '); return ((a[0] || '').charAt(0) + (a[1] || '').charAt(0)).toUpperCase() }
type PRow = [string, string, string, string, string, string, string, string, string, string, number, number]
function mkP(a: PRow, i: number): Person {
  return { id: a[0], zh: a[1], en: a[2], nt: a[3], emp: a[4], org: a[5], title: a[6], mvpn: a[7], co: a[8], pp: a[9], dev: !!a[10], desk: !!a[11], c: i % 8, ini: initials(a[2]) }
}
export const PEOPLE: Person[] = ([
  ['p01','吳佳穎','Grace Wu','gywu','120588','PLT/ENG1','Senior Engineer','61588','0918226588','0912337415',1,1],
  ['p02','陳志明','Jimmy Chen','cmchen','103217','PLT/ENG1','Section Manager','60217','0918103217','',1,1],
  ['p03','林冠宇','Kevin Lin','kylin','118842','PLT/ENG2','Engineer','68842','0918118842','0933552019',1,1],
  ['p04','林家豪','Kevin Lin','chlinb','121905','F18/MFG3','Shift Lead','','','0921660734',1,0],
  ['p05','陳怡君','Yi-Chun Chen','ycchenz','115630','PLT/UX','UX Designer','65630','0918115630','0975218306',1,1],
  ['p06','陳怡君','Joyce Chen','ycchenq','109472','HR/CB','HR Specialist','69472','0918109472','',1,1],
  ['p07','陳怡君','Erin Chen','ycchenm','124118','F15/ESH','ESH Engineer','','','0910884261',0,1],
  ['p08','黃柏翰','Brian Huang','bhhuang','112306','PLT/ENG2','Senior Engineer','62306','0918112306','0988130557',1,1],
  ['p09','張雅婷','Tina Chang','ytchang','119774','PLT/UX','Senior UX Designer','69774','0918119774','',1,1],
  ['p10','李承恩','Ethan Lee','celee','126031','PLT/ENG1','Engineer','','','0937402118',1,1],
  ['p11','王思妤','Iris Wang','sywangd','122487','IT/INFRA','IT Specialist','62487','0918122487','',1,1],
  ['p12','蔡宗翰','Leo Tsai','thtsai','110958','F18/MFG3','Manufacturing Manager','60958','0918110958','0920775641',1,1],
  ['p13','楊佩珊','Peggy Yang','psyang','117263','F15/ESH','Safety Officer','67263','0918117263','',1,0],
  ['p14','許俊宏','Allen Hsu','chhsu','108145','IT/INFRA','Infrastructure Manager','68145','0918108145','',1,1],
  ['p15','鄭詩涵','Sandy Cheng','shcheng','125579','HR/CB','HR Partner','','','0963219804',0,1],
  ['p16','謝彥廷','Ryan Hsieh','ythsieh','120113','F18/MFG3','Equipment Engineer','','','',1,0],
  ['p17','郭欣怡','Cindy Kuo','hykuo','123640','PLT/ENG2','Product Manager','63640','0918123640','0912708392',1,1],
  ['p18','洪品睿','Sean Hung','prhung','127702','PLT/UX','UX Designer','','','0958441276',1,1],
  ['p19','曾郁婷','Wendy Tseng','yttseng','114389','F15/ESH','ESH Section Manager','64389','0918114389','',1,1],
  ['p20','邱建宏','Eric Chiu','chchiu','106821','F18/MFG3','Shift Lead','66821','0918106821','0935692147',1,0],
  ['p21','廖宜蓁','Vivian Liao','ycliao','128356','IT/INFRA','Security Analyst','68356','0918128356','',0,1],
  ['p22','賴書豪','Ivan Lai','shlai','116904','PLT/ENG1','Senior Engineer','66904','0918116904','0927583920',1,1],
  ['p23','周芷寧','Yvonne Chou','cnchou','129017','HR/CB','Recruiter','','','0971305468',1,1],
  ['p24','劉宗翰','Jason Liu','thliu','111472','F18/MFG3','Section Manager','61472','0918111472','',1,1],
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
  g1: { m: ['p12','p24','p04','p20','p16'], fill: ['F18/MFG3'], col: [['p12','Owner'],['p01','Editor'],['p24','Editor'],['p20','Viewer']] },
  g2: { m: ['p01','p22','p02','p03','p08','p10','p11','p14','p17','p21'], fill: ['PLT/ENG1','PLT/ENG2','IT/INFRA'], col: [['p01','Owner'],['p22','Editor'],['p02','Viewer']] },
  g3: { m: ['p17','p03','p08','p09','p05','p10'], fill: ['PLT/ENG1','PLT/ENG2','F18/MFG3','IT/INFRA','HR/CB'], col: [['p17','Owner'],['p01','Editor'],['p08','Viewer']] },
  g4: { m: ['p19','p13','p07'], fill: ['F15/ESH'], col: [['p19','Owner'],['p13','Editor'],['p01','Viewer']] },
  g5: { m: [], fill: ['PLT/ENG1','PLT/ENG2','F18/MFG3','F15/ESH','IT/INFRA','HR/CB','PLT/UX'], col: [['p23','Owner'],['p06','Editor'],['p01','Viewer']] },
  g6: { m: ['p09','p05','p18','p03','p01'], fill: ['PLT/UX','PLT/ENG2'], col: [['p09','Owner'],['p01','Editor'],['p05','Editor']] },
  g7: { m: ['p14','p11','p21'], fill: ['IT/INFRA'], col: [['p14','Owner'],['p11','Editor'],['p01','Viewer']] },
  g8: { m: ['p01','p05','p09','p18'], fill: ['PLT/UX'], col: [['p01','Owner'],['p09','Editor']] },
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
  const p: Person = { id, zh: su[0] + gv[0], en: gv[1] + ' ' + su[1], nt: (gv[1].charAt(0) + su[1]).toLowerCase() + ((h >>> 13) % 90 + 10), emp: String(100000 + (h % 30000)), org: org || ORGS[(h >>> 3) % ORGS.length].code, title: TITLES[(h >>> 17) % TITLES.length], mvpn: hasCo ? String(60000 + (h % 9999)) : '', co: hasCo ? '0918' + String(100000 + (h % 899999)) : '', pp: (h % 4) === 0 ? '09' + String(10000000 + (h % 89999999)) : '', dev: (h % 9) !== 0, desk: (h % 6) !== 0, c: h % 8, gen: true, ini: '' }
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
  if (/^\d{5}$/.test(t)) { const p = PEOPLE.find(x => x.mvpn === t); return p ? { kind: 'one', p, by: 'MVPN' } : { kind: 'miss', why: 'No one uses this MVPN' } }
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
// so "61588" can't be read as an MVPN in one list and an employee ID in another.
export type ListKind = 'nt' | 'emp' | 'name' | 'email' | 'phone' | 'mvpn' | 'org'
export const LIST_KINDS: ListKind[] = ['nt', 'emp', 'name', 'email', 'phone', 'mvpn', 'org']
export const LIST_SAMPLES: Record<ListKind, string> = {
  nt: 'gywu, cmchen, ytchang, celee\nsywangd, psyang, a19999',
  emp: '120588, 112306, 110958, 114389\n999999, 12345',
  name: '陳怡君\nKevin Lin\nGrace Wu\n王小明',
  email: 'gywu@tsmc.com, cmchen@tsmc.com\npartner@example.com\nnobody@tsmc.com, not-an-email',
  phone: '0918-226-588\n0921660734\n0988-000-111\n0900-000-000',
  mvpn: '61588, 60217, 68842\n66904, 99999',
  org: 'PLT/UX\nF18/MFG3\nXYZ/123',
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
    if (!/^\d{5}$/.test(t)) return { kind: 'miss', why: 'Not a 5-digit MVPN' }
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
export const SAMPLE_SEND = 'gywu, cmchen, 112306, ytchang, celee, sywangd, 110958, psyang, chhsu, shcheng\nythsieh; hykuo; prhung; 114389; chchiu; ycliao; shlai; cnchou; thliu\n陳怡君\nKevin Lin\nPLT/UX\n0921660734\na19999\n0988-000-111'
export const SAMPLE_GROUP = 'ytchang, 115630, Kevin Lin\n0920-775-641; 66904\nPLT/UX\npartner@example.com, a19999'

// ---------- templates ----------
// Templates store message text by format, not by channel: notification text (Device Notifications and Desktop OS),
// SMS text, and an optional separate email. They don't store receivers or attachments.
export const TEMPLATES: Template[] = [
  { id: 't1', name: 'Emergency drill notice', sender: 'F18 Facility', title: 'Fire drill at [time] today', content: 'A fire evacuation drill starts at [time] in [building]. Follow your area’s evacuation route and gather at [assembly point]. Do not use elevators.', sms: 'Fire drill [time] today at [building]. Gather at [assembly point].', email: { mode: 'same' }, shared: [['o', 'F18/MFG3'], ['o', 'F15/ESH']], updated: '2026/09/12', owner: 'p12' },
  { id: 't2', name: 'Typhoon work arrangement', sender: 'ESH Emergency', title: 'Typhoon alert: work arrangement for [date]', content: 'Due to the typhoon warning, non-fab staff should work from home on [date]. Fab shift staff, follow your section manager’s arrangement. Check tWorkspace for updates.', sms: 'Typhoon alert: non-fab staff WFH on [date]. Fab shifts as arranged.', email: { mode: 'own', subject: 'Typhoon alert: work arrangement for [date]', html: '<p>Due to the typhoon warning, work arrangements for <b>[date]</b> are as follows.</p><ul><li><b>Non-fab staff:</b> work from home. Keep tWorkspace and Teams open during working hours.</li><li><b>Fab shift staff:</b> follow your section manager’s arrangement.</li><li><b>Commuting:</b> don’t travel if your city announces a work and school closure.</li></ul><p>Updates are posted on the <a href="https://tworkspace/esh/typhoon">ESH typhoon page</a>.</p><p>ESH Emergency</p>' }, shared: [['o', 'F15/ESH'], ['o', 'F18/MFG3'], ['o', 'PLT/ENG1'], ['o', 'IT/INFRA']], updated: '2026/08/28', owner: 'p19' },
  { id: 't3', name: 'Shift change reminder', sender: 'F18 MFG3', title: 'Shift handover moves to [time]', content: 'Starting [date], the shift handover meeting moves to [time] in [room]. Shift leads, please update your handover notes before the meeting.', sms: '', email: { mode: 'same' }, shared: [['o', 'F18/MFG3']], updated: '2026/09/30', owner: 'p24' },
  { id: 't4', name: 'System maintenance window', sender: 'Platform Ops', title: '[System] maintenance: [date] [time]', content: '[System] will be unavailable on [date] from [start] to [end] (GMT+8). Save your work before the window starts.', sms: '', email: { mode: 'own', subject: '[System] maintenance on [date], [start]–[end]', html: '<p>Hi all,</p><p><b>[System]</b> will be unavailable on <b>[date] from [start] to [end]</b> (GMT+8) while we [reason].</p><p>During the window:</p><ul><li>You can’t sign in to [System].</li><li>Unsaved work may be lost, so save before [start].</li></ul><p>Follow progress on the <a href="https://tworkspace/status">tWorkspace status page</a>.</p><p>Platform Ops</p>' }, shared: [['o', 'PLT/ENG1'], ['o', 'PLT/ENG2'], ['p', 'p14']], updated: '2026/10/02', owner: 'p01' },
  { id: 't5', name: 'Password expiry reminder', sender: 'IT Service Desk', title: 'Your password expires in [n] days', content: 'Change your Windows password before [date] to keep access to tWorkspace and email. Press Ctrl+Alt+Del and choose Change a password.', sms: '', email: { mode: 'same' }, shared: [['o', 'IT/INFRA']], updated: '2026/07/19', owner: 'p11' },
  { id: 't6', name: 'Event invitation', sender: 'HR Benefits', title: '', content: '', sms: '', email: { mode: 'own', subject: 'You’re invited: [event] on [date]', html: '<p>Hi all,</p><p>Join us for <b>[event]</b> on [date] at [location]. [One sentence on why it matters.]</p><p>Sign up in <a href="https://tworkspace/hr">tWorkspace › HR Services</a> by [deadline].</p><p>[Team name]</p>' }, shared: [['o', 'HR/CB']], updated: '2026/09/05', owner: 'p06' },
  { id: 't7', name: 'Training invitation', sender: 'HR Talent', title: 'Training on [date]: [course name]', content: 'You’re registered for [course name] on [date], [time] in [room]. Details are in your email.', sms: '', email: { mode: 'own', subject: '[Course name]: your session on [date]', html: '<p>Hi,</p><p>You’re registered for <b>[course name]</b> on [date], [time] in [room].</p><ul><li>Bring your badge and laptop.</li><li>Can’t attend? Cancel in <a href="https://tworkspace/learning">tWorkspace › Learning</a> so someone on the waitlist can join.</li></ul><p>[Team name]</p>' }, shared: [['o', 'HR/CB']], updated: '2026/08/14', owner: 'p23' },
  { id: 't8', name: 'Incident resolved', sender: 'Platform Ops', title: 'Resolved: [issue]', content: 'The [issue] reported at [start time] is resolved. [What users should do now, if anything.] Thanks for your patience.', sms: '', email: { mode: 'same' }, shared: [['p', 'p22'], ['p', 'p02'], ['o', 'IT/INFRA']], updated: '2026/10/16', owner: 'p01' },
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
  R({ id: 'm016', sender: 'F18 Facility', tpl: 't1', title: 'Fire drill at 14:00 today: Fab 18 Phase 5', content: 'A fire evacuation drill starts at 14:00 in Fab 18 Phase 5, Building B. Follow your area’s evacuation route and gather at Assembly Point C. Do not use elevators.', smsText: 'Fire drill 14:00 today at F18 P5 Bldg B. Gather at Assembly Point C.', channel: 'push_sms', status: 'progress', created: '2026/10/19 10:05', sched: null, total: 412, ok: 268, creator: 'p12', aud: [['o','F18/MFG3']] }),
  R({ id: 'm015', sender: 'F18 Facility', tpl: null, title: 'Badge reader upgrade: tap twice after 07:00', content: 'Badge readers at Fab 18 gates 2 to 4 will be upgraded on Oct 20 between 06:00 and 07:00. If your badge isn’t accepted after 07:00, tap it twice and wait 3 seconds.', channel: 'push', status: 'scheduled', created: '2026/10/17 15:55', sched: '2026/10/20 05:30', total: 86, ok: 0, creator: 'p12', aud: [['g','g1']] }),
  R({ id: 'm014', sender: 'IT Service Desk', tpl: null, title: 'VPN client update required by Oct 23', content: 'Update your VPN client to version 6.2 before Oct 23. Open Software Center, search for VPN and select Update. Older versions will be blocked after the deadline.', channel: 'desktop', status: 'sent', created: '2026/10/18 16:30', sched: null, total: 140, ok: 138, creator: 'p14', aud: [['o','IT/INFRA']], fr: [['Desktop agent offline for 7+ days'], ['Desktop agent not installed']], fo: 'IT/INFRA' }),
  R({ id: 'm013', sender: 'HR Benefits', tpl: 't6', title: 'Annual health check sign-up opens Oct 21', content: 'Hi all,\n\nSign-up for the 2026 annual health check opens on Oct 21 at 09:00 in tWorkspace › HR Services. Slots at the Hsinchu clinic fill quickly, so book early.\n\nIf you need a slot outside working hours, reply to this email.\n\nHR Benefits', channel: 'email', status: 'scheduled', created: '2026/10/18 11:15', sched: '2026/10/21 09:00', total: 152, ok: 0, creator: 'p06', aud: [['o','PLT/ENG1'], ['o','PLT/ENG2'], ['o','PLT/UX']] }),
  R({ id: 'm012', sender: 'ESH Emergency', tpl: 't2', title: 'Typhoon alert: work from home on 10/17', content: 'Due to the typhoon warning, non-fab staff in Hsinchu should work from home on Oct 17. Fab shift staff, follow your section manager’s arrangement. Check tWorkspace for updates.', smsText: 'Typhoon alert: non-fab staff WFH on 10/17. Fab shifts as arranged.', channel: 'push_sms', status: 'sent', created: '2026/10/16 18:20', sched: null, total: 96, ok: 93, creator: 'p19', aud: [['o','F15/ESH']], fw: ['p07'], fr: [['No registered device', 'SMS fallback: number not in service'], ['Device unreachable for 72+ hours', 'SMS fallback: carrier rejected the message'], ['No registered device', 'SMS fallback: no phone number on file']], fo: 'F15/ESH' }),
  R({ id: 'm011', sender: 'Platform Ops', tpl: null, title: 'Resolved: file sync delay', content: 'The file sync delay reported at 09:40 is resolved. Files uploaded between 09:40 and 10:25 are now available. Thanks for your patience.', channel: 'push', status: 'sent', created: '2026/10/16 10:31', sched: null, total: 24, ok: 24, creator: 'p01', aud: [['g','g2']] }),
  R({ id: 'm010', sender: 'F18 MFG3', tpl: 't3', title: 'Shift handover moves to 07:15 from 10/20', content: 'Starting Oct 20, the day-shift handover meeting moves to 07:15 in room 3F-07. Night-shift leads, please update your handover notes before 07:00.', channel: 'push', status: 'sent', created: '2026/10/15 17:48', sched: null, total: 86, ok: 86, creator: 'p24', aud: [['g','g1']] }),
  R({ id: 'm009', sender: 'F15 ESH', tpl: 't1', title: 'Gas detection drill: ERT standby at 09:00', content: 'ERT members: the gas detection drill starts at 09:00 in Fab 15 Phase 7. Report to the ERT room by 08:45 with your full kit.', smsText: 'Gas drill 09:00 at F15 P7. ERT report to the ERT room by 08:45.', channel: 'push_sms', status: 'error', created: '2026/10/15 08:12', sched: null, total: 45, ok: 0, creator: 'p13', aud: [['g','g4']], fr: [['Not dispatched (MNP-5031)']], fo: 'F15/ESH', err: { title: 'The dispatch service timed out at 08:36.', text: 'No one received this message. The platform team was alerted automatically, and you can retry now.' } }),
  R({ id: 'm008', sender: 'Design System Guild', tpl: null, title: 'Design system 3.2 release notes', content: 'Hi everyone,\n\nDesign system 3.2 is out. Highlights: a denser data table option, a new Stepper component, and status colors that now meet 4.5:1 contrast.\n\nFull notes and migration tips are on the design system site.\n\nDesign System Guild', channel: 'email', status: 'sent', created: '2026/10/14 15:02', sched: null, total: 39, ok: 38, creator: 'p09', aud: [['g','g6'], ['e','lena.ho@example.com'], ['e','mark.tan@example.com']], fx: [['mark.tan@example.com', 'Recipient address rejected (550)']] }),
  R({ id: 'm007', sender: 'HR Talent', tpl: 't7', title: 'New hire orientation: Day 2 agenda', content: 'Welcome to Day 2!\n\nWe start at 09:00 in Training Center Room 2A. Today covers information security, ESH basics and a tour of tWorkspace.\n\nBring your badge and laptop.\n\nHR Talent', channel: 'email', status: 'sent', created: '2026/10/12 17:40', sched: '2026/10/13 08:00', total: 128, ok: 128, creator: 'p23', aud: [['g','g5']] }),
  R({ id: 'm006', sender: 'IT Security', tpl: null, title: 'Phishing alert: fake payroll emails', content: 'Emails claiming to be from Payroll ask you to confirm bank details. Don’t click the links. Use Report Phishing in Outlook, then delete the email.', channel: 'desktop', status: 'sent', created: '2026/10/12 14:12', sched: null, total: 470, ok: 466, creator: 'p21', aud: [['g','g3'], ['o','PLT/ENG2'], ['o','HR/CB'], ['o','PLT/UX']], fr: [['Desktop agent not installed'], ['Desktop agent offline for 7+ days']] }),
  R({ id: 'm005', sender: 'Platform Ops', tpl: null, title: 'Weekly release digest: W41', content: 'This week in tWorkspace:\n\n• Search: faster results for people and documents\n• Calendar: room booking now shows equipment\n• MNP: approval status for SMS fallback\n\nFull changelog in tWorkspace › What’s new.', channel: 'email', status: 'error', created: '2026/10/09 17:00', sched: '2026/10/10 09:00', total: 58, ok: 0, creator: 'p22', aud: [['o','PLT/ENG1']], fr: [['Not delivered (MNP-4102)']], fo: 'PLT/ENG1', err: { title: 'The mail relay rejected this batch at 09:00 on Oct 10.', text: 'No one received this email. Retry once the relay is back to normal.' } }),
  R({ id: 'm004', sender: 'F18 Facility', tpl: null, title: 'Chiller maintenance tonight 18:00–22:00', content: 'Chiller #3 in Fab 18 Phase 3 will be under maintenance from 18:00 to 22:00. Expect higher temperatures in the sub-fab. Contact Facility at ext. 7788 with any issues.', channel: 'push', status: 'sent', created: '2026/10/08 13:26', sched: '2026/10/08 17:30', total: 412, ok: 405, creator: 'p20', aud: [['o','F18/MFG3']], fr: [['No registered device'], ['No registered device'], ['Notifications turned off on the device'], ['No registered device'], ['Device unreachable for 72+ hours'], ['No registered device'], ['Notifications turned off on the device']], fo: 'F18/MFG3' }),
  R({ id: 'm003', sender: 'UX Team', tpl: null, title: 'Looking for usability test volunteers', content: 'Hi,\n\nWe’re testing a new approval flow in tWorkspace and need 8 volunteers for 30-minute sessions on Oct 8 and 9. Sessions are remote, and there’s a small thank-you gift.\n\nReply to this email to sign up.\n\nUX Team', channel: 'email', status: 'sent', created: '2026/10/06 10:10', sched: null, total: 30, ok: 30, creator: 'p01', aud: [['g','g8'], ['o','PLT/UX']] }),
  R({ id: 'm002', sender: 'IT Service Desk', tpl: null, title: 'Office suite update rolls out this week', content: 'An office suite update is rolling out to IT Infrastructure this week. Restart when prompted to finish installing. Questions? Open a ticket in tWorkspace.', channel: 'desktop', status: 'sent', created: '2026/10/02 11:45', sched: null, total: 140, ok: 140, creator: 'p11', aud: [['o','IT/INFRA']] }),
  R({ id: 'm001', sender: 'ESH Emergency', tpl: null, title: 'Earthquake drill on Oct 3 at 10:00', content: 'The quarterly earthquake drill starts Oct 3 at 10:00. When the alarm sounds: drop, cover and hold on, then follow your floor warden to the assembly point.', smsText: 'Quake drill Oct 3 10:00. Drop, cover, hold on. Follow your warden.', channel: 'push_sms', status: 'sent', created: '2026/09/30 16:20', sched: '2026/10/03 09:30', total: 96, ok: 96, creator: 'p19', aud: [['o','F15/ESH']] }),
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
    { id: 'm019', sender: 'ESH Emergency', tpl: 't2', title: 'Typhoon alert: work arrangement for 10/22', content: 'Due to the typhoon warning, non-fab staff should work from home on Oct 22. Fab shift staff, follow your section manager’s arrangement. Check tWorkspace for updates.', smsText: 'Typhoon alert: non-fab staff WFH on 10/22. Fab shifts as arranged.', channels: ['push', 'email'], sms: true, status: 'progress', created: '2026/10/21 08:40', sched: null, total: 292, ok: 241, creator: 'p19', aud: [['o', 'PLT/ENG1'], ['o', 'PLT/ENG2'], ['o', 'IT/INFRA'], ['o', 'PLT/UX']], email: { mode: 'own', subject: 'Typhoon alert: work arrangement for Oct 22', html: (TEMPLATES[1].email.html || '').replace(/\[date\]/g, 'Oct 22'), atts: [] } },
    { id: 'm018', sender: 'F18 Facility', tpl: null, title: 'Power maintenance: F18 Phase 5, Sat 10/25', content: 'Planned power maintenance in Fab 18 Phase 5 on Sat, Oct 25 from 08:00 to 12:00. Tools on UPS aren’t affected. Details are in your email.', channels: ['push', 'desktop', 'email'], sms: false, status: 'scheduled', created: '2026/10/20 16:12', sched: '2026/10/24 17:00', total: 412, ok: 0, creator: 'p20', aud: [['o', 'F18/MFG3']], email: { mode: 'own', subject: 'Planned power maintenance: Fab 18 Phase 5, Sat Oct 25 08:00–12:00', html: '<p>Hi all,</p><p>Planned power maintenance takes place in <b>Fab 18 Phase 5</b> on <b>Sat, Oct 25 from 08:00 to 12:00</b>.</p><ul><li>Tools on UPS aren’t affected.</li><li>Non-UPS tools in zones B and C are powered down at 07:45.</li><li>Shift leads: confirm your tool list with Facility by Oct 23.</li></ul><p>The schedule and the affected tool list are attached.</p><p>F18 Facility · ext. 7788</p>', atts: [{ name: 'F18P5_power_maintenance_schedule.pdf', size: 1240000 }, { name: 'Affected_tools_zone_B_C.xlsx', size: 386000 }] } },
  )
  return rows
}
export const ROWS0 = buildRows()
// urgent messages that skipped ICSD approval keep who, when and why
Object.assign(ROWS0.find(r => r.id === 'm019')!, { bypass: { by: 'p19', at: '2026/10/21 08:38', reason: 'Typhoon warning issued at 07:30. Staff must know before they commute.' } })

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
