// UI flow for sending a message, from "+ New message" to the outcome. Two views of the same steps:
// a flow chart on a canvas you can pan and zoom (the main path left to right, each step's branches under it,
// the outcomes fanning out at the end), and a list that reads top to bottom. Screens are the prototype's own
// screenshots (shared with the send-flow spec); click one to see it full size.
// Each step carries its full design spec right under it: the same sections as the send-flow spec page
// (annotated screens, components, tables, copy), so the flow and the spec read as one board.
import * as React from 'react'
import { StatusTag } from '../../components/ui'
import { Shot } from '../parts'
import { SPEC_TABS, SpecTabBody, type TabKey } from '../compose/ComposeSpec'

const PROTO = 'https://claude.ai/artifact/3wDkTsa8LZcfDikRr1RhWv'
const SPEC = 'https://claude.ai/artifact/5Cp4EoipMcFczPk314XxRK'

// ---------- the flow, as data ----------
type Kind = 'dialog' | 'action' | 'error' | 'done'
const KIND: Record<Kind, string> = { dialog: '對話框', action: '其他操作', error: '驗證錯誤', done: '結果' }
interface BranchDef { kind: Kind; title: string; when: React.ReactNode; then?: React.ReactNode; shots?: string[] }
interface StageDef { id: string; step: string; title: string; desc: React.ReactNode; main: string; branches: BranchDef[]; next?: { action: string; note?: string } }

const STAGES: StageDef[] = [
  { id: 'entry', step: '入口', title: '訊息列表', main: 'list-entry', desc: '任一發送空間的 Send messages 分頁，按「+ New message」開始；訊息建在目前所在的空間。',
    next: { action: '按「+ New message」' },
    branches: [
      { kind: 'action', title: '編輯', when: <>列選單「Edit」（<StatusTag s="scheduled" />）或「Edit and resubmit」（<StatusTag s="rejected" />）</>, then: '同一個流程，帶入原本內容；建立後覆蓋原訊息' },
      { kind: 'action', title: '複製', when: '列選單「Duplicate to new message」', then: '帶入收件人、通道和內容（不含傳送時間）' },
      { kind: 'action', title: '重寄', when: '失敗名單的「Resend to N」', then: '收件人換成失敗的人' },
      { kind: 'dialog', title: '任何一步離開', when: '按「Cancel」或點麵包屑的空間名稱；填過東西才問', shots: ['dlg-leave'], then: '「Discard」才離開' },
    ] },
  { id: 'step1', step: '步驟 1 / 3', title: 'Audiences & channels', main: 's1-filled', desc: '加收件人（最多 500 人）、勾通道。SMS 備援要 SMS 核准，外部收件人要主管核准；下方一行顯示幾個人收得到。',
    next: { action: '按「Next」', note: '全部通過才前進' },
    branches: [
      { kind: 'action', title: '選收件人類型', when: '輸入框左邊的下拉選單', shots: ['s1-types'], then: '提示字跟著換' },
      { kind: 'action', title: '搜尋並加入', when: '輸入名字、NT 帳號或工號', shots: ['s1-search'], then: 'Enter 加入第一筆' },
      { kind: 'action', title: '加入群組', when: '類型選 Group', shots: ['s1-group'], then: '選單不關，可以連續加' },
      { kind: 'dialog', title: '批次匯入', when: '「Batch import」：選資料類型，貼上或上傳', shots: ['dlg-import', 'dlg-import2'], then: '確認比對結果後加入' },
      { kind: 'dialog', title: '查看群組成員', when: '點群組或組織的人數', shots: ['dlg-members'], then: '可搜尋的成員名單' },
      { kind: 'dialog', title: '選擇 SMS 號碼', when: '有人有兩支手機；按「Choose」或按 Next 時自動打開', shots: ['dlg-numbers'], then: '每人選一支' },
      { kind: 'dialog', title: '有人收不到', when: '「N don’t」旁的「See who」', shots: ['s1-unreach', 'dlg-unreach'], then: '可一鍵加 Email 或 SMS' },
      { kind: 'action', title: '緊急發送', when: '開 SMS 備援後勾「It’s urgent」', shots: ['s1-urgent'], then: '必填原因；外部收件人仍要主管核准' },
      { kind: 'dialog', title: '存成群組', when: '底部「Save as group」', shots: ['dlg-savegroup'], then: '存成這個空間的群組' },
      { kind: 'error', title: '還沒填完就按 Next', when: '沒收件人、沒通道、超過 500 人、緊急沒原因', shots: ['s1-errors'], then: '停在這一步，捲到第一個錯誤' },
    ] },
  { id: 'step2', step: '步驟 2 / 3', title: 'Message', main: 's2-empty', desc: '選「New」或「Use template」，再依勾的通道填內容：Device Notifications → SMS → Desktop OS → Email。',
    next: { action: '按「Next」', note: '「Back」回上一步，內容保留' },
    branches: [
      { kind: 'action', title: '使用模板', when: '選「Use template」，從選單挑一個', shots: ['s2-tpl', 's2-filled'], then: '填入文字；已有內容時先確認取代' },
      { kind: 'dialog', title: '存成模板', when: '底部「Save as template」', shots: ['dlg-savetpl'], then: '只填模板名稱' },
      { kind: 'error', title: '還沒填完就按 Next', when: '必填欄位沒填或超過字數', shots: ['s2-errors'], then: '停在這一步，標出缺的欄位' },
    ] },
  { id: 'step3', step: '步驟 3 / 3', title: 'Review & send', main: 's3-now', desc: '選「Send now」或「Scheduled send」，確認收件人和核准，切換預覽看各通道。主要按鈕一律是「Create message」。',
    next: { action: '按「Create message」', note: '三步再檢查一次' },
    branches: [
      { kind: 'action', title: '排程傳送', when: '選「Scheduled send」', shots: ['s3-sched'], then: '10 分鐘後到 30 天內，預設明天 09:00' },
      { kind: 'action', title: '切換預覽', when: '預覽右上角的分段控制', shots: ['prev-desktop', 'prev-sms', 'prev-email'], then: '各通道自己的內容' },
      { kind: 'action', title: '寄測試給自己', when: '底部「Send me a test」', then: '寄到你的裝置（不含 SMS），toast「Test sent」' },
      { kind: 'dialog', title: '緊急發送的確認', when: '勾了緊急，按「Create message」時', shots: ['dlg-urgent'], then: '「Skip approval and send」' },
    ] },
]
interface OutcomeDef { id: string; label: string; title: string; when: string; shot: string; then: React.ReactNode }
const OUTCOMES: OutcomeDef[] = [
  { id: 'done-approval', label: '需要核准', title: 'Sent for approval', when: '有外部收件人（主管），或開了 SMS 備援且沒勾緊急（SMS 審核人員）', shot: 'result', then: <>結果頁；列表 <StatusTag s="pending" /></> },
  { id: 'done-now', label: '不需核准・立即', title: '回到列表', when: 'Send now', shot: 'after-send', then: <>toast「Sending to N audiences」；<StatusTag s="progress" /> → <StatusTag s="sent" /></> },
  { id: 'done-sched', label: '不需核准・排程', title: '回到列表', when: 'Scheduled send', shot: 'after-sched', then: <>toast「Scheduled for &lt;時間&gt;」；<StatusTag s="scheduled" /></> },
]

// ---------- the spec under each step ----------
// which spec tabs sit under which column; the last column holds what every step shares
const SHEETS: { col: string; title: string; tabs: TabKey[] }[] = [
  { col: 'entry', title: '入口：頁面框架、進入方式與離開', tabs: ['overview'] },
  { col: 'step1', title: '步驟 1：收件人、通道與核准', tabs: ['audiences', 'channels'] },
  { col: 'step2', title: '步驟 2：訊息內容', tabs: ['message'] },
  { col: 'step3', title: '步驟 3：確認送出', tabs: ['review'] },
  { col: 'done', title: '送出之後', tabs: ['after'] },
  { col: 'shared', title: '每一步共用：對話框、驗證與字數、邊界情境', tabs: ['dialogs', 'rules', 'edge'] },
]
const TAB_NAME = Object.fromEntries(SPEC_TABS) as Record<TabKey, string>
const sheetOf = (t: TabKey) => SHEETS.find(x => x.tabs.includes(t))!
// a spec link ("see Channels") moves to that part of the board or list
const GoTab = React.createContext<(t: TabKey) => void>(() => {})

function SpecSheet({ col }: { col: string }) {
  const sh = SHEETS.find(x => x.col === col)!, go = React.useContext(GoTab)
  return (
    <section className="flow-sheet" data-sheet={col} aria-label={'設計規格：' + sh.title}>
      <header className="flow-sheet-head"><span className="flow-sheet-tag">設計規格</span><b>{sh.title}</b></header>
      {sh.tabs.map(t => (
        <div key={t} className="flow-sheet-part" data-tab={t}>
          {sh.tabs.length > 1 ? <h2 className="flow-sheet-h">{TAB_NAME[t]}</h2> : null}
          <div className="spec-main flow-sheet-body"><SpecTabBody tab={t} go={go} inFlow /></div>
        </div>
      ))}
    </section>
  )
}

// ---------- shared pieces ----------
function BranchCard({ b, compact }: { b: BranchDef; compact?: boolean }) {
  const shots = b.shots || []
  return (
    <article className={'flow-branch' + (shots.length > 1 && !compact ? ' is-wide' : '')} data-kind={b.kind}>
      <header><span className={'flow-kind is-' + b.kind}>{KIND[b.kind]}</span><b>{b.title}</b></header>
      <span className="flow-when">{b.when}</span>
      {shots.length ? (
        <div className={shots.length > 1 ? 'flow-pair' : undefined}>
          {shots.map(n => <div key={n} className="spec-canvas"><Shot name={n} alt={b.title} pins={false} /></div>)}
        </div>
      ) : null}
      {b.then ? <span className="flow-then">{b.then}</span> : null}
    </article>
  )
}

// ---------- canvas view ----------
interface View { x: number; y: number; s: number }
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

function FlowCanvas() {
  const port = React.useRef<HTMLDivElement>(null), board = React.useRef<HTMLDivElement>(null)
  const [view, setView] = React.useState<View>({ x: 0, y: 0, s: 0.3 })
  const [paths, setPaths] = React.useState<{ d: string; kind: 'main' | 'branch' | 'done' | 'start' | 'spec'; label?: string; note?: string; lx?: number; ly?: number }[]>([])
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  const drag = React.useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null)
  const [spec, setSpec] = React.useState(true)

  // fit a region of the board (in board units) into the viewport
  const fitTo = React.useCallback((r?: { x: number; y: number; w: number; h: number }) => {
    const p = port.current, b = board.current
    if (!p || !b) return
    const box = r || { x: 0, y: 0, w: b.offsetWidth, h: b.offsetHeight }, pad = 32
    const s = clamp(Math.min((p.clientWidth - pad * 2) / box.w, (p.clientHeight - pad * 2) / box.h), 0.08, 1.5)
    setView({ s, x: (p.clientWidth - box.w * s) / 2 - box.x * s, y: (p.clientHeight - box.h * s) / 2 - box.y * s })
  }, [])
  const zoomAt = React.useCallback((f: number, cx?: number, cy?: number) => {
    const p = port.current
    if (!p) return
    setView(v => {
      const s = clamp(v.s * f, 0.08, 2), px = cx ?? p.clientWidth / 2, py = cy ?? p.clientHeight / 2
      return { s, x: px - (px - v.x) * (s / v.s), y: py - (py - v.y) * (s / v.s) }
    })
  }, [])
  // jump to one column (or one part of a spec): fit its width, top aligned, so a tall column starts at its main screen
  const jumpTo = (id: string, sel = '[data-col="' + id + '"]') => {
    const r = regionOf(sel), p = port.current
    if (!r || !p) return
    const pad = 32, s = clamp(Math.min((p.clientWidth - pad * 2) / r.w, 1), 0.08, 1) // fit the width, never past 100% (the spec reads at its own size)
    setView({ s, x: (p.clientWidth - r.w * s) / 2 - r.x * s, y: pad - r.y * s })
  }
  const regionOf = (sel: string) => {
    const b = board.current, el = b?.querySelector<HTMLElement>(sel)
    if (!b || !el) return undefined
    const br = b.getBoundingClientRect(), r = el.getBoundingClientRect(), s = view.s
    return { x: (r.left - br.left) / s, y: (r.top - br.top) / s, w: r.width / s, h: r.height / s }
  }

  // arrows: measured from the laid-out board (board units, so they don't depend on the zoom)
  const measure = React.useCallback(() => {
    const b = board.current
    if (!b) return
    const br = b.getBoundingClientRect(), s = br.width / b.offsetWidth || 1
    const box = (el: Element | null) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: (r.left - br.left) / s, t: (r.top - br.top) / s, r: (r.right - br.left) / s, b: (r.bottom - br.top) / s } }
    const out: typeof paths = []
    STAGES.forEach((st, i) => {
      const m = box(b.querySelector('[data-main="' + st.id + '"]')), g = box(b.querySelector('[data-group="' + st.id + '"]'))
      if (m && g) { const x = (m.l + m.r) / 2; out.push({ d: `M${x},${m.b} L${x},${g.t}`, kind: 'branch' }) }
      const sh = box(b.querySelector('[data-sheet="' + st.id + '"]'))
      if (g && sh) { const x = (g.l + g.r) / 2; out.push({ d: `M${x},${g.b} L${x},${sh.t}`, kind: 'spec' }) }
      const nx = STAGES[i + 1]
      if (m && nx && st.next) {
        const n = box(b.querySelector('[data-main="' + nx.id + '"]'))
        if (n) { const y = m.t + 140; out.push({ d: `M${m.r},${y} L${n.l},${y}`, kind: 'main', label: st.next.action, note: st.next.note, lx: (m.r + n.l) / 2, ly: y }) }
      }
      if (m && !nx && st.next) {
        OUTCOMES.forEach(o => {
          const n = box(b.querySelector('[data-out="' + o.id + '"]'))
          if (!n) return
          const y0 = m.t + 140, y1 = n.t + 60, mx = (m.r + n.l) / 2
          out.push({ d: `M${m.r},${y0} C${mx},${y0} ${mx},${y1} ${n.l},${y1}`, kind: 'done', label: o.label, lx: n.l - 24, ly: y1 })
        })
        out.push({ d: '', kind: 'start', label: st.next.action, note: st.next.note, lx: m.r + 24, ly: m.t + 126 })
      }
    })
    const last = box(b.querySelector('[data-out="' + OUTCOMES[OUTCOMES.length - 1].id + '"]')), dsh = box(b.querySelector('[data-sheet="done"]'))
    if (last && dsh) { const x = (last.l + last.r) / 2; out.push({ d: `M${x},${last.b} L${x},${dsh.t}`, kind: 'spec' }) }
    setPaths(out); setSize({ w: b.offsetWidth, h: b.offsetHeight })
  }, [])
  React.useLayoutEffect(() => {
    measure(); fitTo()
    const ro = new ResizeObserver(() => measure())
    if (board.current) ro.observe(board.current)
    return () => ro.disconnect()
  }, [measure, fitTo, spec])

  // wheel scrolls the board; ctrl/⌘ + wheel (or a trackpad pinch) zooms around the pointer
  React.useEffect(() => {
    const p = port.current
    if (!p) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = p.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top)
      else setView(v => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
    }
    p.addEventListener('wheel', onWheel, { passive: false })
    return () => p.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  const onDown = (e: React.PointerEvent) => { if (e.button !== 0) return; drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y, moved: false } }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.px, dy = e.clientY - d.py
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) { d.moved = true; port.current?.setPointerCapture(e.pointerId) }
    if (d.moved) setView(v => ({ ...v, x: d.x + dx, y: d.y + dy }))
  }
  const onUp = () => { const d = drag.current; drag.current = null; if (d?.moved) { const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault() }; window.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0) } }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') zoomAt(1.2); else if (e.key === '-') zoomAt(1 / 1.2); else if (e.key === '0') fitTo()
    else if (e.key.startsWith('Arrow')) { const step = 80, k = e.key; setView(v => ({ ...v, x: v.x + (k === 'ArrowLeft' ? step : k === 'ArrowRight' ? -step : 0), y: v.y + (k === 'ArrowUp' ? step : k === 'ArrowDown' ? -step : 0) })) } else return
    e.preventDefault()
  }

  return (
    <GoTab.Provider value={t => jumpTo(sheetOf(t).col, '[data-tab="' + t + '"]')}>
    <div className="flow-board-wrap">
      <div className="flow-tools" role="toolbar" aria-label="流程圖檢視">
        <span className="flow-tools-label">跳到</span>
        <button type="button" onClick={() => fitTo()}>整張</button>
        {STAGES.map(s => <button key={s.id} type="button" onClick={() => jumpTo(s.id)}>{s.step === '入口' ? '入口' : s.step.replace(' / 3', '')}</button>)}
        <button type="button" onClick={() => jumpTo('done')}>結果</button>
        {spec ? <button type="button" onClick={() => jumpTo('shared')}>共用規格</button> : null}
        <label className="flow-toggle"><input type="checkbox" checked={spec} onChange={e => setSpec(e.target.checked)} />顯示設計規格</label>
        <span className="flow-tools-gap" />
        <button type="button" aria-label="縮小" onClick={() => zoomAt(1 / 1.25)}>−</button>
        <span className="flow-zoom" aria-live="polite">{Math.round(view.s * 100)}%</span>
        <button type="button" aria-label="放大" onClick={() => zoomAt(1.25)}>＋</button>
        <span className="flow-tools-hint">拖曳移動 · 滾輪捲動 · Ctrl／⌘＋滾輪縮放 · 點畫面放大</span>
      </div>
      <div ref={port} className="flow-port" tabIndex={0} aria-label="發送流程圖，可拖曳與縮放" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey}>
        <div ref={board} className={'flow-board' + (spec ? ' has-spec' : '')} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <svg className="flow-wires" width={size.w} height={size.h} aria-hidden>
            <defs>
              <marker id="ah-main" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--flow-main)" /></marker>
              <marker id="ah-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--flow-done)" /></marker>
            </defs>
            {paths.filter(p => p.d).map((p, i) => <path key={i} d={p.d} className={'wire is-' + p.kind} markerEnd={p.kind === 'main' ? 'url(#ah-main)' : p.kind === 'done' ? 'url(#ah-done)' : undefined} />)}
          </svg>
          {paths.filter(p => p.label).map((p, i) => (
            <div key={i} className={'flow-label is-' + p.kind} style={{ left: p.lx, top: p.ly }}><b>{p.label}</b>{p.note ? <span>{p.note}</span> : null}</div>
          ))}
          {STAGES.map(st => (
            <div key={st.id} className={'flow-col' + (st.branches.length > 6 ? ' is-wide' : '')} data-col={st.id}>
              <div className="flow-node" data-main={st.id}>
                <span className="flow-step">{st.step}</span>
                <h2>{st.title}</h2>
                <p>{st.desc}</p>
                <div className="spec-canvas"><Shot name={st.main} alt={st.step + '：' + st.title} pins={false} /></div>
              </div>
              <div className="flow-group" data-group={st.id}>
                <h3>從這一步可以</h3>
                <div className="flow-group-grid">{st.branches.map((b, i) => <BranchCard key={i} b={b} compact />)}</div>
              </div>
              {spec ? <SpecSheet col={st.id} /> : null}
            </div>
          ))}
          <div className="flow-col flow-col-done" data-col="done">
            {OUTCOMES.map(o => (
              <div key={o.id} className="flow-node is-done" data-out={o.id}>
                <span className="flow-step">結果 · {o.label}</span>
                <h2>{o.title}</h2>
                <p>{o.when}</p>
                <div className="spec-canvas"><Shot name={o.shot} alt={'結果：' + o.label} pins={false} /></div>
                <span className="flow-then">{o.then}</span>
              </div>
            ))}
            {spec ? <SpecSheet col="done" /> : null}
          </div>
          {spec ? <div className="flow-col flow-col-shared" data-col="shared"><SpecSheet col="shared" /></div> : null}
        </div>
      </div>
    </div>
    </GoTab.Provider>
  )
}

// ---------- list view (top to bottom) ----------
function FlowList() {
  const go = (t: TabKey) => document.querySelector('[data-tab="' + t + '"]')?.scrollIntoView({ block: 'start' })
  return (
    <GoTab.Provider value={go}>
    <main className="spec-wrap spec-main">
      {STAGES.map(st => (
        <React.Fragment key={st.id}>
          <section className="flow-stage" id={'list-' + st.id}>
            <div className="flow-main">
              <span className="flow-step">{st.step}</span>
              <h2>{st.title}</h2>
              <p>{st.desc}</p>
              <div className="spec-canvas"><Shot name={st.main} alt={st.step + '：' + st.title} pins={false} /></div>
            </div>
            <div className="flow-branches"><h3>從這一步可以</h3>{st.branches.map((b, i) => <BranchCard key={i} b={b} />)}</div>
            <SpecSheet col={st.id} />
          </section>
          {st.next ? <div className="flow-next" role="note"><div><b>{st.next.action}</b>{st.next.note ? <span>{st.next.note}</span> : null}</div></div> : null}
        </React.Fragment>
      ))}
      <section className="flow-stage">
        <header><span className="flow-step">結果</span><h2 className="spec-h2">建立之後</h2></header>
        <div className="flow-outcomes">
          {OUTCOMES.map(o => <BranchCard key={o.id} b={{ kind: 'done', title: o.label, when: o.when, shots: [o.shot], then: o.then }} />)}
        </div>
        <SpecSheet col="done" />
      </section>
      <SpecSheet col="shared" />
    </main>
    </GoTab.Provider>
  )
}

// ---------- page ----------
type Mode = 'canvas' | 'list'
// a phone opens on the list (the whole chart is too small to read there); a link can still ask for either view
const fromHash = (): Mode => (location.hash === '#list' ? 'list' : location.hash === '#flow' ? 'canvas' : window.innerWidth < 760 ? 'list' : 'canvas')

export default function FlowApp() {
  const [mode, setMode] = React.useState<Mode>(fromHash)
  React.useEffect(() => { const f = () => setMode(fromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f) }, [])
  const go = (m: Mode) => { setMode(m); try { history.replaceState(null, '', m === 'list' ? '#list' : '#flow') } catch { /* sandboxed */ } }
  return (
    <div className={'flow-page is-' + mode}>
      <div className="spec-top">
        <div className="spec-wrap flex flex-wrap items-end justify-between gap-3 py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="spec-eyebrow">MNP · New message</span>
            <h1 className="spec-h1">發送訊息 UI Flow 與設計規格</h1>
            <span className="text-caption text-fg-secondary">
              2026/11/05 · 團隊版 · 每一步下方就是那一步的完整規格（與 <a className="text-primary hover:underline" href={SPEC} target="_blank" rel="noreferrer">發送訊息設計規格</a> 同一份內容）· 實際操作見 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">MNP Teams prototype</a>（需密碼）
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flow-legend" aria-label="圖例">
              <span><i className="flow-key" style={{ background: 'var(--flow-main)' }} />主流程</span>
              <span><i className="flow-key" style={{ background: 'var(--flow-branch)' }} />對話框</span>
              <span><i className="flow-key" style={{ background: 'var(--spec-muted)' }} />其他操作</span>
              <span><i className="flow-key" style={{ background: 'var(--flow-error)' }} />驗證錯誤</span>
              <span><i className="flow-key" style={{ background: 'var(--flow-done)' }} />結果</span>
              <span><i className="flow-key" style={{ background: 'var(--spec-pin)' }} />設計規格</span>
            </div>
            <div className="flow-mode" role="tablist" aria-label="檢視方式">
              <button type="button" role="tab" aria-selected={mode === 'canvas'} onClick={() => go('canvas')}>流程圖</button>
              <button type="button" role="tab" aria-selected={mode === 'list'} onClick={() => go('list')}>清單</button>
            </div>
          </div>
        </div>
      </div>
      {mode === 'canvas' ? <FlowCanvas /> : <FlowList />}
    </div>
  )
}
