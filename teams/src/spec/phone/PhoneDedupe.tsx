// Design study: phone numbers in the audience list. People can have several mobiles in the HR system, so a pasted
// list of numbers can hold the same person twice, or someone already on the list. Numbers are matched to people
// first, then de-duplicated by person. The demo is a working batch import with its own small directory.
import * as React from 'react'
import { Avatar, Button, Checkbox, Tag, Textarea } from '@qijenchen/design-system'
import { ArrowRight, Building2, Phone, Upload, Users } from 'lucide-react'
import { Notes, Section, SpecTable } from '../parts'

// ---------- a small HR directory: everyone's registered mobiles, the first one is the primary ----------
interface Emp { id: string; zh: string; en: string; org: string; nt: string; emp: string; phones: string[]; color: string }
const EMPS: Emp[] = [
  { id: 'p1', zh: '陳志明', en: 'Jimmy Chen', org: 'PENG', nt: 'cmchen', emp: '103217', phones: ['0912345678', '0933222111'], color: 'green' },
  { id: 'p2', zh: '賴書豪', en: 'Ivan Lai', org: 'PENG', nt: 'shlai', emp: '116904', phones: ['0921555333', '0988777666', '0955123456'], color: 'pink' },
  { id: 'p3', zh: '林婉婷', en: 'Fiona Lin', org: 'PUX', nt: 'wtlin', emp: '120455', phones: ['0910111222'], color: 'blue' },
  { id: 'p4', zh: '黃彥均', en: 'Ivan Huang', org: 'PDEV', nt: 'yjhuang', emp: '118302', phones: ['0937444555', '0919000888'], color: 'amber' },
  { id: 'p5', zh: '張雅雯', en: 'Vivian Chang', org: 'PUX', nt: 'ywchang', emp: '125670', phones: ['0926333999', '0966000111'], color: 'purple' },
  { id: 'p6', zh: '李建志', en: 'Eric Lee', org: 'FMFG', nt: 'jzlee', emp: '130021', phones: ['0958666777', '0966000111'], color: 'teal' },
]
const EMAP: Record<string, Emp> = Object.fromEntries(EMPS.map(e => [e.id, e]))
// already on the list before the import: Jimmy added directly, Fiona inside an audience group
const ON_LIST: { id: string; via: string }[] = [{ id: 'p1', via: 'Added directly' }, { id: 'p3', via: 'In Design System Guild' }]
const SAMPLE = ['0912-345-678', '0933 222 111', '+886 921 555 333', '0988777666', '0910111222', '0937-444-555', '0966000111', '0975 123 456', '+886975123456', '0911-22', '0919000888'].join('\n')

// one way to write a mobile: 09xxxxxxxx (spaces, dashes and +886 removed)
function norm(raw: string) {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('886')) d = '0' + d.slice(3)
  if (d.length === 9 && d.startsWith('9')) d = '0' + d
  return /^09\d{8}$/.test(d) ? d : ''
}
const fmt = (d: string) => d.slice(0, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7)
const name = (e: Emp) => e.zh + ' ' + e.en
const desc = (e: Emp) => [e.org, e.nt, e.emp].join(' · ')

type Result = {
  add: { e: Emp; nums: string[] }[]
  ext: { num: string; raw: string[] }[]
  pick: { num: string; raw: string[]; cands: Emp[] }[]
  have: { e: Emp; via: string; nums: string[] }[]
  bad: string[]
  entries: number
}
function match(text: string): Result {
  const lines = text.split(/\n|,|;/).map(x => x.trim()).filter(Boolean)
  const r: Result = { add: [], ext: [], pick: [], have: [], bad: [], entries: lines.length }
  const on = Object.fromEntries(ON_LIST.map(x => [x.id, x.via]))
  for (const raw of lines) {
    const d = norm(raw)
    if (!d) { r.bad.push(raw); continue }
    const who = EMPS.filter(e => e.phones.includes(d))
    if (who.length > 1) { const p = r.pick.find(x => x.num === d); if (p) p.raw.push(raw); else r.pick.push({ num: d, raw: [raw], cands: who }); continue }
    if (!who.length) { const x = r.ext.find(y => y.num === d); if (x) x.raw.push(raw); else r.ext.push({ num: d, raw: [raw] }); continue }
    const e = who[0]
    if (on[e.id]) { const h = r.have.find(y => y.e.id === e.id); if (h) h.nums.push(raw); else r.have.push({ e, via: on[e.id], nums: [raw] }); continue }
    const a = r.add.find(y => y.e.id === e.id); if (a) a.nums.push(raw); else r.add.push({ e, nums: [raw] })
  }
  return r
}

// ---------- the demo ----------
const Row = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-3 px-3 py-2.5">{children}</div>
const Box = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col divide-y divide-divider rounded-md border border-divider">{children}</div>
const Two = ({ a, b }: { a: React.ReactNode; b: React.ReactNode }) => <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body font-medium">{a}</span><span className="truncate text-caption text-fg-secondary">{b}</span></span>
const Nums = ({ list }: { list: string[] }) => <span className="flex shrink-0 flex-col items-end text-right font-mono text-caption text-fg-secondary">{list.map((n, i) => <span key={i}>{n}</span>)}</span>
const H = ({ children, n }: { children: React.ReactNode; n: number }) => <h4 className="flex items-center gap-2 text-body font-medium">{children}<span className="text-fg-secondary">{n}</span></h4>
const Circle = ({ I }: { I: typeof Users }) => <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted"><I className="size-3.5 text-fg-secondary" aria-hidden /></span>

function Demo() {
  const [text, setText] = React.useState(SAMPLE)
  const [res, setRes] = React.useState<Result | null>(null)
  const [picks, setPicks] = React.useState<Record<string, string[]>>({})
  const [done, setDone] = React.useState<{ people: Emp[]; ext: string[] } | null>(null)
  const chosen = res ? res.pick.flatMap(p => (picks[p.num] || []).map(id => EMAP[id])) : []
  // a chosen person may already be on the list or picked from another number: still one person
  const addPeople = res ? Array.from(new Map([...res.add.map(a => a.e), ...chosen].filter(e => !ON_LIST.some(o => o.id === e.id)).map(e => [e.id, e])).values()) : []
  const addN = addPeople.length + (res ? res.ext.length : 0)
  const merged = res ? res.add.reduce((s, a) => s + a.nums.length - 1, 0) + res.ext.reduce((s, x) => s + x.raw.length - 1, 0) : 0

  if (done) {
    const people = [...ON_LIST.map(o => EMAP[o.id]), ...done.people]
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-divider bg-surface p-4">
        <div className="flex items-center justify-between"><b className="text-body-lg font-medium">Audiences</b><span className="text-body text-fg-secondary">{people.length + done.ext.length} audiences</span></div>
        <Box>
          <Row><Circle I={Users} /><Two a="Design System Guild" b="Audience group" /><span className="text-caption text-fg-secondary">includes Fiona Lin</span></Row>
          {people.filter(e => e.id !== 'p3').map(e => <Row key={e.id}><Avatar size={24} alt={e.en} color={e.color as any} /><Two a={name(e)} b={desc(e)} /><span className="font-mono text-caption text-fg-secondary">SMS → {fmt(e.phones[0])}</span></Row>)}
          {done.ext.map(n => <Row key={n}><span className="inline-flex size-6 items-center justify-center"><Phone className="size-4 text-fg-secondary" aria-hidden /></span><Two a={fmt(n)} b="External phone · SMS only" /></Row>)}
        </Box>
        <p className="text-caption text-fg-secondary">每位員工一列；SMS 寄到 HR 系統登記的主要手機（右側），不寄到貼上的號碼。</p>
        <div><Button variant="tertiary" onClick={() => { setDone(null); setRes(null); setPicks({}) }}>重新示範</Button></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-divider bg-surface shadow-sm">
      <header className="flex items-center justify-between border-b border-divider px-4 py-3"><b className="text-body-lg font-medium">Batch import</b></header>
      <div className="flex flex-col gap-4 p-4">
        {!res ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-body font-medium">Paste names, IDs, emails or phone numbers</span>
              <Textarea rows={9} value={text} onChange={e => setText(e.target.value)} aria-label="Audiences to import" />
              <span className="text-caption text-fg-secondary">One per line, or separated by commas. Or upload a .csv or .xlsx file.</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Tag size="md" color="green">{addN + ' to add'}</Tag>
              {res.pick.length ? <Tag size="md" color="amber">{res.pick.length + ' to choose'}</Tag> : null}
              {res.have.length ? <Tag size="md">{res.have.length + ' already on the list'}</Tag> : null}
              {res.bad.length ? <Tag size="md" color="red">{res.bad.length + ' not valid'}</Tag> : null}
            </div>
            <p className="text-body text-fg-secondary">{res.entries} entries{merged ? ', ' + merged + ' of them the same person or number as another entry' : ''}.</p>

            {res.add.length || res.ext.length ? <section className="flex flex-col gap-2">
              <H n={res.add.length + res.ext.length}>To add</H>
              <Box>
                {res.add.map(a => <Row key={a.e.id}><Avatar size={24} alt={a.e.en} color={a.e.color as any} /><Two a={name(a.e)} b={desc(a.e)} />{a.nums.length > 1 ? <Tag size="sm">{a.nums.length + ' numbers'}</Tag> : null}<Nums list={a.nums} /></Row>)}
                {res.ext.map(x => <Row key={x.num}><span className="inline-flex size-6 items-center justify-center"><Phone className="size-4 text-fg-secondary" aria-hidden /></span><Two a={fmt(x.num)} b="External phone · SMS only" />{x.raw.length > 1 ? <Tag size="sm">{x.raw.length + ' entries'}</Tag> : null}<Nums list={x.raw} /></Row>)}
              </Box>
            </section> : null}

            {res.pick.length ? <section className="flex flex-col gap-2">
              <H n={res.pick.length}>Choose who</H>
              {res.pick.map(p => (
                <div key={p.num} className="flex flex-col gap-1 rounded-md border border-divider p-2">
                  <span className="px-1 text-body text-fg-secondary">{fmt(p.num) + ' is registered to ' + p.cands.length + ' people'}</span>
                  {p.cands.map(e => {
                    const sel = (picks[p.num] || []).includes(e.id)
                    return (
                      <div key={e.id} className="flex items-center gap-3 rounded-md px-1 py-1">
                        <Checkbox checked={sel} onCheckedChange={() => setPicks(s => ({ ...s, [p.num]: sel ? (s[p.num] || []).filter(x => x !== e.id) : [...(s[p.num] || []), e.id] }))} aria-label={name(e)} />
                        <Avatar size={24} alt={e.en} color={e.color as any} /><Two a={name(e)} b={desc(e)} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </section> : null}

            {res.have.length ? <section className="flex flex-col gap-2">
              <H n={res.have.length}>Already on the list</H>
              <Box>{res.have.map(h => <Row key={h.e.id}><Avatar size={24} alt={h.e.en} color={h.e.color as any} /><Two a={name(h.e)} b={h.via} /><Nums list={h.nums} /></Row>)}</Box>
            </section> : null}

            {res.bad.length ? <section className="flex flex-col gap-2">
              <H n={res.bad.length}>Not valid</H>
              <Box>{res.bad.map(b => <Row key={b}><code className="flex-1 font-mono text-caption">{b}</code><span className="text-caption text-error-text">Not a mobile number</span></Row>)}</Box>
            </section> : null}
          </>
        )}
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-divider px-4 py-3">
        {!res ? <Button variant="tertiary" startIcon={Upload}>Upload file</Button> : <Button variant="tertiary" onClick={() => { setRes(null); setPicks({}) }}>Edit list</Button>}
        <div className="flex gap-2">
          <Button variant="tertiary">Cancel</Button>
          {!res ? <Button variant="primary" startIcon={ArrowRight} onClick={() => setRes(match(text))}>Match</Button>
            : <Button variant="primary" disabled={!addN} onClick={() => setDone({ people: addPeople, ext: res.ext.map(x => x.num) })}>{'Add ' + addN}</Button>}
        </div>
      </footer>
    </div>
  )
}

// ---------- the page ----------
export default function PhoneDedupe() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · 收件人</span>
          <h1 className="spec-h1">電話號碼去重複</h1>
          <span className="text-caption text-fg-secondary">2026/11/07 · 一位員工可能在 HR 系統登記多支手機。寄件人貼上一串電話時，先把號碼對應回人，再用人去重複。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Rules" title="規則" lead="收件人以「人」計算，不以號碼計算。">
          <SpecTable head={['#', '規則']} nowrap={[0]} rows={[
            ['1', '號碼先統一格式：去掉空白、連字號、括號；+886 開頭換成 0。只接受手機號碼（09 開頭共 10 碼）。'],
            ['2', '用統一後的號碼比對 HR 系統裡每位員工登記的所有手機（不只主要號碼）。'],
            ['3', '比對到一位員工：換成那位員工。名單上顯示人，不顯示號碼。'],
            ['4', '同一位員工的多個號碼只算一人；這位員工已經在名單上（直接加入，或在已加入的群組、組織裡）就不再加入。'],
            ['5', '比對到兩位以上員工（共用號碼）：請寄件人選擇是誰，可以複選。'],
            ['6', '比對不到：當作外部電話。同一個外部號碼不同寫法只算一個。'],
            ['7', 'SMS 每人只寄一封，由系統決定寄到哪支：有公務手機寄公務手機，沒有才寄私人手機（示範資料以第一支當作公務手機）。寄件人不用選號碼。外部電話寄到該號碼。'],
            ['8', '收件人數 = 不重複的員工 + 不重複的外部號碼（群組、組織展開後一起去重複）。'],
          ]} />
        </Section>

        <Section eyebrow="Demo" title="批次匯入示範" lead="可以直接操作：按 Match 看比對結果，在「Choose who」選人，再按 Add。也可以改左邊的內容再試。示範前名單上已經有 Jimmy Chen（直接加入）和 Design System Guild 群組（含 Fiona Lin）。">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)]">
            <Demo />
            <div className="flex flex-col gap-3">
              <b className="text-body font-medium">示範用的 HR 資料</b>
              <Box>
                {EMPS.map(e => <Row key={e.id}><Avatar size={24} alt={e.en} color={e.color as any} /><Two a={name(e)} b={desc(e)} /><Nums list={e.phones.map((p, i) => fmt(p) + (i === 0 ? '（主要）' : ''))} /></Row>)}
              </Box>
              <Notes items={[
                { title: '這份範例涵蓋', body: '同一人兩個號碼（Ivan Lai、Ivan Huang）；已在名單上（Jimmy Chen 直接加入、Fiona Lin 在群組裡）；共用號碼（0966-000-111 同時登記在 Vivian Chang 與 Eric Lee）；同一外部號碼的兩種寫法；格式錯誤。' },
              ]} />
            </div>
          </div>
        </Section>

        <Section eyebrow="Batch import" title="批次匯入的流程" lead="兩個步驟：貼上（或上傳檔案）→ 看比對結果並確認。">
          <SpecTable head={['步驟', '畫面', '規格']} nowrap={[0, 1]} rows={[
            ['1', '貼上或上傳', <>一個多行輸入框，說明 <code>One per line, or separated by commas. Or upload a .csv or .xlsx file.</code> 名字、工號、NT 帳號、Email、電話可以混在一起。主要按鈕 Match；左下 Upload file。</>],
            ['2', '比對結果', '上方是各組的數量標籤；下面依序分組：To add、Choose who、Already on the list、Not valid。主要按鈕「Add n」，n 是實際會加入的收件人數；左下 Edit list 回到步驟 1，內容保留。'],
            ['完成', '回到收件人列表', '只加入 To add 的人與外部號碼，以及 Choose who 裡勾選的人；toast：Added n audiences。'],
          ]} />
          <SpecTable head={['分組', '一列的內容', '說明']} nowrap={[0]} rows={[
            ['To add', '頭像、姓名、組織代號 · NT · 工號；右側列出貼上的號碼；同一人有多個號碼時加標籤「n numbers」', '外部電話：電話圖示、號碼、External phone · SMS only；同一號碼多種寫法時加標籤「n entries」'],
            ['Choose who', '「0966-000-111 is registered to 2 people」，下面每位候選人一列，前面是勾選框', '可以複選；都不選就不加入'],
            ['Already on the list', '頭像、姓名；說明是已在名單上的原因（Added directly、In <群組名稱>）；右側列出貼上的號碼', '不會再加入，也不算進人數'],
            ['Not valid', '原始文字；右側紅字 Not a mobile number', '可以按 Edit list 修正'],
          ]} />
          <Notes items={[
            { title: '數量的寫法', body: '標籤：n to add、n to choose、n already on the list、n not valid。標籤下一行：「11 entries, 3 of them the same person or number as another entry.」讓寄件人知道貼上的筆數和實際人數為什麼不同。' },
            { title: '單筆輸入也一樣', body: '在收件人搜尋框輸入電話時，比對到員工就顯示那位員工；他已經在名單上時，選項顯示 Already added 且不能再選。' },
          ]} />
        </Section>

        <Section eyebrow="Edge cases" title="特殊情況">
          <SpecTable head={['情況', '處理']} nowrap={[0]} rows={[
            ['號碼屬於已在群組或組織裡的員工', '歸在 Already on the list，說明 In <群組或組織名稱>。'],
            ['員工離職或號碼已從 HR 系統移除', '比對不到員工，當作外部電話。'],
            ['寄件人刻意要寄到員工的某一支號碼', '不支援；員工一律寄到 HR 系統的主要手機，避免同一人收到多封。'],
            ['同一個號碼貼了很多次', '只算一次；To add 那一列加標籤 n entries。'],
            ['市話或其他格式', 'Not valid（SMS 只能寄到手機）。'],
          ]} />
          <div className="flex flex-wrap gap-3 pt-1 text-caption text-fg-secondary">
            <span className="inline-flex items-center gap-1.5"><Circle I={Building2} />組織</span>
            <span className="inline-flex items-center gap-1.5"><Circle I={Users} />群組</span>
            <span className="inline-flex items-center gap-1.5"><Phone className="size-4" aria-hidden />外部電話</span>
          </div>
        </Section>
      </main>
    </>
  )
}
