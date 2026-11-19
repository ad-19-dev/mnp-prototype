// UI flow and design spec of the one-record-per-channel version of the messages list and details
// (teams build with `--mode split`). One page, a tab per part, routed on the URL hash. Screens are screenshots of
// that prototype (tools/split-shots.mjs) with measured pins.
import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@qijenchen/design-system'
import { StatusTag } from '../../components/ui'
import { C, Copy, Figure, Notes, Section, Shot, SpecTable } from '../parts'

const PROTO = 'https://claude.ai/artifact/Kq6FnvbagCvdtmoPXiRD91'
const TABS = [['flow', 'UI Flow'], ['send', '發送流程'], ['overview', '總覽'], ['list', '列表'], ['rules', '狀態與合併規則'], ['status', '各狀態的列與詳情'], ['detail', '訊息詳情與重新傳送'], ['actions', '列選單'], ['modals', '對話框規格'], ['data', '範例資料']] as const
type TabKey = typeof TABS[number][0]
const isTab = (h: string): h is TabKey => TABS.some(t => t[0] === h)

export default function SplitSpec() {
  const [tab, setTab] = React.useState<TabKey>(() => { const h = location.hash.slice(1); return isTab(h) ? h : 'flow' })
  React.useEffect(() => {
    const on = () => { const h = location.hash.slice(1); if (isTab(h)) setTab(h) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (k: TabKey) => { setTab(k); try { history.replaceState(null, '', '#' + k) } catch { /* sandboxed */ } window.scrollTo(0, 0) }
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-2 pt-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="spec-eyebrow">MNP · 訊息紀錄 · 一個通道一筆</span>
            <h1 className="spec-h1">單一通道紀錄：UI Flow 與設計規格</h1>
            <span className="text-caption text-fg-secondary">2026/11/07 · 畫面取自 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">單一通道紀錄版 prototype</a>（需密碼）。</span>
          </div>
          <Tabs value={tab} onValueChange={v => go(v as TabKey)}>
            <TabsList overflow="scroll">{TABS.map(([k, t]) => <TabsTrigger key={k} value={k}>{t}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
      </div>
      <main className="spec-wrap spec-main" key={tab}>
        {tab === 'flow' ? <Flow go={go} /> : null}
        {tab === 'send' ? <SendTab /> : null}
        {tab === 'overview' ? <Overview /> : null}
        {tab === 'list' ? <ListTab /> : null}
        {tab === 'rules' ? <Rules /> : null}
        {tab === 'status' ? <StatusTab /> : null}
        {tab === 'detail' ? <Detail /> : null}
        {tab === 'modals' ? <Modals /> : null}
        {tab === 'actions' ? <Actions /> : null}
        {tab === 'data' ? <Data /> : null}
      </main>
    </>
  )
}

// ---------- UI flow ----------
type Kind = 'page' | 'menu' | 'dialog' | 'action'
const KIND: Record<Kind, string> = { page: '畫面', menu: '選單', dialog: '對話框', action: '操作' }
const KCLS: Record<Kind, string> = { page: 'is-done', menu: 'is-action', dialog: 'is-dialog', action: 'is-action' }
function Card({ kind, title, when, shots, then }: { kind: Kind; title: string; when: React.ReactNode; shots?: string[]; then?: React.ReactNode }) {
  return (
    <article className="flow-branch">
      <header><span className={'flow-kind ' + KCLS[kind]}>{KIND[kind]}</span><b>{title}</b></header>
      <span className="flow-when">{when}</span>
      {shots && shots.length ? <div className={shots.length > 1 ? 'flow-pair' : undefined}>{shots.map(n => <div key={n} className="spec-canvas"><Shot name={n} alt={title} pins={false} /></div>)}</div> : null}
      {then ? <span className="flow-then">{then}</span> : null}
    </article>
  )
}
const Stop = ({ children, sub }: { children: React.ReactNode; sub: string }) => <span className="flow-stop"><b>{children}</b><span>{sub}</span></span>

// the panel's basic fields, said once and used in every place that lists them
const FIELDS = 'Task ID（2026-11-19 從 Message ID 改名）、Channel、Status（下方是 n not sent 連結）、Approval record（需要核准時）、Sender、Audience（人數）、Template、Created、Send time、Creator、Last updater（2026-11-19 加）：列表上有的資訊都在這裡；緊急送出的原因不顯示（那是給 ICSD 審核看的）'

function Flow({ go }: { go: (k: TabKey) => void }) {
  return (
    <>
      <Section eyebrow="Flow" title="從列表出發的操作流程" lead="一則訊息選了幾個通道，列表就有幾筆紀錄（Device Notifications 加 SMS 備援算一筆）。所有操作都從列表開始：點標題開這一筆的訊息詳情（大 modal），能改的欄位直接在裡面改；快速動作也在每一筆的 ⋮ 選單裡。都只作用在這一個通道。">
        <div className="flow-map" role="list">
          <Stop sub="專案的 Send messages">訊息列表</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="搜尋、狀態、通道">找到那一筆</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="點標題">訊息詳情（modal）</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="依狀態編輯，或 Resend、Cancel sending">編輯或操作</Stop>
        </div>
        <div className="flow-legend">
          <span><i className="flow-key" style={{ background: 'var(--flow-done)' }} />畫面</span>
          <span><i className="flow-key" style={{ background: 'var(--spec-muted)' }} />選單、操作</span>
          <span><i className="flow-key" style={{ background: 'var(--flow-branch)' }} />對話框</span>
        </div>
      </Section>

      <Section eyebrow="1" title="訊息列表" lead={<>每一列是一個通道的紀錄，每一列都顯示自己的完整資料；同一次發送的紀錄有相同的訊息 ID（例：10154），排在一起。欄位見「<button type="button" className="flow-spec-link" onClick={() => go('list')}>列表</button>」。</>}>
        <Figure label="訊息列表（UX Team）" sub="1680 × 940" shot="list" max={1180} wideNotes notes={[
          { n: 1, title: '通道', body: 'Device Notifications、Device Notifications (SMS)、Desktop OS、Email。' },
          { n: 2, title: '訊息 ID、標題 / 內容', body: '訊息 ID 標籤，後面是這個通道的標題與內文；點標題開訊息詳情。' },
          { n: 3, title: '狀態', body: '這一筆的狀態。' },
          { n: 4, title: '收件人數', body: '這個通道要寄給的人數。' },
          { n: 5, title: '{n} not sent', body: '未送出的人數；點了開 Sent details，已篩選成 Not sent。' },
          { n: 6, title: '列尾 ⋮', body: '列選單，只有快速動作，項目依狀態不同；沒有 ⓘ。' },
          { n: 7, title: '狀態篩選', body: '多選。' },
          { n: 8, title: '通道篩選', body: '多選。' },
          { n: 9, title: '建立日期篩選', body: '按鈕寫 Created: <範圍>，單選，預設 Last 2 weeks。' },
        ]} />
        <div className="flow-branches">
          <h3>從列表可以</h3>
          <Card kind="menu" title="篩選" when="點 Status 或 Channel" shots={['status-menu', 'channel-menu']} then="列表只留下符合的紀錄；按鈕變藍並顯示選了幾個。選單底部的 Clear 清除這個選單的選項。" />
          <Card kind="page" title="搜尋或篩選沒有結果" when="沒有符合的紀錄" shots={['empty']} then="表格框內顯示空狀態與 Clear filters。" />
          <Card kind="page" title="還沒有任何訊息" when="空間裡沒有訊息" shots={['empty-first']} then="頁面層級的空狀態：No messages yet 與 New message 按鈕。" />
          <Card kind="menu" title="列選單：已送出" when="狀態 Sent" shots={['menu-sent']} then="Duplicate" />
          <Card kind="menu" title="列選單：已排程" when="狀態 Scheduled" shots={['menu-scheduled']} then="Duplicate、Cancel sending（改時間在訊息詳情裡）" />
          <Card kind="menu" title="列選單：排程已過期" when="狀態 Scheduled expired" shots={['menu-expired']} then="Resend、Duplicate、Cancel sending" />
          <Card kind="menu" title="列選單：已駁回" when="狀態 Rejected" shots={['menu-rejected']} then="Duplicate" />
          <Card kind="menu" title="列選單：傳送錯誤" when="狀態 Error" shots={['menu-error']} then="Resend、Duplicate、Cancel sending" />
        </div>
      </Section>

      <Section eyebrow="2" title="訊息詳情、重新傳送與發送明細" lead={<>點標題開的訊息詳情（依狀態編輯、Resend、Sent details 與補寄、Cancel sending、Duplicate）是另一份文件：<a className="text-primary hover:underline" href={DETAIL} target="_blank" rel="noreferrer">Message details 與重新傳送 UI Flow 與設計規格</a>（2026-11-19 拆出）。</>}>
        <div className="flow-branches">
          <Card kind="page" title="訊息詳情" when="點標題、列選單 Resend、{n} not sent" shots={['detail-fb']} then="見 Message details 與重新傳送規格。" />
          <Card kind="dialog" title="Cancel sending?" when="列選單或詳情底部的 Cancel sending" shots={['dlg-cancel']} then="這個通道不再送出，狀態變成 Canceled；紀錄留在列表。規格見 Message details 規格的「對話框」。" />
          <Card kind="action" title="Duplicate" when="列選單或詳情底部的 Duplicate" then="進入發送流程，只帶入這個通道（通道、內容與它的收件人）。" />
          <Card kind="menu" title="專案的 ⋯ 選單" when="側邊欄滑過一個專案" shots={['space-menu']} then="Project settings（開專案設定）、Leave project（確認後離開）。" />
        </div>
      </Section>
    </>
  )
}

// ---------- send flow: its own document ----------
const NEWMSG = 'https://claude.ai/artifact/7ecvVKR6PMEQ85j34Uyn72'
const DETAIL = 'https://claude.ai/artifact/FSrozM3pu33N9HA8x1TbQU'
function SendTab() {
  return (
    <Section eyebrow="Send" title="發送流程" lead={<>New message 的 UI flow 與設計規格是另一份文件：<a className="text-primary hover:underline" href={NEWMSG} target="_blank" rel="noreferrer">New message：UI Flow 與設計規格</a>（需密碼）。</>}>
      <span className="text-body text-fg-secondary">三個步驟（收件人與通道、訊息內容、排程與預覽）、所有對話框、送出之後的 toast 與錯誤訊息都在那份文件。</span>
    </Section>
  )
}

// ---------- overview ----------
function Overview() {
  return (
    <>
      <Section eyebrow="Concept" title="一個通道一筆紀錄" lead="發送時可以一次選好幾個通道；訊息紀錄則是每個通道各一筆，每一筆有自己的狀態與收件人數。">
        <SpecTable head={['發送時的選擇', '列表上的紀錄', '通道欄']} nowrap={[0]} rows={[
          ['Device Notifications', '1 筆', '手機圖示'],
          ['Device Notifications ＋ SMS 備援', '1 筆', '手機圖示（滑過顯示 Device Notifications (SMS)）'],
          ['Desktop OS', '1 筆', '螢幕圖示'],
          ['Email', '1 筆', '信封圖示'],
          ['好幾個通道（例：Device Notifications ＋ SMS 備援 ＋ Email）', '每個通道一筆（此例 2 筆）', '同一則訊息的紀錄排在一起，順序：Device Notifications → Desktop OS → Email'],
        ]} />
        <Notes items={[{ title: 'SMS 備援', body: 'SMS 是 Device Notifications 的備援，和它算同一筆，列表上沒有單獨的 SMS 列。' }]} />
      </Section>
      <Section eyebrow="Model" title="Message 與 Channel" lead="一次發送是一個 Message（一個訊息 ID），底下有一個或多個 Channel。列表的每一列是一個 Channel 的紀錄。">
        <SpecTable head={['', 'Message', 'Channel']} nowrap={[0]} rows={[
          ['代表', '同一批發送（同一個訊息 ID）', '實際發送的渠道，例如 Email、Device Notifications'],
          ['列表上', '訊息 ID 標籤（在標題前）', '一列'],
          ['操作', '目前沒有一次操作多個通道的功能', '所有操作都以一個 Channel 為單位'],
        ]} />
        <Notes items={[
          { title: '每一列都完整', body: '模板、建立時間、傳送時間、建立者每一列都顯示，不合併；同一次發送靠訊息 ID 辨認。' },
          { title: '未來', body: '之後加入更多渠道時，一個 Message 底下會有更多 Channel；訊息 ID 也可以用來搜尋。' },
        ]} />
      </Section>
    </>
  )
}

// ---------- list ----------
function ListTab() {
  return (
    <>
      <Section eyebrow="Page" title="列表" lead="一列一個通道的紀錄。頁首、搜尋與篩選、表格、分頁。">
        <Figure label="UX Team" sub="1680 × 940" shot="list" max={1180} wideNotes notes={[
          { n: 1, title: '通道', body: <>只顯示圖示，滑過顯示通道名稱。Device Notifications (SMS) 用「手機加小信封」的圖示，和 Device Notifications 的手機圖示區分。設計系統與 lucide 都沒有這個圖示，是自己畫的（lucide 24px 格線、2px 線寬）。</> },
          { n: 2, title: '標題 / 內容', body: <>標題（藍字，點了開訊息詳情）加一行內文，過長截斷，不顯示滑過提示。Email 顯示主旨與內文；Device Notifications (SMS) 顯示 Device Notifications 的文字。</> },
          { n: 3, title: '狀態', body: '這一筆的狀態，見「狀態與合併規則」。' },
          { n: 4, title: '收件人數', body: <>這個通道要寄給的人數，數字與表頭都齊右。<C>Device Notifications (SMS)</C> 用 Device Notifications 的人數。</> },
          { n: 5, title: '{n} not sent', body: '紅色文字連結，在狀態標籤下方，點了開 Sent details（已篩選成 Not sent）。有 SMS 備援的，只算推播與 SMS 都沒送到的人。' },
          { n: 6, title: '列尾 ⋮', body: <>列選單，只有快速動作，見「列選單」。沒有 ⓘ：點標題就開訊息詳情。</> },
          { n: 7, title: '狀態篩選', body: '多選；只列出這個空間有的狀態與數量，依生命週期排序。' },
          { n: 9, title: '建立日期篩選', body: <>按鈕加選單（和 Status、Channel 相同的 tertiary 按鈕與 DropdownMenu），在 Status 左邊。按鈕文字是 <Copy en="Created: <範圍>" zh="建立時間：<範圍>" />，寫出篩的是 Created；一定有值，所以不顯示為選取（不變藍、沒有角標）。選單沒有標題，直接是單選選項：<C>Last 7 days</C>、<C>Last 2 weeks</C>（預設）、<C>Last 30 days</C>、<C>Last 3 months</C>、<C>All time</C>。依 Created 篩選，今天也算在內。空狀態的 Clear filters 會改成 All time。</> },
          { n: 8, title: '通道篩選', body: <>多選：<C>Device Notifications</C>、<C>Device Notifications (SMS)</C>、<C>Desktop OS</C>、<C>Email</C>，旁邊是數量。</> },
        ]} />
      </Section>
      <Section eyebrow="Columns" title="欄位" lead="寬度單位 px，都是 4 的倍數。除了 Title / Content，每一欄都設了最大寬度（設計系統表格的 meta.maxWidth），所以表格多出的寬度全部給 Title / Content，讓標題與內容顯示得更完整。">
        <SpecTable head={['欄位', '寬度', '內容', '排序']} nowrap={[0]} rows={[
          [<Copy en="Sender" zh="寄件人" />, '140（固定）', 'Device Notifications 與 Desktop OS 的寄件人；Email 沒有寄件人，顯示「—」。每一列都顯示。', '可'],
          [<Copy en="Channel" zh="通道" />, '96（固定；同一次發送有標題列時 128）', '通道圖示', '—'],
          [<Copy en="Title / Content" zh="標題 / 內容" />, '最小 320，其餘寬度都給它', '訊息 ID 標籤（Tag sm、neutral，例：10154），後面是標題；下一行是內文', '—'],
          [<Copy en="Status" zh="狀態" />, '168（固定）', '狀態標籤；下方是 {n} not sent', '—'],
          [<Copy en="Audience" zh="收件人數" />, '88，最多 96', '人數，齊右', '可'],
          [<Copy en="Template" zh="模板" />, '176（固定）', '模板名稱；沒用模板顯示「—」。', '可'],
          [<Copy en="Created" zh="建立時間" />, '116，最多 124', '日期、時間兩行。', '可'],
          [<Copy en="Send time" zh="傳送時間" />, '116，最多 124', '這個通道的傳送時間：排程的是排程時間（單獨重新排程後是新的時間），立即傳送的是建立時間。', '可'],
          [<Copy en="Creator" zh="建立者" />, '200，最多 220', '人員（大頭照與姓名；沒有照片時是姓名第一個字母）。只在團隊空間顯示。', '可'],
          [<Copy en="Last updater" zh="最後更新者" />, '200，最多 220', '人員顯示。最後一次改動這一筆的人（在訊息詳情裡儲存、重新送審、重新傳送，或取消傳送）；還沒人改過時是建立者。每一列都顯示（每個通道各自編輯）。2026-11-19 加。只在團隊空間顯示。', '可'],
          ['（列尾）', '依內容', '⋮ 一個圖示按鈕（xs）', '—'],
        ]} />
      </Section>
      <Section eyebrow="Group" title="同一次發送的紀錄" lead="同一個訊息 ID 的紀錄排在一起，但每一列都是獨立的紀錄：欄位都顯示，操作也只作用在那一列。">
        <Figure label="同一個訊息 ID 的兩筆紀錄" sub="Device Notifications (SMS) ＋ Email" shot="group" max={1180} wideNotes notes={[
          { n: 1, title: '寄件人', body: 'Email 沒有寄件人，顯示「—」。' },
          { n: 2, title: '通道', body: 'Device Notifications (SMS)：只有手機圖示，滑過顯示名稱。' },
          { n: 3, title: '狀態與未送出', body: '每一筆各自顯示。' },
          { n: 4, title: '收件人數', body: '每一筆是自己通道的人數。' },
          { n: 5, title: '訊息 ID', body: '兩列的訊息 ID 相同，表示是同一次發送。' },
        ]} />
        <Notes cols items={[
          { title: '「—」', body: '沒有值，例如沒用模板、Email 沒有寄件人。' },
          { title: '分頁', body: '以訊息為單位，每頁最多 20 則；同一個訊息 ID 的紀錄一定在同一頁。頁尾只有分頁控制。' },
          { title: '排序', body: '以訊息為單位；同一個訊息 ID 的紀錄順序固定：Device Notifications → Desktop OS → Email。' },
        ]} />
      </Section>
      <Section eyebrow="Filter" title="篩選、搜尋與空狀態">
        <div className="spec-gallery">
          <figure><figcaption><b>狀態</b><span>多選；只列這個空間有的狀態。</span></figcaption><div className="spec-canvas"><Shot name="status-menu" alt="狀態篩選" /></div></figure>
          <figure><figcaption><b>通道</b><span>多選。</span></figcaption><div className="spec-canvas"><Shot name="channel-menu" alt="通道篩選" /></div></figure>
          <figure><figcaption><b>篩選後</b><span>篩選按鈕變藍，角標顯示選了幾個。</span></figcaption><div className="spec-canvas"><Shot name="filtered" alt="篩選後" /></div></figure>
          <figure><figcaption><b>沒有符合的結果</b><span>空狀態在表格框內，表頭保留；按鈕 Clear filters。</span></figcaption><div className="spec-canvas"><Shot name="empty" alt="沒有符合的結果" /></div></figure>
          <figure><figcaption><b>還沒有任何訊息</b><span>頁面層級的空狀態：沒有搜尋、篩選與表格；內容靠上，按鈕 New message。</span></figcaption><div className="spec-canvas"><Shot name="empty-first" alt="還沒有任何訊息" /></div></figure>
        </div>
        <Notes items={[
          { title: '搜尋範圍', body: '訊息 ID、標題、內容、寄件人、模板、建立者（各通道自己的文字，例如 Email 的主旨）。' },
          { title: '載入中', body: <>只有表格的位置在載入：搜尋框與篩選照常顯示，表格換成置中的 <Copy en="Loading messages…" zh="正在載入訊息…" />（旁邊是轉圈圖示），分頁不顯示。</> },
          { title: 'Clear', body: '篩選選單底部。有選項時是藍色可點，沒有選項時停用。' },
        ]} />
      </Section>
    </>
  )
}

// ---------- rules ----------
function Rules() {
  return (
    <>
      <Section eyebrow="Status" title="每一筆的狀態" lead="核准是整則訊息一起送審的，所以待核准、已駁回時每個通道狀態相同；之後的 Send now、Reschedule、Cancel sending 只改一個通道，送出後各通道也各自進行，狀態可以不同。">
        <SpecTable head={['情況', '這一筆的狀態', '例子']} nowrap={[0]} rows={[
          ['還沒送出', '待核准、已排程、已駁回或排程已過期（單獨重新排程、取消的通道除外，各通道相同）', '—'],
          ['這個通道送完了', <StatusTag s="sent" />, 'Device Notifications 送完，Email 還在送'],
          ['這個通道還在送', <StatusTag s="progress" />, 'Email 15 / 21'],
          ['有 SMS 備援，推播或 SMS 還在送', <StatusTag s="progress" />, 'Device Notifications 送完，SMS 還在送'],
          ['有 SMS 備援，推播全部送到', <StatusTag s="sent" />, '不需要 SMS；訊息詳情的 SMS fallback 寫 Not needed'],
          ['有 SMS 備援，SMS 傳送錯誤', <StatusTag s="error" />, '推播送出，SMS 閘道失敗'],
          ['這個通道傳送錯誤', <StatusTag s="error" />, 'Email 被郵件伺服器退件'],
          ['這個通道被取消', <StatusTag s="canceled" />, '選單 Cancel sending；其他通道不變'],
        ]} />
      </Section>
      <Section eyebrow="Numbers" title="收件人數與未送出人數">
        <SpecTable head={['項目', '規則']} nowrap={[0]} rows={[
          ['收件人數', '這個通道要寄給的人數。Device Notifications (SMS) 用 Device Notifications 的人數。'],
          ['未送出人數', '送完（已送出或傳送錯誤）才顯示，0 人不顯示。有 SMS 備援的，只算推播與 SMS 都沒送到的人。'],
          ['未送出名單', '點 {n} not sent 開對話框。'],
          ['送達明細', '訊息詳情不顯示送達人數（2026-11-16 拿掉 n / m sent）；每個人送到沒有，看 Sent details。'],
        ]} />
      </Section>
    </>
  )
}

// ---------- detail ----------
function Detail() {
  return (
    <Section eyebrow="Detail" title="訊息詳情與重新傳送" lead={<>訊息詳情的版面、各狀態能改什麼、重新傳送（Now／Schedule）、發送明細與補寄，以及疊在上面的對話框，2026-11-19 起是另一份文件：<a className="text-primary hover:underline" href={DETAIL} target="_blank" rel="noreferrer">Message details 與重新傳送 UI Flow 與設計規格</a>（需密碼）。這份只留列表與列選單。</>}>
      <div className="spec-canvas max-w-[560px]"><Shot name="detail-fb" alt="訊息詳情" max={560} /></div>
    </Section>
  )
}

// ---------- actions ----------
function Actions() {
  return (
    <Section eyebrow="Menu" title="列選單" lead="每一筆列尾只有 ⋮（沒有 ⓘ：點標題就開訊息詳情）。選單只放不用看內容就能做完的快速動作；要看或改內容的都在訊息詳情裡。都只作用在這一個通道。">
      <SpecTable head={['狀態', 'Resend', 'Duplicate', 'Cancel sending']} nowrap={[0, 1, 2, 3]} rows={[
        [<StatusTag s="pending" />, '', '✓', '✓'],
        [<StatusTag s="scheduled" />, '', '✓', '✓'],
        [<StatusTag s="progress" />, '', '✓', ''],
        [<StatusTag s="sent" />, '', '✓', ''],
        [<StatusTag s="error" />, '✓', '✓', '✓'],
        [<StatusTag s="rejected" />, '', '✓', ''],
        [<StatusTag s="expired" />, '✓', '✓', '✓'],
        [<StatusTag s="canceled" />, '', '✓', ''],
      ]} />
      <SpecTable head={['項目', '做什麼']} nowrap={[0]} rows={[
        [<Copy en="Resend" zh="重新傳送" />, '2026-11-16 起取代 Send now 與 Reschedule；2026-11-18 起直接打開訊息詳情（和點標題相同，不再有 Resend 模式）。Scheduled expired、Error 的內容、收件人、Send time 都可以改，收件人是這一筆的全部收件人（Error 也是寄給全部的人）；右側 Send time 選 Now 或 Schedule（預設 Schedule 帶原本的時間）；底部 Resend／Schedule resend 按下就送出，Schedule 的時間已過時先提醒改時間或改選 Now。不再進入發送流程。Scheduled 的紀錄沒有這個選單項目：改時間在訊息詳情裡直接改 Send time。'],
        [<Copy en="Duplicate" zh="複製" />, '進入發送流程，只帶入這個通道：通道、它的內容與它的收件人。'],
        [<Copy en="Cancel sending" zh="取消傳送" />, '開確認對話框，確認後這個通道不再送出，狀態變成 Canceled；紀錄留在列表，可以查看與複製。紅字，上方有分隔線。'],
      ]} />
      <Notes items={[{ title: '拿掉的項目', body: 'View details（點標題就開訊息詳情）與 Edit content（在訊息詳情裡直接改）。' }]} />
      <div className="spec-gallery">
        <figure><figcaption><b>已送出</b></figcaption><div className="spec-canvas"><Shot name="menu-sent" alt="已送出的選單" /></div></figure>
        <figure><figcaption><b>待核准</b></figcaption><div className="spec-canvas"><Shot name="menu-pending" alt="待核准的選單" /></div></figure>
        <figure><figcaption><b>已排程</b></figcaption><div className="spec-canvas"><Shot name="menu-scheduled" alt="已排程的選單" /></div></figure>
        <figure><figcaption><b>排程已過期</b></figcaption><div className="spec-canvas"><Shot name="menu-expired" alt="排程已過期的選單" /></div></figure>
        <figure><figcaption><b>已駁回</b></figcaption><div className="spec-canvas"><Shot name="menu-rejected" alt="已駁回的選單" /></div></figure>
        <figure><figcaption><b>傳送錯誤</b></figcaption><div className="spec-canvas"><Shot name="menu-error" alt="傳送錯誤的選單" /></div></figure>
      </div>
    </Section>
  )
}

// ---------- every status: its list rows and its panel ----------
function StatusSpec({ id, s, tagDesc, rows, shots, panel, urg }: { id: string; s: Parameters<typeof StatusTag>[0]['s']; tagDesc: string; rows: [React.ReactNode, React.ReactNode][]; shots: string[]; panel: string; urg?: string }) {
  return (
    <Section eyebrow="Status" title={id}>
      <header className="flex flex-wrap items-center gap-3"><StatusTag s={s} /><span className="spec-lead">{tagDesc}</span></header>
      <div className="spec-gallery wide">
        {shots.map(n => <figure key={n}><figcaption><b>列表</b></figcaption><div className="spec-canvas"><Shot name={n} alt={id + ' 的列'} /></div></figure>)}
      </div>
      <SpecTable head={['項目', '規格']} nowrap={[0]} rows={rows} />
      <div className="spec-gallery">
        <figure><figcaption><b>訊息詳情</b></figcaption><div className="spec-canvas"><Shot name={panel} max={560} alt={id + ' 的訊息詳情'} /></div></figure>
        {urg ? <figure><figcaption><b>訊息詳情（緊急送出）</b><span>和一般訊息相同，不顯示緊急原因。</span></figcaption><div className="spec-canvas"><Shot name={urg} max={560} alt={id + ' 的訊息詳情（緊急送出）'} /></div></figure> : null}
      </div>
    </Section>
  )
}

function StatusTab() {
  const panel = (extra: string) => '欄位：' + FIELDS + '。' + extra
  return (
    <>
      <Section eyebrow="Status" title="八種狀態" lead="依訊息的生命週期排序，Status 篩選選單也是這個順序。每種狀態一節：列表上的列、各欄位怎麼顯示、訊息詳情（一般與緊急送出）。狀態標籤用設計系統 Tag（sm，圖示加文字）。">
        <SpecTable head={['狀態', '文字', '顏色', '圖示']} nowrap={[0, 1]} rows={[
          [<StatusTag s="pending" />, <Copy en="Pending approval" zh="待核准" />, 'amber', 'Hourglass'],
          [<StatusTag s="scheduled" />, <Copy en="Scheduled" zh="已排程" />, 'neutral', 'Calendar'],
          [<StatusTag s="progress" />, <Copy en="In progress" zh="傳送中" />, 'blue', 'Send'],
          [<StatusTag s="sent" />, <Copy en="Sent" zh="已送出" />, 'green', 'CheckCircle2'],
          [<StatusTag s="error" />, <Copy en="Error" zh="傳送錯誤" />, 'red', 'AlertTriangle'],
          [<StatusTag s="rejected" />, <Copy en="Rejected" zh="已駁回" />, 'red', 'CircleX'],
          [<StatusTag s="expired" />, <Copy en="Scheduled expired" zh="排程已過期" />, 'deep-orange', 'CalendarX2'],
          [<StatusTag s="canceled" />, <Copy en="Canceled" zh="已取消" />, 'neutral', 'Ban'],
        ]} />
      </Section>
      <StatusSpec id="待核准" s="pending" tagDesc="等待核准（SMS 審核人員、主管，或兩者）。所有通道一起等。" shots={['st-pending']} panel="detail-pending" urg="urg-pending" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '排程時間；立即傳送的是建立時間'],
        ['列選單', 'Duplicate、Cancel sending'],
        ['訊息詳情', panel('SMS fallback 不顯示人數。')],
      ]} />
      <StatusSpec id="已排程" s="scheduled" tagDesc="已核准或不需核准，等排程時間到。" shots={['st-scheduled']} panel="detail-scheduled" urg="urg-scheduled" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '排程時間'],
        ['列選單', 'Duplicate、Cancel sending'],
        ['訊息詳情', panel('')],
      ]} />
      <StatusSpec id="傳送中" s="progress" tagDesc="已開始傳送，各通道各自進行。" shots={['st-progress']} panel="detail-progress" urg="urg-progress" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '送完才顯示'],
        ['傳送時間', '排程時間或建立時間'],
        ['列選單', 'Duplicate'],
        ['訊息詳情', panel('有 SMS 備援時，Device Notifications 已送完、SMS 還在送，Status 仍是 In progress。')],
      ]} />
      <StatusSpec id="已送出" s="sent" tagDesc="這一筆已送完。" shots={['st-sent']} panel="detail-sent-fb" urg="urg-sent" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '有人未送出時，狀態下方顯示 {n} not sent'],
        ['傳送時間', '排程時間或建立時間'],
        ['列選單', 'Duplicate'],
        ['訊息詳情', panel('Audience 右上角有 Sent details，開發送明細。')],
      ]} />
      <StatusSpec id="傳送錯誤" s="error" tagDesc="這個通道沒有送出（例如平台中斷、郵件伺服器退件）。" shots={['st-error', 'st-mixed']} panel="detail-error" urg="urg-error" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '顯示 {n} not sent（通常是全部的人）'],
        ['傳送時間', '建立時間'],
        ['列選單', 'Resend、Duplicate、Cancel sending'],
        ['訊息詳情', panel('')],
        ['同一則訊息', '一個通道送出、另一個通道錯誤時，各自顯示自己的狀態（第二張圖）。'],
      ]} />
      <StatusSpec id="已駁回" s="rejected" tagDesc="核准人駁回，不會送出。" shots={['st-rejected']} panel="detail-rejected" urg="urg-rejected" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '建立時間'],
        ['列選單', 'Duplicate'],
        ['訊息詳情', panel('駁回原因在 Approval Center。')],
      ]} />
      <StatusSpec id="排程已過期" s="expired" tagDesc="核准時已超過排程時間，沒有送出。" shots={['st-expired']} panel="detail-expired" urg="urg-expired" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '原訂的排程時間'],
        ['列選單', 'Resend、Duplicate、Cancel sending（依狀態）'],
        ['訊息詳情', panel('')],
      ]} />
      <StatusSpec id="已取消" s="canceled" tagDesc="寄件人用選單 Cancel sending 取消了這個通道；同一個訊息 ID 的其他通道不受影響。紀錄留在列表。" shots={['st-canceled']} panel="detail-canceled" rows={[
        ['收件人數', '顯示'],
        ['未送出人數', '不顯示'],
        ['傳送時間', '原訂的傳送時間'],
        ['列選單', 'Duplicate'],
        ['訊息詳情', panel('')],
        ['同一個訊息 ID', '圖中 Email 已取消，Device Notifications (SMS) 仍是排程已過期。'],
      ]} />
    </>
  )
}

// ---------- panel blocks ----------
// ---------- every modal ----------
function Modals() {
  return (
    <Section eyebrow="Overview" title="對話框" lead={<>從列表打開的對話框都疊在訊息詳情之上或從它延伸（Sent details、Cancel sending?、成員、Discard changes?），規格在 <a className="text-primary hover:underline" href={DETAIL + '#dialogs'} target="_blank" rel="noreferrer">Message details 規格的「對話框」</a>。都使用設計系統 Dialog：標題、內容、右下角按鈕（Cancel 在左、主要動作在右），不放副標。</>}>
      <SpecTable head={['對話框', '從列表怎麼開', '寬度']} nowrap={[0]} rows={[
        ['發送明細（只看 Not sent）', '狀態下方 {n} not sent', '1280'],
        ['取消傳送', '列選單 Cancel sending', '480'],
      ]} />
    </Section>
  )
}

// ---------- sample data ----------
function Data() {
  return (
    <Section eyebrow="Data" title="prototype 的範例資料" lead="側邊欄群組標題 Projects，四個專案（UX Team、Platform Ops、Fab 18 Communications、ESH Emergency），沒有個人空間；打開時是 UX Team。每個空間都有各種狀態的訊息。">
      <SpecTable head={['要看什麼', '去哪裡']} nowrap={[0]} rows={[
        ['各通道狀態不同', 'UX Team「Fire alarm test…」（Device Notifications 已送出，SMS 與 Email 傳送中）；ESH「Chemical delivery at Dock 2」（推播送出、SMS 傳送錯誤）；UX Team「Team lunch Fri 11/7 11/7」（Device Notifications 已送出、Email 傳送錯誤）'],
        ['多種收件人', 'UX Team「Design review with Northwind Studio」；Platform Ops「tWorkspace 5.2 is live」；Fab 18「Water shutdown」；ESH「Chemical delivery」；UX Team「Usability study invitation」'],
        ['SMS 備援與未送出人數', 'UX Team「Design review…」：Device Notifications 4 人未送達，SMS 補寄後仍有 1 人未送出'],
        ['待核准、已駁回、排程已過期', 'UX Team「Atlas demo moves to 11/10」、「Badge photo update by 11/7」、「UX sync moves to Tue 11/4」；每個團隊空間也各有一則'],
        ['已取消的通道', 'UX Team「B lobby badge reader outage」：Email 已取消，Device Notifications (SMS) 排程已過期'],
        ['緊急送出（七種狀態）', 'UX Team「Parking lot A closed…」（待核准）、「Network maintenance Fri 12/18…」（已排程）、「Water leak on 5F…」（傳送中）、「Elevator 3 out until…」（已送出）、「Power dip in Building C…」（傳送錯誤）、「Fire drill moved…」（已駁回）、「Badge reader outage…」（排程已過期）'],
        ['傳送錯誤', 'UX Team「On-call swap」；Fab 18「Shift handover…」；UX Team「Reminder: send design review topics」'],
      ]} />
    </Section>
  )
}
