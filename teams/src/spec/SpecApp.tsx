// Design spec for the message log (the Send messages tab of a sending space): one page, a tab per topic,
// routed on the URL hash. Screens are screenshots of the teams prototype with measured pins; tags and
// icons in the tables are the live DS components.
import * as React from 'react'
import { Button, ProgressBar, Tabs, TabsList, TabsTrigger, Tag } from '@qijenchen/design-system'
import { CircleAlert, Siren } from 'lucide-react'
import { ChIcons, StatusTag } from '../components/ui'
import type { Status } from '../lib/data'
import { C, Copy, Figure, Notes, Section, Shot, SpecTable } from './parts'

const PROTO = 'https://claude.ai/artifact/3wDkTsa8LZcfDikRr1RhWv'
const TABS = [
  ['overview', '總覽'], ['status', '狀態'], ['list', '訊息列表'], ['filter', '搜尋與篩選'], ['detail', '訊息詳情'],
  ['dialogs', '名單對話框'], ['states', '空狀態與回饋'], ['edge', '邊界情境'],
] as const
type TabKey = typeof TABS[number][0]
const isTab = (h: string): h is TabKey => TABS.some(t => t[0] === h)

export default function SpecApp() {
  const [tab, setTab] = React.useState<TabKey>(() => { const h = location.hash.slice(1); return isTab(h) ? h : 'overview' })
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
            <span className="spec-eyebrow">MNP · Send messages</span>
            <h1 className="spec-h1">訊息紀錄設計規格</h1>
            <span className="text-caption text-fg-secondary">
              2026/11/04 · 團隊版 · 畫面取自 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">MNP Teams prototype</a>（需密碼），可以對照著操作
            </span>
          </div>
          <Tabs value={tab} onValueChange={v => go(v as TabKey)}>
            <TabsList overflow="scroll">{TABS.map(([k, t]) => <TabsTrigger key={k} value={k}>{t}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
      </div>
      <main className="spec-wrap spec-main" key={tab}>
        {tab === 'overview' ? <Overview go={go} /> : null}
        {tab === 'status' ? <StatusTab /> : null}
        {tab === 'list' ? <ListTab /> : null}
        {tab === 'filter' ? <FilterTab /> : null}
        {tab === 'detail' ? <DetailTab /> : null}
        {tab === 'dialogs' ? <DialogsTab /> : null}
        {tab === 'states' ? <StatesTab /> : null}
        {tab === 'edge' ? <EdgeTab /> : null}
      </main>
    </>
  )
}

// ---------- overview ----------
function Overview({ go }: { go: (k: TabKey) => void }) {
  const cards: [TabKey, string, string][] = [
    ['status', '狀態', '7 種狀態的意思、怎麼變、在列表和詳情各長什麼樣子，以及緊急發送的標示'],
    ['list', '訊息列表', '欄位順序、寬度、內容與排序，列選單，分頁'],
    ['filter', '搜尋與篩選', '哪些用篩選按鈕、哪些用搜尋，以及結果提示'],
    ['detail', '訊息詳情', '右側面板的區塊順序、各通道送達、收件人，以及每種狀態的版本'],
    ['dialogs', '名單對話框', '傳送失敗名單（全部通道或單一通道）、群組成員名單'],
    ['states', '空狀態與回饋', '載入中、還沒有訊息、找不到結果，確認對話框與 toast'],
    ['edge', '邊界情境', '計算規則與畫面上一定會碰到的特殊情況'],
  ]
  return (
    <>
      <Section eyebrow="Scope" title="這份規格涵蓋什麼" lead="訊息紀錄是每個發送空間裡的「Send messages」分頁：一張訊息列表，點標題在右側打開詳情面板，再從詳情打開名單對話框。新訊息的三步驟發送流程不在這份規格內。">
        <div className="spec-cards">
          {cards.map(([k, t, d]) => <button key={k} type="button" className="spec-card" onClick={() => go(k)}><b>{t}</b><span>{d}</span></button>)}
        </div>
      </Section>

      <Section eyebrow="Anatomy" title="頁面結構" lead="以共享發送空間 Platform Ops 為例（1680 × 940）。紅色數字對應右側說明。">
        <Figure label="訊息列表" sub="共享發送空間 · 預設狀態" shot="page" notes={[
          { n: 1, title: '發送空間', body: <>側欄分「個人發送空間」和「共享發送空間」。個人空間只有自己建立的訊息；共享空間是團隊成員建立的全部訊息。切換空間時，搜尋、篩選、分頁都重設，列表重新載入。側欄頂部是粗體「MNP」（<C>text-body-lg</C> bold），最右側是收合按鈕；收合後只留收合按鈕和各空間的圖示。沒有全站頂部列，帳號和語言切換在側欄底部。</> },
          { n: 2, title: '頁首與新訊息', body: <>頁首第一列：左邊是麵包屑，目前頁面粗體（例如「Platform Ops」）；右邊是主要按鈕 <C>Button primary</C>「New message」，共享空間在右邊多一顆團隊設定齒輪。</> },
          { n: 3, title: '空間說明', body: <>空間名稱已經在頁首，內容區只留一行說明，次要文字色。</> },
          { n: 4, title: '分頁', body: <>Send messages、Audience groups、Templates 三個平行的檢視，放在頁首第二列（DS <C>ChromeHeader</C> 的 <C>tabsSlot</C>，size sm），分頁底線和頁首分隔線是同一條。本規格只談 Send messages。</> },
          { n: 5, title: '搜尋', body: <>工具列左側。找標題、內容、寄件人、模板和建立者。詳見「搜尋與篩選」。</> },
          { n: 6, title: '篩選按鈕', body: <>工具列右側：Status 和 Channels 兩顆。詳見「搜尋與篩選」。</> },
          { n: 7, title: '表格', body: <>DS <C>DataTable</C>，有外框。Sender 欄釘在左側、操作欄釘在右側，中間可以左右捲動。詳見「訊息列表」。</> },
          { n: 8, title: '失敗人數', body: <>送完後還有人沒收到時出現的紅色連結，打開傳送失敗名單。</> },
          { n: 9, title: '列選單', body: <>每列最右側的「⋮」，選項依狀態不同。</> },
          { n: 10, title: '分頁', body: <>左側「1–20 of 24」，右側頁碼和每頁筆數（10 / 20 / 50，預設 20）。</> },
        ]} />
      </Section>

      <Section eyebrow="Terms" title="名詞與計算方式" lead="列表、詳情和名單對話框都用同一套算法，數字才會對得起來。">
        <SpecTable head={['名詞', '畫面上的字', '怎麼算']} nowrap={[0, 1]} rows={[
          ['收件人數', <Copy en="Audience" zh="收件人" />, '所有收件人（個人、群組、組織、外部聯絡人）展開後去重的人數。同一人在兩個群組只算一次。'],
          ['送達', <Copy en="Reach / delivered" zh="送達 / 已送達" />, '至少有一個通道送達的人數。Device Notifications 沒送到、但 SMS 備援送到，也算送達。'],
          ['失敗', <Copy en="N failed" zh="N 人失敗" />, '傳送結束後，所有通道都沒送到的人。只有已送出和傳送錯誤會出現。'],
          ['某通道失敗', <Copy en="N failed" zh="N 人失敗" />, '這個通道沒送到的人。他們可能已經從別的通道收到（例如 Device Notifications 沒送到、改由 SMS 送到），所以「各通道失敗」加起來不等於整則訊息的「失敗」。'],
          ['SMS 備援', <Copy en="Device Notifications (SMS)" zh="Device Notifications（SMS）" />, '只送給 Device Notifications 送不到、且有手機號碼的人，以及外部電話。所以它的分母是「需要 SMS 的人」，不是全部收件人。'],
        ]} />
      </Section>

      <Section eyebrow="Layout" title="間距與字級" lead="全部用 DS 的 layout space token 與字級，沒有自訂值。">
        <SpecTable head={['位置', '值']} rows={[
          ['頁面內距、工具列與表格之間、表格與分頁之間', <><C>--layout-space-loose</C>（16px）</>],
          ['搜尋框與篩選按鈕之間', <>至少 <C>--layout-space-loose</C>；篩選按鈕彼此 <C>gap-2</C></>],
          ['詳情面板：大區塊之間', <><C>calc(var(--layout-space-loose) * 2)</C></>],
          ['詳情面板：區塊標題到內容', <><C>--layout-space-tight</C></>],
          ['頁首目前頁面（麵包屑）', <>bold</>],
          ['詳情區塊標題（Reach / Audience、By channel、Audiences）', <><C>text-h6</C> bold</>],
          ['表格內文、詳情內文', <><C>text-body</C>；第二行說明 <C>text-caption</C> 次要色</>],
        ]} />
      </Section>
    </>
  )
}

// ---------- status ----------
const STATUS: { s: Status; mean: string; enter: string; reach: React.ReactNode; menu: string; banner: string; foot: string }[] = [
  { s: 'pending', mean: '等待核准。含 SMS 要等 SMS 審核人員核准；寄給外部收件人要等主管核准；兩者都有時主管先、SMS 審核人員 後。', enter: '建立時需要核准', reach: <Reach ok={null} of={562} />, menu: '查看詳情、複製為新訊息', banner: '藍色：等待誰核准、核准後何時送出', foot: '無' },
  { s: 'expired', mean: '核准的時間晚於排程時間，所以沒有送出。', enter: '核准時已過排程時間', reach: <Reach ok={null} of={560} />, menu: '查看詳情、立即傳送、重新排程、複製、刪除', banner: '黃色：誰在何時核准、原訂時間、可以怎麼做', foot: '刪除｜重新排程、立即傳送' },
  { s: 'rejected', mean: '審核人駁回，附原因。', enter: '核准人駁回', reach: <Reach ok={null} of={9} />, menu: '查看詳情、修改後重新送審、複製、刪除', banner: '紅色：誰駁回、何時、原因', foot: '刪除｜修改後重新送審' },
  { s: 'scheduled', mean: '已核准或不需核准，等排程時間到。', enter: '選了排程傳送', reach: <Reach ok={null} of={560} />, menu: '查看詳情、編輯、複製、刪除', banner: '無', foot: '刪除｜編輯' },
  { s: 'progress', mean: '傳送中。只要還有一個通道（含 SMS 備援）在送，就是傳送中。', enter: '立即傳送，或排程時間到', reach: <Reach ok={241} of={292} bar />, menu: '查看詳情、複製', banner: '無（緊急發送除外）', foot: '無' },
  { s: 'sent', mean: '所有通道都送完，至少一人送達。', enter: '傳送結束且有人收到', reach: <Reach ok={551} of={560} fail={9} />, menu: '查看詳情、複製', banner: '無（緊急發送除外）', foot: '無' },
  { s: 'error', mean: '系統錯誤，或傳送結束卻沒有人收到。', enter: '派送失敗', reach: <Reach ok={290} of={560} fail={270} />, menu: '查看詳情、重新傳送、複製', banner: '失敗名單裡有紅色錯誤說明', foot: '無（重新傳送在失敗名單裡）' },
]
function Reach({ ok, of, fail, bar }: { ok: number | null; of: number; fail?: number; bar?: boolean }) {
  return (
    <span className="flex w-36 flex-col gap-1">
      <span className="text-body tabular-nums"><span className="font-medium">{ok === null ? '–' : ok}</span><span className="text-fg-secondary"> / {of}</span></span>
      {bar ? <ProgressBar aria-label="Delivery progress" value={Math.round((ok || 0) / of * 100)} /> : null}
      {fail ? <Button variant="link" size="xs" startIcon={CircleAlert} className="!h-auto !justify-start !p-0 !text-error-text">{fail} failed</Button> : null}
    </span>
  )
}

function StatusTab() {
  return (
    <>
      <Section eyebrow="States" title="7 種狀態" lead="狀態欄和「Reach / Audience」欄一起看。還沒送出的狀態（前四種）沒有送達數字，用「–」；傳送中才有進度條；送完後有人沒收到才有紅色失敗人數。">
        <SpecTable head={['狀態', '意思', '何時進入', 'Reach / Audience 欄', '列選單', '詳情的橫幅', '詳情底部按鈕']} nowrap={[0]} rows={STATUS.map(x => [
          <StatusTag s={x.s} />, x.mean, x.enter, x.reach, x.menu, x.banner, x.foot,
        ])} />
      </Section>

      <Section eyebrow="Lifecycle" title="狀態怎麼變" lead="每一行是一條路徑，灰字是使用者或審核人做的事。">
        <div className="spec-flow2">
          <div className="line"><span className="step"><StatusTag s="pending" /></span><span className="act">核准，且還沒到排程時間</span>→<span className="step"><StatusTag s="scheduled" /></span><span className="act">時間到</span>→<span className="step"><StatusTag s="progress" /></span></div>
          <div className="line"><span className="step"><StatusTag s="pending" /></span><span className="act">核准（立即傳送的訊息）</span>→<span className="step"><StatusTag s="progress" /></span></div>
          <div className="line"><span className="step"><StatusTag s="pending" /></span><span className="act">核准時已過排程時間</span>→<span className="step"><StatusTag s="expired" /></span><span className="act">立即傳送</span>→<span className="step"><StatusTag s="progress" /></span><span className="act">或 重新排程（不用重新送審）</span>→<span className="step"><StatusTag s="scheduled" /></span></div>
          <div className="line"><span className="step"><StatusTag s="pending" /></span><span className="act">駁回</span>→<span className="step"><StatusTag s="rejected" /></span><span className="act">修改後重新送審</span>→<span className="step"><StatusTag s="pending" /></span></div>
          <div className="line"><span className="step"><StatusTag s="progress" /></span><span className="act">所有通道送完，有人收到</span>→<span className="step"><StatusTag s="sent" /></span><span className="act">有人失敗時可「重寄給 N 人」，開一則新訊息</span></div>
          <div className="line"><span className="step"><StatusTag s="progress" /></span><span className="act">系統錯誤或沒人收到</span>→<span className="step"><StatusTag s="error" /></span><span className="act">重新傳送</span>→<span className="step"><StatusTag s="progress" /></span></div>
        </div>
        <p className="spec-lead">已排程、排程已過期、已駁回三種可以刪除；送出後的訊息不能刪除，只能複製為新訊息。</p>
      </Section>


      <Section eyebrow="Urgent" title="緊急發送（略過 SMS 核准）" lead="含 SMS 的訊息可以用「緊急」為由略過 SMS 核准直接送出。這件事要留紀錄，所以列表和詳情都要看得出來。">
        <Figure label="列表上的標示" sub="ESH Emergency 空間" shot="urgent" wideNotes notes={[
          { n: 1, title: '緊急標籤', body: <>標題前面的 <C>Tag sm amber</C> 加 <C>Siren</C> 圖示，文字「Urgent / 緊急」。滑鼠移上顯示「Urgent: sent without SMS approval / 緊急發送：略過 SMS 核准」。用文字而不是只用顏色，色盲也看得懂。</> },
        ]} />
        <SpecTable head={['位置', '呈現']} rows={[
          ['詳情橫幅', <>黃色 <C>Banner warning</C>，標題「Sent without SMS approval (urgent) / 未經 SMS 核准送出（緊急）」，內文「&lt;誰&gt; skipped approval on &lt;時間&gt;. Reason: &lt;原因&gt;」。</>],
          ['詳情的 Approval 欄位', <Copy en="SMS approval skipped (urgent)" zh="已略過 SMS 核准（緊急）" />],
          ['外部收件人的主管核准', '不能略過；緊急只略過 SMS 核准。'],
        ]} />
      </Section>

      <Section eyebrow="Components" title="元件設定">
        <SpecTable head={['元素', '元件', '設定']} nowrap={[0, 1]} rows={[
          ['狀態標籤', <C>Tag</C>, <>size <C>sm</C>，有圖示。待核准 amber＋沙漏、排程已過期 deep-orange＋日曆叉、已駁回 red＋叉、已排程 neutral＋日曆、傳送中 blue＋紙飛機、已送出 green＋勾、傳送錯誤 red＋三角警示</>],
          ['通道', <C>Tag</C>, <>size <C>sm</C>，只有圖示，滑鼠移上顯示通道名稱。SMS 備援 amber，其他 neutral。順序：Device Notifications、Desktop OS、Email、SMS</>],
          ['傳送進度', <C>ProgressBar</C>, <>只在列表、只在傳送中出現。詳情不顯示進度條</>],
          ['失敗人數', <C>Button link xs</C>, <><C>CircleAlert</C> 圖示，文字 <C>error-text</C>，滑鼠移上加底線</>],
          ['數字', '—', <>送達數 medium、「/ 總數」次要色，等寬數字（tabular-nums）</>],
        ]} />
      </Section>
    </>
  )
}

// ---------- list ----------
function ListTab() {
  const sortable = <Tag size="sm" color="green">可排序</Tag>, no = <span className="text-fg-muted">—</span>
  return (
    <>
      <Section eyebrow="Columns" title="欄位" lead="順序依產品決定：先看是誰發的、走哪些通道、內容和狀態，再看模板、送達和時間。">
        <SpecTable head={['#', '欄位', '寬度', '內容', '沒有值時', '排序']} nowrap={[0, 1, 2, 5]} rows={[
          ['1', <Copy en="Sender" zh="寄件人" />, '170，釘選左側', '寄件人名稱，medium。只有 Device Notifications 和 Desktop OS 帶寄件人名稱。', '「—」（例如只有 Email）', sortable],
          ['2', <Copy en="Channels" zh="通道" />, '130', <span className="flex flex-col gap-1">通道圖示標籤，例如 <ChIcons list={['push', 'desktop', 'sms']} /></span>, '—', no],
          ['3', <Copy en="Title / Content" zh="標題 / 內容" />, '400', <>第一行標題，主色連結，點了打開詳情；第二行內文第一行，<C>text-caption</C> 次要色。兩行都超出時截斷，滑鼠移上看全文。有多種內容時顯示順序：Device Notifications → Email（自己的主旨）→ Desktop OS。緊急發送時標題前有 <Tag size="sm" color="amber" icon={Siren}>Urgent</Tag></>, '—', no],
          ['4', <Copy en="Status" zh="狀態" />, '180', '狀態標籤，見「狀態」', '—', no],
          ['5', <Copy en="Template" zh="模板" />, '150', '模板名稱，截斷', '「—」', sortable],
          ['6', <Copy en="Reach / Audience" zh="送達 / 收件人" />, '160', '「送達 / 收件人數」；還沒送出時送達用「–」；傳送中加進度條；有人失敗時加紅色「N failed」。依收件人數排序。', '—', sortable],
          ['7', <Copy en="Created" zh="建立時間" />, '120', '兩行：日期 / 時間（YYYY/MM/DD、HH:MM）', '—', sortable],
          ['8', <Copy en="Scheduled" zh="排程時間" />, '130', '兩行：日期 / 時間', '「—」（立即傳送）', sortable],
          ['9', <Copy en="Created by" zh="建立者" />, '170', '頭像＋英文名 / 中文名。只在共享發送空間出現（個人空間都是自己建立的）。', '—', sortable],
          ['10', '操作', '釘選右側', '「⋮」列選單', '—', no],
        ]} />
        <Notes items={[
          { title: '預設順序', body: '建立時間新到舊。點欄位標題依那一欄排序，再點一次反向；排序作用在整份列表，不只是目前這一頁。' },
          { title: '列高與對齊', body: <>列高依內容自動（<C>autoRowHeight</C>），每一格都垂直置中。</> },
          { title: '不排序的欄位', body: '標題 / 內容、通道、狀態不提供排序：前兩者沒有有意義的順序，狀態用篩選比排序好用。' },
        ]} />
      </Section>

      <Section eyebrow="Row menu" title="列選單" lead="「⋮」打開 DS DropdownMenu，靠右對齊。查看詳情和複製一定有；其他依狀態出現。刪除放最後，前面有分隔線，紅字。">
        <div className="spec-row side">
          <div className="spec-canvas"><Shot name="rowmenu" max={640} alt="排程已過期那一列的選單" /></div>
          <Notes items={[{ title: '圖：排程已過期', body: '查看詳情、立即傳送、重新排程、複製為新訊息、分隔線、刪除。' }]} />
        </div>
        <SpecTable head={['選項', 'Pending', 'Expired', 'Rejected', 'Scheduled', 'In progress', 'Sent', 'Error']} nowrap={[0]} rows={[
          [<Copy en="View details" zh="查看詳情" />, '●', '●', '●', '●', '●', '●', '●'],
          [<Copy en="Send now" zh="立即傳送" />, '', '●', '', '', '', '', ''],
          [<Copy en="Reschedule" zh="重新排程" />, '', '●', '', '', '', '', ''],
          [<Copy en="Edit" zh="編輯" />, '', '', '', '●', '', '', ''],
          [<Copy en="Edit and resubmit" zh="修改後重新送審" />, '', '', '●', '', '', '', ''],
          [<Copy en="Retry" zh="重新傳送" />, '', '', '', '', '', '', '●'],
          [<Copy en="Duplicate to new message" zh="複製為新訊息" />, '●', '●', '●', '●', '●', '●', '●'],
          [<Copy en="Delete" zh="刪除" />, '', '●', '●', '●', '', '', ''],
        ]} />
      </Section>

      <Section eyebrow="Pagination" title="分頁">
        <SpecTable head={['項目', '規則']} rows={[
          ['筆數說明', <Copy en="1–20 of 24" zh="第 1–20 則，共 24 則" />],
          ['每頁筆數', '10 / 20 / 50，預設 20。'],
          ['回到第 1 頁', '搜尋、篩選、切換發送空間、改每頁筆數時。'],
          ['沒有資料時', '不顯示分頁列。'],
        ]} />
      </Section>
    </>
  )
}

// ---------- search and filters ----------
function FilterTab() {
  return (
    <>
      <Section eyebrow="Decision" title="哪些用篩選按鈕、哪些用搜尋" lead="判斷原則：值少、固定、使用者會想「只看某一種」的，做成篩選按鈕；值多、是自由文字、使用者記得名字的，交給搜尋。">
        <SpecTable head={['欄位', '做法', '為什麼']} nowrap={[0, 1]} rows={[
          [<Copy en="Status" zh="狀態" />, <Tag size="sm" color="blue">篩選按鈕</Tag>, '7 個固定值，而且是最常見的工作情境：「有哪些等核准、哪些過期要處理、哪些失敗」。'],
          [<Copy en="Channels" zh="通道" />, <Tag size="sm" color="blue">篩選按鈕</Tag>, '4 個固定值，用文字搜不到（通道只有圖示）。例如「找出所有發過 SMS 的訊息」。'],
          [<Copy en="Sender" zh="寄件人" />, <Tag size="sm">搜尋</Tag>, '是使用者自己輸入的名稱，每個空間可能有很多個；記得名字直接打比在長清單裡找快。'],
          [<Copy en="Template" zh="模板" />, <Tag size="sm">搜尋</Tag>, '模板名稱一樣是自由文字、數量會越來越多。'],
          [<Copy en="Created by" zh="建立者" />, <Tag size="sm">搜尋</Tag>, '人名，用英文或中文名都找得到。'],
        ]} />
      </Section>

      <Section eyebrow="Toolbar" title="工具列" lead="DS action bar 的資料工具列：左邊搜尋，右邊操作。">
        <Figure label="篩選中" sub="Status = Sent、Channels = Email" shot="filtered" wideNotes notes={[
          { n: 1, title: '篩選按鈕', body: <>有外框的 <C>Button tertiary</C>，文字加向下箭頭。有選值時是按下狀態（pressed），並用 <C>Badge low</C> 顯示選了幾個值。</> },
          { n: 2, title: '結果說明', body: <><span className="spec-q">Showing 7 of 24 messages · 2 filters</span>（顯示 24 則中的 7 則・2 個篩選條件）。只在有搜尋字或篩選時出現，<C>aria-live</C> 讓螢幕閱讀器念出結果。</> },
          { n: 3, title: '清除', body: <>連結按鈕「Clear / 清除」，一次清掉搜尋字和所有篩選。</> },
        ]} />
        <Figure label="Status 選單" sub="點 Status 打開" shot="status-menu" max={560} notes={[
          { title: '選單內容', body: <>DS <C>DropdownMenu</C>，靠右對齊，寬 260。上方標題「Status」，每個選項是勾選框＋狀態標籤＋右側這個空間裡的則數。只列出這個空間有出現的狀態。</> },
          { title: '底部', body: <>分隔線下一行：有選值時是「Clear / 清除」；沒選時是灰色的「Showing all / 全部顯示中」。</> },
          { title: 'Channels 選單', body: '同樣的結構，選項是通道圖示＋名稱＋則數；這個空間沒用過的通道不列出。' },
        ]} />
        <SpecTable head={['規則', '說明']} rows={[
          ['搜尋框', <>寬度填滿到 <C>max-w-sm</C>（384px），最小 240px。提示字 <Copy en="Search title, content, sender, template or creator" zh="搜尋標題、內容、寄件人、模板或建立者" /></>],
          ['搜尋範圍', '標題、內文、寄件人、模板名稱、建立者（英文名與中文名），不分大小寫，輸入就即時篩選。'],
          ['同一個篩選裡選多個值', '「或」：Status 選 Sent 和 Error，兩種都顯示。'],
          ['不同篩選、搜尋之間', '「且」：Status = Sent 且 Channels = Email 且符合搜尋字。'],
          ['Channels 的比對', '訊息用到任何一個選的通道就符合。SMS 指的是有開 SMS 備援。'],
          ['保留多久', '在同一個空間內保留；切換空間或從發送流程回來時清除。'],
        ]} />
      </Section>
    </>
  )
}

// ---------- detail ----------
function DetailTab() {
  return (
    <>
      <Section eyebrow="Panel" title="詳情面板" lead="點標題在右側打開，寬 480。DS AppShellAside：桌面版和列表並排、不加遮罩；右上角關閉。內容由上到下固定順序，只有還沒送出、需要處理的訊息才有底部按鈕列。">
        <Figure label="已送出、有人失敗" sub="展開 Device Notifications" shot="d-sent" max={480} notes={[
          { n: 1, title: '狀態與編號', body: <>狀態標籤＋請求編號（等寬字，次要色），例如 <C>MNP-20261017-1503</C>。</> },
          { n: 2, title: '標題', body: <><C>text-body-lg</C> medium，完整顯示不截斷。</> },
          { n: 3, title: '基本資訊', body: <>DS <C>DescriptionList</C> horizontal divided。欄位見下表；沒有值的欄位整列不顯示。</> },
          { n: 4, title: 'Reach / Audience 送達 / 收件人', body: '和列表的 Reach / Audience 欄同名、同算法：「551 / 560」。還沒送出時是「– / 560 · not sent yet」，已排程是「– / 560 · sends <時間>」。詳情不顯示進度條。' },
          { n: 5, title: '失敗人數', body: '所有通道都沒送到的人，紅色連結，打開傳送失敗名單（可重寄）。' },
          { n: 6, title: 'By channel 各通道', body: <>每個用到的通道一列，DS <C>Accordion</C>，預設全部收合。</> },
          { n: 7, title: '通道列', body: '圖示、通道名稱，第二行「532 / 560 delivered · 28 failed」，失敗人數紅字；開了 SMS 備援時再加綠字「· 20 delivered via SMS」。展開看這個通道送出的內容。' },
          { n: 8, title: '失敗名單入口', body: <>這個通道有人失敗時，內容下方一個連結 <span className="spec-q">See failed audience members (28)</span>（查看傳送失敗的收件人（28 人）），打開這個通道的名單。不在面板裡預先列人。</> },
          { n: 9, title: 'Audiences 收件人', body: '每個收件人一列，順序固定：組織 → 群組 → 個人 → 外部聯絡人。組織和群組有圖示、名稱、說明；個人有頭像、中英文名、工號・組織；外部聯絡人有地址或號碼，說明「External email · Email only」或「External phone · SMS only」。' },
          { n: 10, title: '成員人數', body: '只有組織和群組有：藍色連結「58 people」，打開可搜尋的成員名單。和發送流程第一步同一個做法。' },
        ]} />
      </Section>

      <Section eyebrow="Fields" title="基本資訊欄位">
        <SpecTable head={['欄位', '內容', '何時顯示']} nowrap={[0]} rows={[
          [<Copy en="Sender" zh="寄件人" />, '寄件人名稱', '有 Device Notifications 或 Desktop OS 時'],
          [<Copy en="Template" zh="模板" />, '模板名稱，沒有用模板時「—」', '一定'],
          [<Copy en="Channels" zh="通道" />, '通道全名，逗號分隔', '一定'],
          [<Copy en="Approval" zh="核准" />, <>Approved 已核准 · Waiting for the SMS reviewer 等待 SMS 審核人員 · Rejected by the SMS reviewer SMS 審核人員駁回 · SMS approval skipped (urgent) 已略過 SMS 核准（緊急）</>, '有 SMS 或需要核准時'],
          [<Copy en="Created by" zh="建立者" />, '英文名＋中文名', '一定'],
          [<Copy en="Created" zh="建立時間" />, 'YYYY/MM/DD HH:MM', '一定'],
          [<Copy en="Send time" zh="傳送時間" />, '一律顯示確切時間：有排程就是排程時間；立即傳送是核准時間或建立時間；還在等核准或已駁回、沒有排程時是「—」', '一定'],
        ]} />
      </Section>

      <Section eyebrow="Reach" title="送達文字的規則">
        <SpecTable head={['情況', 'Reach / Audience 區', '通道列第二行']} rows={[
          ['還沒送出（待核准、已駁回、排程已過期）', <Copy en="– / 560 · not sent yet" zh="– / 560・尚未傳送" />, <Copy en="Not sent yet" zh="尚未傳送" />],
          ['已排程', <Copy en="– / 560 · sends 2026/10/24 22:00" zh="– / 560・2026/10/24 22:00 傳送" />, <Copy en="Not sent yet" zh="尚未傳送" />],
          ['傳送中', <Copy en="241 / 292" zh="241 / 292" />, <Copy en="241 / 292 delivered" zh="241 / 292 已送達" />],
          ['已送出、傳送錯誤', <Copy en="551 / 560 · 9 failed" zh="551 / 560 · 9 人失敗" />, <Copy en="532 / 560 delivered · 28 failed" zh="532 / 560 已送達・28 人失敗" />],
          ['Device Notifications，開了 SMS 備援', '—', <Copy en="400 / 412 delivered · 12 failed · 5 delivered via SMS" zh="400 / 412 已送達・12 人失敗・5 人改由 SMS 送達" />],
          ['SMS 備援（排在 Device Notifications 下面、縮排）', '—', <span className="flex flex-col gap-1"><Copy en="5 / 12 delivered · 7 failed" zh="5 / 12 已送達・7 人失敗" /><span className="text-caption text-fg-secondary">12 是 Device Notifications 沒送到的人</span></span>],
          ['SMS 備援，還沒送出', '—', <Copy en="Not sent yet" zh="尚未傳送" />],
          ['SMS 備援，沒有人需要（推播都送到了）', '—', <Copy en="Not needed" zh="不需要" />],
        ]} />
        <SpecTable head={['通道', '展開後的內容']} nowrap={[0]} rows={[
          ['Device Notifications', '寄件人（次要色小字）、標題（medium）、內文，放在有外框的區塊裡'],
          ['Desktop OS', '同上，但用 Desktop OS 自己的寄件人、標題和內文（兩個通道的內容是分開寫的）'],
          ['Device Notifications (SMS)', 'SMS 內容'],
          ['Email', '「Subject: 主旨」一行，下面是 Email 內文（保留格式）'],
        ]} />
      </Section>

      <Section eyebrow="SMS fallback" title="SMS 備援" lead="SMS 不是另一個通道，而是 Device Notifications 送不到時的補發。所以它排在 Device Notifications 正下方、縮排，數字的分母就是推播沒送到的人；改由 SMS 收到的人，在 Device Notifications 的失敗名單裡標成「Delivered via SMS」。">
        <Figure label="開了 SMS 備援的訊息" sub="Fab 18 Communications · Fire drill at 10:00 today" shot="d-sms" max={480} notes={[
          { n: 1, title: 'Device Notifications', body: '「400 / 412 delivered · 12 failed」，後面加綠字「· 5 delivered via SMS」：12 個沒收到推播的人裡，有 5 個改由 SMS 收到。' },
          { n: 2, title: '改由 SMS 送達', body: '綠字（success-text），讓人一眼看出失敗的推播有被補上。整則訊息的失敗只算兩個都沒收到的 7 人。' },
          { n: 3, title: 'SMS fallback 列', body: <>名稱「SMS fallback / SMS 備援」，用轉折箭頭 <C>CornerDownRight</C> 並縮排，表示它接在 Device Notifications 後面。第二行和其他通道同格式「5 / 12 delivered · 7 failed」，分母 12 就是 Device Notifications 沒送到的人（位置已經說明它是補發，不另外寫）。展開看 SMS 內容和 SMS 的失敗名單。</> },
        ]} />
        <Figure label="Device Notifications 的失敗名單" sub="捲到下方：改由 SMS 收到的人" shot="dlg-sms" max={860} notes={[
          { title: '兩種人', body: <>SMS 也失敗的人：原因下方小字寫 SMS 的原因（例如「SMS fallback: number not in service」）。SMS 送到的人：原因下方綠色 <Tag size="sm" color="green">Delivered via SMS</Tag>。</> },
          { title: '排序', body: '先列兩個都沒收到、需要處理的人，改由 SMS 收到的人排在後面。' },
          { title: '表格', body: '這個對話框不會左右捲動，所以姓名欄不釘選，每列高度跟著內容。' },
        ]} />
      </Section>

      <Section eyebrow="By status" title="每種狀態的面板" lead="上方的橫幅與底部按鈕列依狀態不同，其他區塊相同。按鈕列固定在面板底部：刪除在最左（紅字 text button），其他靠右，主要動作在最右。">
        <div className="spec-gallery">
          {[
            ['d-pending', '待核准', '藍色橫幅「Waiting for approval from your supervisor」＋何時送出。沒有按鈕列。'],
            ['d-scheduled', '已排程', '沒有橫幅。按鈕列：刪除｜編輯（secondary）。'],
            ['d-expired', '排程已過期', '黃色橫幅說明核准時間晚於排程。按鈕列：刪除｜重新排程（secondary）、立即傳送（primary）。'],
            ['d-rejected', '已駁回', '紅色橫幅「Rejected by the SMS reviewer」＋時間與原因。按鈕列：刪除｜修改後重新送審（primary）。'],
            ['d-urgent', '傳送中（緊急發送）', '黃色橫幅「Sent without SMS approval (urgent)」＋誰、何時、原因。沒有按鈕列。'],
            ['d-error', '傳送錯誤', '紅色失敗人數。重新傳送在列選單和失敗名單裡，面板沒有按鈕列。'],
          ].map(([k, t, d]) => (
            <figure key={k}><figcaption><b>{t}</b><span>{d}</span></figcaption><div className="spec-canvas"><Shot name={k} alt={t} /></div></figure>
          ))}
        </div>
      </Section>
    </>
  )
}

// ---------- dialogs ----------
function DialogsTab() {
  return (
    <>
      <Section eyebrow="Dialogs" title="三種名單對話框" lead="都用 DS Dialog＋DataTable（有外框、固定高度、內容多時在表格內捲動），標題寫清楚是誰的名單、幾個人。">
        <Figure label="傳送失敗名單" sub="從列表或詳情的「N failed」打開 · 寬 760" shot="dlg-failed" max={760} notes={[
          { title: '標題', body: <><span className="spec-q">Failed audience members</span>（傳送失敗的收件人），副標「All channels · 9 of 560」（所有通道 · 9 / 560 人）。</> },
          { title: '錯誤說明', body: '傳送錯誤時，表格上方多一個紅色橫幅說明系統錯誤。' },
          { title: '欄位', body: '收件人（頭像、姓名、工號・NT 帳號；外部聯絡人顯示地址或電話）260｜組織 110｜原因 280（第二行是 SMS 備援的原因）。' },
          { title: '按鈕', body: <>右下主要按鈕：已送出時 <span className="spec-q">Resend to 9</span>（重寄給 9 人），會開一則新訊息、收件人帶入這些人；傳送錯誤時 <span className="spec-q">Retry</span>（重新傳送），同一則訊息再送一次。</> },
        ]} />
        <Figure label="單一通道失敗名單" sub="從詳情通道列的「See failed audience members」打開 · 寬 860" shot="dlg-channel" max={860} notes={[
          { title: '標題', body: <>和傳送失敗名單同一個標題 <span className="spec-q">Failed audience members</span>，副標寫通道和人數「Device Notifications · 28 of 560」。</> },
          { title: '欄位', body: <>收件人｜組織｜原因，原因是這個通道的原因。Device Notifications 開了 SMS 備援時，原因下方加 SMS 的結果：失敗時寫 SMS 的原因；SMS 送到時標綠色 <Tag size="sm" color="green">Delivered via SMS</Tag>。</> },
          { title: '沒有按鈕', body: '這些人可能已經從別的通道收到，所以這裡只用來查看，重寄從「傳送失敗名單」做。' },
        ]} />
        <Figure label="群組成員名單" sub="從發送流程第一步的人數、或詳情收件人的人數打開 · 寬 640" shot="dlg-members" max={640} notes={[
          { title: '標題', body: <>群組或組織名稱，副標「Org · 58 people / 組織 · 58 人」。</> },
          { title: '搜尋', body: <>表格上方 sm 搜尋框。群組：<Copy en="Search name, NT, email or mobile" zh="搜尋姓名、NT 帳號、Email 或手機" />；組織：<Copy en="Search name, NT or employee ID" zh="搜尋姓名、NT 帳號或工號" /></> },
          { title: '欄位', body: '不列組織。群組：姓名（頭像、中英文名；外部顯示地址或號碼）280｜Added by 加入方式（當初用來加入的 NT 帳號、Email、手機或工號，下方小字標類型）260。組織：姓名｜工號 130｜NT 帳號 130。' },
          { title: '找不到時', body: <>表格內的空狀態：<Copy en="No matching members · Try another name, NT account or employee ID." zh="找不到符合的成員・換個姓名、NT 帳號或工號試試。" /></> },
          { title: '為什麼用對話框', body: '群組常有 58 到 312 人：對話框可以搜尋，鍵盤和觸控都能用，也不會把面板或表格撐得很長（見設計方案比較的「群組成員」）。' },
        ]} />
      </Section>
    </>
  )
}

// ---------- empty states and feedback ----------
function StatesTab() {
  return (
    <>
      <Section eyebrow="States" title="載入、空狀態" lead="都畫在表格的位置上，用 DS Empty。">
        <div className="spec-gallery wide">
          <figure><figcaption><b>載入中</b><span>進入或切換發送空間時。DS CircularProgress 48px 加一行字，置中，不加外框。</span></figcaption><div className="spec-canvas"><Shot name="loading" alt="載入中" /></div></figure>
          <figure><figcaption><b>還沒有訊息</b><span>這個空間一則訊息都沒有。表格保留表頭，空狀態在表格內。</span></figcaption><div className="spec-canvas"><Shot name="empty" alt="還沒有訊息" /></div></figure>
          <figure><figcaption><b>找不到結果</b><span>有訊息，但搜尋或篩選後沒有符合的。附「清除篩選」按鈕。</span></figcaption><div className="spec-canvas"><Shot name="nomatch" alt="找不到結果" /></div></figure>
        </div>
        <SpecTable head={['狀態', '圖示', '文案', '按鈕']} nowrap={[0, 1]} rows={[
          ['載入中', <C>CircularProgress 48</C>, <Copy en="Loading messages…" zh="正在載入訊息…" />, '—'],
          ['還沒有訊息', <C>Send</C>, <Copy en="No messages yet · Click “+ New message” to send your first notification." zh="還沒有訊息 · 點「＋ 新訊息」發送第一則通知。" />, '—（頁首已有新訊息按鈕）'],
          ['找不到結果', <C>Search</C>, <Copy en="No matching messages · Try another search or clear filters." zh="找不到符合的訊息 · 換個關鍵字，或清除篩選條件。" />, <Copy en="Clear filters" zh="清除篩選" />],
        ]} />
      </Section>

      <Section eyebrow="Confirm" title="確認對話框" lead="不能復原或會馬上送出的動作先確認。取消在左、確認在右；刪除的確認鈕是紅色。">
        <SpecTable head={['動作', '標題', '內文', '按鈕']} rows={[
          ['刪除', <Copy en="Delete this message?" zh="要刪除這則訊息嗎？" />, <Copy en="“<title>” won’t be sent, and it’s removed from the list. This can’t be undone." zh="「<標題>」不會送出，也會從列表移除，無法復原。" />, <Copy en="Keep · Delete" zh="保留 · 刪除" />],
          ['立即傳送（排程已過期）', <Copy en="Send it now?" zh="要立即傳送嗎？" />, <Copy en="It goes out right away instead of at <time>. It’s already approved." zh="會立刻送出，不再等原訂的 <時間>。這則訊息已經核准。" />, <Copy en="Not now · Send now" zh="先不要 · 立即傳送" />],
          ['重新排程', <Copy en="Reschedule" zh="重新排程" />, <Copy en="It’s already approved, so it won’t go back for review." zh="這則訊息已經核准，改時間不需要重新送審。" />, <Copy en="Cancel · Reschedule" zh="取消 · 重新排程" />],
        ]} />
        <Notes items={[{ title: '重新排程的時間欄位', body: <>日期時間選擇器，台北時間，提示「Taipei time (GMT+8), up to 30 days ahead」。錯誤：<span className="spec-q">Pick a time at least 10 minutes from now.</span>／<span className="spec-q">Pick a time within 30 days.</span></> }]} />
      </Section>

      <Section eyebrow="Toast" title="Toast" lead="DS Toast 預設 4 秒自動消失，所以只放一行短標題，不加描述。成功用 success，失敗用 error。">
        <SpecTable head={['時機', '文案']} rows={[
          ['刪除後', <Copy en="Message deleted" zh="已刪除訊息" />],
          ['立即傳送後', <Copy en="Sending to 560 audiences" zh="傳送給 560 位收件人" />],
          ['重新排程後', <Copy en="Rescheduled for Nov 6, 09:00" zh="已改為 11月6日 09:00" />],
          ['重新傳送後', <Copy en="Retrying" zh="重新傳送中" />],
        ]} />
      </Section>
    </>
  )
}

// ---------- edge cases ----------
function EdgeTab() {
  return (
    <Section eyebrow="Edge cases" title="邊界情境" lead="計算規則和畫面上一定會碰到的情況。">
      <SpecTable head={['情境', '規則', '畫面']} rows={[
        ['同一人在兩個收件群組', '只算一人、只收一次。', '收件人數是去重後的人數'],
        ['Device Notifications 沒送到，SMS 備援送到', '這個人算送達。', 'Device Notifications 列算他失敗，並在名單裡標綠色「Delivered via SMS」；SMS 備援列算他已送達；不在整則訊息的失敗名單裡'],
        ['某個通道沒送到，別的通道送到', '整則訊息不算失敗。', '只出現在那個通道的失敗名單'],
        ['所有通道都沒送到', '算失敗。', '出現在「N failed」與失敗名單；可重寄'],
        ['還有通道在送', '維持傳送中，不顯示失敗人數。', '列表有進度條；送完才出現「N failed」'],
        ['沒有人收到，或系統錯誤', '傳送錯誤，可重新傳送。', '失敗名單上方有錯誤說明'],
        ['核准時已過排程時間', '排程已過期，不會自動送出。', '可立即傳送、重新排程（不用重新送審）或刪除'],
        ['緊急發送', '只略過 SMS 核准；寄給外部收件人的主管核准不能略過。', '列表「Urgent」標籤；詳情黃色橫幅記錄誰、何時、原因'],
        ['外部 Email、外部電話', '外部 Email 只收 Email；外部電話只收 SMS。', '在失敗名單顯示地址或號碼，組織為「—」'],
        ['只有 Email 的訊息', '沒有寄件人名稱。', 'Sender 欄「—」，詳情不顯示 Sender'],
        ['個人發送空間', '只有自己建立的訊息。', '沒有 Created by 欄'],
        ['共享發送空間', '團隊成員建立的訊息都看得到。', '有 Created by 欄'],
        ['切換發送空間', '搜尋、篩選、分頁重設。', '顯示載入中，再顯示新空間的列表'],
        ['名單很長（數百人）', '在對話框表格內捲動，全部列出。', '成員名單可以搜尋'],
        ['只有一個通道', '「By channel」仍然有一列。', '和其他訊息一致，內容也從這裡看'],
      ]} />
    </Section>
  )
}
