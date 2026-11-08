// UI flow and design spec of New message in the one-record-per-channel prototype. One page, a tab per part, routed
// on the URL hash. Screens are screenshots of that prototype (tools/newmsg-shots.mjs).
import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@qijenchen/design-system'
import { StatusTag } from '../../components/ui'
import { C, Copy, Notes, Section, Shot, SpecTable } from '../parts'

const PROTO = 'https://claude.ai/artifact/Kq6FnvbagCvdtmoPXiRD91'
const TABS = [['flow', 'UI Flow'], ['frame', '頁首、步驟與頁尾'], ['s1', '步驟 1 收件人與通道'], ['s2', '步驟 2 訊息內容'], ['s3', '步驟 3 排程與預覽'], ['dialogs', '對話框'], ['after', '送出之後'], ['errors', '錯誤訊息']] as const
type TabKey = typeof TABS[number][0]
const isTab = (h: string): h is TabKey => TABS.some(t => t[0] === h)

export default function NewMsgSpec() {
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
            <span className="spec-eyebrow">MNP · 發送訊息</span>
            <h1 className="spec-h1">New message：UI Flow 與設計規格</h1>
            <span className="text-caption text-fg-secondary">2026/11/07 · 畫面取自 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">單一通道紀錄版 prototype</a>（需密碼）。</span>
          </div>
          <Tabs value={tab} onValueChange={v => go(v as TabKey)}>
            <TabsList overflow="scroll">{TABS.map(([k, t]) => <TabsTrigger key={k} value={k}>{t}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
      </div>
      <main className="spec-wrap spec-main" key={tab}>
        {tab === 'flow' ? <Flow go={go} /> : null}
        {tab === 'frame' ? <Frame /> : null}
        {tab === 's1' ? <Step1 /> : null}
        {tab === 's2' ? <Step2 /> : null}
        {tab === 's3' ? <Step3 /> : null}
        {tab === 'dialogs' ? <Dialogs /> : null}
        {tab === 'after' ? <After /> : null}
        {tab === 'errors' ? <Errors /> : null}
      </main>
    </>
  )
}

const REQ = <Copy en="This field is required." zh="此欄位為必填。" />
const Gallery = ({ items, max }: { items: [string, string, string?][]; max?: number }) => (
  <div className="spec-gallery">
    {items.map(([n, t, d]) => <figure key={n}><figcaption><b>{t}</b>{d ? <span>{d}</span> : null}</figcaption><div className="spec-canvas"><Shot name={n} alt={t} max={max} pins={false} /></div></figure>)}
  </div>
)
const Big = ({ name, title, sub }: { name: string; title: string; sub?: string }) => (
  <figure className="spec-frame"><figcaption><b>{title}</b>{sub ? <span>{sub}</span> : null}</figcaption><div className="spec-canvas"><Shot name={name} alt={title} max={1180} pins={false} /></div></figure>
)

// ---------- UI flow ----------
type Kind = 'page' | 'dialog' | 'action'
const KIND: Record<Kind, string> = { page: '畫面', dialog: '對話框', action: '操作' }
const KCLS: Record<Kind, string> = { page: 'is-done', dialog: 'is-dialog', action: 'is-action' }
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

function Flow({ go }: { go: (k: TabKey) => void }) {
  const link = (k: TabKey, t: string) => <button type="button" className="flow-spec-link" onClick={() => go(k)}>{t}</button>
  return (
    <>
      <Section eyebrow="Flow" title="發送一則訊息" lead="從訊息列表右上角的 New message 進入，三個步驟，最後回到列表。可以隨時按頁尾的 Back 回到上一步，或點步驟列回到已經過的步驟。">
        <div className="flow-map" role="list">
          <Stop sub="列表右上角 New message">開始</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="收件人與通道">步驟 1</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="每個通道的內容">步驟 2</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="排程與預覽">步驟 3</Stop><span className="flow-arrow" aria-hidden>→</span>
          <Stop sub="toast 顯示結果">回到列表</Stop>
        </div>
        <div className="flow-legend">
          <span><i className="flow-key" style={{ background: 'var(--flow-done)' }} />畫面</span>
          <span><i className="flow-key" style={{ background: 'var(--spec-muted)' }} />操作</span>
          <span><i className="flow-key" style={{ background: 'var(--flow-branch)' }} />對話框</span>
        </div>
      </Section>

      <Section eyebrow="1" title="步驟 1：收件人與通道" lead={<>規格見「{link('s1', '步驟 1')}」。</>}>
        <div className="flow-branches">
          <Card kind="page" title="空白" when="剛進入" shots={['s1-empty']} then="收件人搜尋、Batch import、三張通道卡片。" />
          <Card kind="page" title="搜尋收件人" when="在搜尋框輸入" shots={['s1-search']} then="下拉選單列出符合的人；按 Enter 加入第一筆（搜尋框下方沒有說明文字）。" />
          <Card kind="dialog" title="Batch import" when="按 Batch import" shots={['dlg-import', 'dlg-import-result']} then="選資料類型、貼上或上傳名單 → Find matches → 確認後加入。" />
          <Card kind="page" title="選好收件人與通道" when="加入收件人、勾通道" shots={['s1-filled']} then="收件人表格顯示每位能收到哪些通道。" />
          <Card kind="dialog" title="n people can’t get the message" when="點通道下方的 See who" shots={['s1-unreach', 'dlg-unreach']} then="列出所有選到的通道都收不到的人與原因。" />
          <Card kind="page" title="SMS 備援與緊急送出" when="勾 Device Notifications (SMS)，再勾 It’s urgent" shots={['s1-sms', 's1-urgent']} then="勾了緊急，必填原因。" />
          <Card kind="dialog" title="Save as group" when="頁尾 Save as group" shots={['dlg-save-group']} then="把目前的收件人存成群組。" />
          <Card kind="page" title="驗證錯誤" when="沒有收件人或通道就按 Next" shots={['s1-error']} then="錯誤顯示在對應的區塊下方。" />
        </div>
      </Section>

      <Section eyebrow="2" title="步驟 2：訊息內容" lead={<>規格見「{link('s2', '步驟 2')}」。</>}>
        <div className="flow-branches">
          <Card kind="page" title="空白" when="進入步驟 2" shots={['s2-empty']} then="每個勾選的通道一個區塊，區塊之間有分隔線。" />
          <Card kind="page" title="驗證錯誤" when="欄位沒填就按 Next" shots={['s2-error']} then="沒填的欄位顯示 This field is required." />
          <Card kind="page" title="填好" when="填完所有欄位" shots={['s2-filled']} />
          <Card kind="dialog" title="Save as template" when="頁尾 Save as template" shots={['dlg-save-tpl']} then="把目前的內容存成模板。" />
        </div>
      </Section>

      <Section eyebrow="3" title="步驟 3：排程與預覽" lead={<>規格見「{link('s3', '步驟 3')}」。</>}>
        <div className="flow-branches">
          <Card kind="page" title="立即傳送" when="進入步驟 3（預設）" shots={['s3-now']} then="Schedule 與 Review（預覽）。" />
          <Card kind="page" title="排程傳送" when="選 Scheduled send" shots={['s3-schedule', 's3-error']} then="出現日期時間欄位；選到過去或超過 3 個月時顯示錯誤。" />
          <Card kind="page" title="預覽各通道" when="切換 Preview 的通道" shots={['s3-preview-email']} then="顯示這個通道的收件人數與預覽。" />
          <Card kind="dialog" title="Send without SMS approval?" when="緊急送出時按 Create message" shots={['dlg-urgent']} then="確認後送出，不等 SMS 核准。" />
          <Card kind="action" title="回到列表" when="Create message" shots={['after-submit']} then="toast 顯示結果；新訊息出現在列表最上方。" />
          <Card kind="dialog" title="Leave without sending?" when="任何步驟按頁尾 Cancel" shots={['dlg-leave']} then="Discard 回到列表，內容不保留。" />
        </div>
      </Section>
    </>
  )
}

// ---------- header, steps, footer ----------
function Frame() {
  return (
    <>
      <Section eyebrow="Header" title="頁首" lead="頁首是麵包屑：空間名稱 › New message。點空間名稱等同 Cancel：已經填了內容時，先確認是否離開。右側沒有標籤；需不需要核准，在步驟 1 的 SMS 備援提示框、步驟 3 的 Create message 與送出後的 toast 說明。">{null}</Section>
      <Section eyebrow="Steps" title="步驟列" lead="設計系統 Steps（水平）。">
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['步驟名稱', <><Copy en="Audiences & channels" zh="收件人與通道" />、<Copy en="Message" zh="訊息內容" />、<Copy en="Schedule & preview" zh="排程與預覽" /></>],
          ['完成的步驟', '打勾；可以點回去。'],
          ['還沒到的步驟', '停用；只能點下一步。'],
          ['手機寬度', '只顯示目前步驟：圓形數字、步驟名稱與 Step n of 3。'],
        ]} />
      </Section>
      <Section eyebrow="Footer" title="頁尾" lead="固定在畫面底部。左側是這一步的次要操作，右側是導覽。">
        <SpecTable head={['步驟', '左側', '右側']} nowrap={[0]} rows={[
          ['1', <Copy en="Save as group" zh="存成群組" />, 'Cancel、Next'],
          ['2', <Copy en="Save as template" zh="存成模板" />, 'Cancel、Back、Next'],
          ['3', <Copy en="Send me a test" zh="寄測試給我" />, 'Cancel、Back、Create message'],
        ]} />
        <Notes items={[
          { title: '按鈕樣式', body: 'Cancel、Back 與左側按鈕都是 tertiary；Next 與 Create message 是 primary。頁尾的按鈕都沒有圖示。' },
          { title: 'Next', body: '按下時檢查這一步，有錯就留在這一步並顯示錯誤。「有人收不到訊息」只是提醒，不算錯誤，不擋 Next。' },
          { title: 'Save as group', body: '沒有收件人時停用。' },
          { title: 'Send me a test', body: '內容有錯時不寄，toast：Finish the message first；成功時 toast：Test sent。' },
        ]} />
      </Section>
      <Section eyebrow="Entry" title="進入方式" lead="同一個畫面有四種進入方式，頁首標題與預填的內容不同。">
        <SpecTable head={['進入方式', '入口', '頁首標題', '預填內容']} nowrap={[0, 2]} rows={[
          ['新訊息', '列表右上角 New message', 'New message', '全部空白，從步驟 1 開始。'],
          ['複製', '列表選單 Duplicate to new message（單一通道的紀錄）', 'Duplicate message', '只有那一個通道（SMS 的紀錄會勾 Device Notifications 加 SMS 備援）、它的內容與模板；收件人是這個通道收得到的人（外部電話只跟 SMS 的紀錄，外部 Email 只跟 Email 的紀錄）。傳送時間不帶入，預設立即傳送。三個步驟都已解鎖，可以直接點步驟列。'],
          ['重寄', 'Not sent to 對話框的 Resend to n', 'Resend to missed audiences', '同一個通道與內容；收件人只有沒收到的人（含外部）。三個步驟都已解鎖。'],
          ['編輯內容', '列表選單 Edit content（只有 Scheduled expired）', 'Edit content', '只有那一個通道的內容欄位，沒有步驟列與模板選項，頁尾只有 Cancel、Save。細節見「Send messages 設計規格」。'],
        ]} />
      </Section>
      <Section eyebrow="Rules" title="移動與離開的規則">
        <SpecTable head={['操作', '行為']} nowrap={[0]} rows={[
          ['Next', '只檢查目前這一步。有錯就留在這一步、顯示錯誤並捲到第一個錯誤；沒錯進下一步。'],
          ['Back', '回上一步，不檢查；已填的內容都保留。'],
          ['點步驟列', '點前面的步驟：直接回去，不檢查。點後面的步驟：從目前這步依序檢查到目標的前一步，停在第一個有錯的步驟。下一步永遠可以點；再後面的步驟要先到過才能點。'],
          ['Create message', '步驟 1 到 3 依序檢查，停在第一個有錯的步驟並顯示錯誤；全部通過才送出。'],
          ['Cancel、點頁首的空間名稱', '還沒改過任何內容就直接回列表（複製與重寄預填的內容不算改過）；改過就先問 Leave without sending?。Edit content 的標題是 Leave without saving?。'],
          ['改通道、改收件人', '已填的文字都保留。取消勾選的通道，內容留著但不會送出，再勾回來還在。'],
          ['送出後', '回到列表第 1 頁，並清掉搜尋與篩選；新紀錄排在最上方。'],
        ]} />
      </Section>
    </>
  )
}

// ---------- step 1 ----------
function Step1() {
  return (
    <>
      <Section eyebrow="Step 1" title="收件人" lead={<>區塊標題 Audiences，說明 <Copy en="Up to 500 people. Add contractors by phone or email." zh="最多 500 人。外包人員可用電話或 Email 加入。" />；右上角是目前人數 n / 500。</>}>
        <Big name="s1-filled" title="選好收件人與通道" sub="1680 寬" />
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['類型選單', '搜尋框左側：Person、Org、Group、Phone、Email、MVPN。決定搜尋框找什麼，各類型見下表。'],
          ['搜尋框', <>Person 時的提示文字 <Copy en="Name, NT account or employee ID" zh="姓名、NT 帳號或工號" />；搜尋框下方沒有說明文字。已在名單上的選項顯示 Added，不能再選。</>],
          ['Batch import', '搜尋框右側（tertiary，上傳圖示），開批次匯入對話框。'],
          ['收件人表格', '固定行高，每格一行、內容垂直置中（設計系統表格規則）。欄：Audience（個人是設計系統的人員顯示：頭像加姓名，組織、NT 帳號與工號在滑過的人員卡片；其他類型是圖示加名稱）、Type、People（組織與群組是藍字人數，點了看成員）、Can receive（各通道圖示放在灰底 Tag 裡，收不到的變淡並加刪除線）。列尾 × 移除。'],
          ['超過 6 筆', '表格上方出現篩選框 Filter audiences 與 Remove all（紅字，會先確認）。'],
          ['沒有收件人', <>表格位置顯示空狀態 <Copy en="No audiences yet" zh="還沒有收件人" />，說明 <Copy en="Search above, or use Batch import." zh="在上方搜尋，或使用批次匯入。" /></>],
        ]} />
        <SpecTable head={['搜尋類型', '輸入', '下拉選單與加入方式', '錯誤與找不到']} nowrap={[0]} rows={[
          ['Person', '姓名、NT 帳號或工號', '輸入後列出符合的人（最多 8 筆）：大頭照、英文名 中文名、組織代號 · NT · 工號。點選，或按 Enter 加入第一筆。', <><Copy en="No match for “<輸入>”. Contractors? Switch to Phone or Email." zh="找不到「<輸入>」。外包人員請改選電話或 Email。" /></>],
          ['Org', '組織代碼、編號或名稱', '沒輸入也列出全部組織：代碼、編號、人數。加入後下拉選單不關，可以連續加入。', <Copy en="No match for “<輸入>”." zh="找不到「<輸入>」。" />],
          ['Group', '群組名稱', '沒輸入時，標題 Your groups 下列出這個空間的群組：名稱、說明、人數。加入後下拉選單不關。', <Copy en="No match for “<輸入>”." zh="找不到「<輸入>」。" />],
          ['Phone', '手機號碼，例如 0912-345-678', '按 Add 或 Enter 加入。號碼是員工的公務手機或私人手機：加入那位員工（選項註明 Company mobile / Personal phone）；不是員工的號碼：加入為外部電話，顯示成 0987-654-321。', <Copy en="Enter 8–15 digits." zh="請輸入 8–15 碼數字。" />],
          ['Email', 'Email 地址', '按 Add 或 Enter 加入。公司網域的地址：加入對應的員工（註明 Company email）；其他網域：加入為外部 Email。', <><Copy en="Enter a full email address." zh="請輸入完整的 Email。" />　<Copy en="No employee has this address." zh="沒有員工用這個信箱。" /></>],
          ['MVPN', '5 碼 MVPN', '列出用這個 MVPN 的員工，右側註明 MVPN 號碼。', <><Copy en="MVPN is up to 5 digits." zh="MVPN 最多 5 碼。" />　<Copy en="No one has this MVPN." zh="沒有人用這個 MVPN。" /></>],
        ]} />
        <Notes items={[
          { title: '錯誤顯示位置', body: '下拉選單關著時，錯誤在搜尋框下方（紅字）；下拉選單開著時，錯誤在選單裡（紅色圖示加文字）。' },
          { title: '人數計算', body: <>右上角 n / 500 是展開之後的人數：組織與群組展開成人，同一個人不管從哪裡加入只算一次；外部 Email 與外部電話各算 1；群組裡存的外包人員算外部。超過 500 人數變紅，並出現錯誤。</> },
          { title: '人員名稱', body: '到處都是英文名在前、中文名在後（Grace Wu 吳佳穎）：表格、搜尋下拉、對話框的清單、詳情面板的收件人與建立者都一樣。' },
          { title: '大頭照', body: '內部人員顯示大頭照（設計系統人員顯示的 avatarUrl，沒有照片時退回姓名第一個字母）；本頁的示意圖是範例。外部電話與外部 Email 沒有大頭照，一律是灰色圓底的圖示。' },
          { title: '重複加入', body: '同一個項目已在名單上時不會重複加入（下拉選單裡顯示 Added）。' },
        ]} />
        <SpecTable head={['收件人類型', '表格 Audience 欄', '詳情面板的收件人列表']} nowrap={[0]} rows={[
          ['個人', '人員顯示：大頭照、英文名 中文名', '大頭照、英文名 中文名；下一行：組織代號 · NT · 工號'],
          ['組織', '大樓圖示（灰色圓底）、組織代號', '同左；下一行：組織代碼'],
          ['群組', '兩個人圖示（灰色圓底）、群組名稱', '同左；下一行：Audience group'],
          ['外部 Email', '信封圖示（灰色圓底）、Email', '同左；下一行：External email · Email only'],
          ['外部電話', '電話圖示（灰色圓底）、號碼', '同左；下一行：External phone · SMS only'],
        ]} />
        <Big name="s1-types" title="各類型收件人在表格中的呈現" sub="個人、組織、群組、外部電話、外部 Email 各一筆" />
        <Gallery items={[['s1-empty', '空白'], ['s1-search', '搜尋收件人']]} />
      </Section>

      <Section eyebrow="Step 1" title="通道" lead="區塊標題 Channels。三張卡片可以複選。">
        <SpecTable head={['卡片', '說明文字']} nowrap={[0]} rows={[
          [<Copy en="Device Notifications" zh="Device Notifications" />, <Copy en="Push to the app on company phones." zh="推播到公務手機的 App。" />],
          [<Copy en="Desktop OS" zh="Desktop OS" />, <Copy en="Pop-up on company Windows PCs." zh="公司 Windows 電腦的彈出通知。" />],
          [<Copy en="Email" zh="Email" />, <Copy en="Company mailbox, with formatting and files." zh="公司信箱，可加格式與附件。" />],
        ]} />
        <Notes items={[
          { title: '卡片', body: '整張可點；勾選時藍框、淡藍底，右上角是勾選框。卡片內只有名稱與說明，沒有其他提示。' },
          { title: '收不到的人', body: <>有人所有勾選的通道都收不到時，通道下方一行：警示三角形圖示加紅字 <Copy en="n people can’t get the message" zh="n 人收不到訊息" />，後面接藍色連結 <Copy en="See who" zh="查看是誰" />，點了開名單。都收得到時不顯示。</> },
          { title: '收不到的人不擋 Next', body: '批次匯入、群組裡難免有人收不到某些通道，所以「有人收不到」「外部人員沒勾對應通道」只是即時提醒，不算錯誤，也不會停在這一步；使用者可以點 See who 看是誰，決定要不要調整通道。會擋 Next 的只有：沒有收件人、超過 500 人、沒有通道、緊急送出沒填原因。' },
          { title: '通道的連動', body: 'SMS 備援只能跟 Device Notifications 一起：勾 SMS 備援會自動勾上 Device Notifications；取消 Device Notifications 會連 SMS 備援一起取消。至少要勾一個通道（只勾 SMS 備援不算）。' },
          { title: '需要主管核准', body: <>外部收件人的對應通道有勾（外部電話看 SMS 備援，外部 Email 看 Email）時，通道下方出現黃色提示框 <Copy en="Includes n external audiences. Your supervisor, <主管>, must approve." zh="包含 n 位外部收件人，需要主管 <主管> 核准。" />。</> },
        ]} />
        <Gallery items={[['s1-unreach', '有人收不到', '只勾 Desktop OS 時'], ['dlg-unreach', '收不到的人']]} />
      </Section>

      <Section eyebrow="Step 1" title="SMS 備援與緊急送出" lead="勾了 Device Notifications 才出現。">
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['SMS 備援', <>勾選框 <Copy en="Device Notifications (SMS)" zh="Device Notifications（SMS）" />，旁邊標籤 Need approval；說明 <Copy en="Send an SMS to anyone the push doesn’t reach." zh="推播沒送到的人，改發 SMS。" /></>],
          ['核准提示框', <>勾了 SMS 備援後出現。標題 <Copy en="The SMS needs approval before it’s sent" zh="SMS 核准後才會送出" />；勾了緊急後改為 <Copy en="SMS approval will be skipped" zh="將略過 SMS 核准" /></>],
          ['緊急送出', <>勾選框 <Copy en="It’s urgent: send without waiting for SMS approval" zh="這是緊急訊息，不等 SMS 核准直接傳送" />；說明 <Copy en="Only for urgent, important messages. This request will be kept on record." zh="僅限緊急且重要的訊息，此次申請將會留存紀錄。" /></>],
          ['Reason', <>勾了緊急才出現，必填，上限 200 字，提示文字 <C>e.g. Typhoon warning issued at 07:30; staff must know before commuting.</C> 填的原因會顯示在訊息詳情面板的 Urgent reason。</>],
          ['有外部收件人', <>緊急送出仍要主管核准，框內顯示 <Copy en="Your supervisor still has to approve it, because it goes outside the company." zh="因為有外部收件人，仍需要主管核准。" /></>],
          ['SMS 寄到哪支手機', '由系統決定，寄件人不用選：有公務手機寄公務手機，沒有才寄私人手機。'],
          ['沒有電話的人', <>提示 <Copy en="<名字> has no phone number and won’t get SMS." zh="<名字> 沒有電話，收不到 SMS。" /></>],
        ]} />
        <Gallery items={[['s1-sms', '勾了 SMS 備援'], ['s1-urgent', '勾了緊急送出', '原因必填']]} />
      </Section>

      <Section eyebrow="Step 1" title="驗證" lead="按 Next 時檢查。">
        <SpecTable head={['情況', '錯誤訊息', '位置']} nowrap={[0]} rows={[
          ['沒有收件人', <Copy en="Add at least one audience." zh="請加入至少一位收件人。" />, '收件人表格下方（紅字加警示三角形；搜尋框不變紅）'],
          ['超過 500 人', <Copy en="n over the limit. Remove some, or split into separate messages." zh="超過上限 n 人。請移除部分收件人，或分成多則訊息。" />, '收件人表格下方；右上角人數變紅'],
          ['沒有通道', <Copy en="Pick at least one channel." zh="請選擇至少一個通道。" />, '通道下方'],
          ['有外部 Email 但沒勾 Email（已選其他通道時，併入「n people can’t get the message」那一行，不另外出現；只提醒，不擋 Next）', <Copy en="n external emails can only get Email. Turn on Email or remove them." zh="n 個外部 Email 只能收 Email。請開啟 Email 或移除。" />, '通道下方'],
          ['有外部電話但沒勾 SMS 備援（已選其他通道時，併入「n people can’t get the message」那一行，不另外出現；只提醒，不擋 Next）', <Copy en="n external phones can only get SMS. Turn on SMS fallback or remove them." zh="n 支外部電話只能收 SMS。請開啟 SMS 備援或移除。" />, '通道下方'],
          ['緊急送出沒填原因', REQ, 'Reason 欄位下方'],
        ]} />
        <Big name="s1-error" title="沒有收件人與通道" />
      </Section>

      <Section eyebrow="Step 1" title="紅字與提醒一覽" lead="步驟 1 裡所有會出現紅字、黃色提示的情況。紅字都是警示三角形加紅色文字；提示框的顏色看風險：黃色要使用者留意，灰色只是告知。">
        <SpecTable head={['情況', '顯示', '樣式', '位置', '什麼時候出現', '擋 Next 嗎']} nowrap={[0]} rows={[
          ['沒有收件人', <Copy en="Add at least one audience." zh="請加入至少一位收件人。" />, '紅字', '收件人表格下方；搜尋框不變紅', '按過 Next 之後', '擋'],
          ['超過 500 人', <Copy en="n over the limit. Remove some, or split into separate messages." zh="超過上限 n 人。請移除部分收件人，或分成多則訊息。" />, '紅字；右上角 n / 500 變紅；搜尋框不變紅', '收件人表格下方', '一超過就出現', '擋'],
          ['搜尋輸入的格式不對、找不到', '見「搜尋類型」表', '紅字；搜尋框變紅框', '搜尋框下方，或下拉選單裡', '輸入後立刻', '不擋；只是這一筆加不進去'],
          ['沒有通道', <Copy en="Pick at least one channel." zh="請選擇至少一個通道。" />, '紅字', '通道下方', '按過 Next 之後', '擋'],
          ['外部 Email 沒勾 Email、外部電話沒勾 SMS 備援', <Copy en="n external emails can only get Email. Turn on Email or remove them." zh="n 個外部 Email 只能收 Email。請開啟 Email 或移除。" />, '紅字', '通道下方', '只在一個通道都沒勾時單獨出現（不用等 Next）；已選其他通道時併入下一列', '不擋（沒選通道本身會擋）'],
          ['有人所有通道都收不到', <><Copy en="n people can’t get the message" zh="n 人收不到訊息" />＋藍色連結 See who</>, '紅字加藍色連結', '通道下方', '有收件人、有選通道，而且有人收不到時，隨勾選即時更新；都收得到就消失', '不擋'],
          ['緊急送出沒填原因、超過 200 字', <><Copy en="This field is required." zh="此欄位為必填。" />　<Copy en="Up to 200 characters." zh="最多 200 字。" /></>, '欄位下方紅字；輸入框紅框；字數變紅', 'Reason 欄位', '必填：按過 Next 之後；超過 200 字：立刻', '擋'],
          ['有外部收件人，而且他們需要的通道有勾', <Copy en="Includes n external audiences. Your supervisor, <主管>, must approve." zh="包含 n 位外部收件人，需要主管 <主管> 核准。" />, '黃色提示框', '通道下方', '即時；外部電話看 SMS 備援，外部 Email 看 Email', '不擋'],
          ['緊急送出，但有外部收件人', <Copy en="Your supervisor still has to approve it, because it goes outside the company." zh="因為有外部收件人，仍需要主管核准。" />, '灰色提示框', 'SMS 備援的核准提示框裡', '勾了緊急而且有外部收件人時', '不擋'],
          ['勾了 SMS 備援，但有人沒有電話', <Copy en="<名字> has no phone number and won’t get SMS." zh="<名字> 沒有電話，收不到 SMS。" />, '灰色提示框', '收件人表格下方', '即時', '不擋'],
        ]} />
        <Big name="s1-ext" title="有外部收件人時的黃色提示框" sub="外部 Email 與外部電話，通道都有勾" />
      </Section>
    </>
  )
}

// ---------- step 2 ----------
function Step2() {
  return (
    <>
      <Section eyebrow="Step 2" title="Message details" lead={<>標題 Message details，說明 <Copy en="Compose the message title and body to be sent to your audience." zh="撰寫要傳送給收件人的訊息標題和內容。" /></>}>
        <Big name="s2-filled" title="填好的內容" sub="Device Notifications、SMS、Email" />
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['New / Use template', '兩個選項。選 Use template 後，右側的模板選單可用（可搜尋）。選了模板會先確認是否取代目前的內容。'],
          ['通道區塊', '每個勾選的通道一個區塊，順序：Device Notifications、SMS、Desktop OS、Email。區塊上方有分隔線；區塊標題中等粗細。'],
        ]} />
        <SpecTable head={['區塊', '欄位', '必填', '上限', '說明與錯誤']} nowrap={[0, 1, 2, 3]} rows={[
          ['Device Notifications', 'Sender', '是', '26', <><Copy en="Recipients will see this name as the notification source. Only applies to Device Notifications App (PNS)." zh="收件人會看到這個名稱作為通知來源。只適用於 Device Notifications App（PNS）。" />{REQ}<Copy en="Please use half-width English letters, numbers, and spaces only." zh="請只使用半形英文字母、數字和空格。" /></>],
          ['', 'Content', '是', '534', <>列表上的標題取內容的第一行。{REQ}</>],
          ['SMS', 'SMS text', '是', '534', <>區塊說明 <Copy en="Sent as a backup via SMS only if the push notification fails to send." zh="只有推播傳送失敗時，才會用 SMS 補送。" />提示 <Copy en="Links won’t open in SMS." zh="SMS 裡的連結無法開啟。" />{REQ}</>],
          ['Desktop OS', 'Sender', '否', '26', '錯誤同 Device Notifications 的 Sender。'],
          ['', 'Title', '是', '20', REQ],
          ['', 'Content', '是', '70', <><Copy en="Supports Chinese, English, and numbers only." zh="僅支援中文、英文、數字。" />{REQ}</>],
          ['Email', 'Subject', '是', '70', REQ],
          ['', 'Content', '是', '—', <>文字編輯器（粗體、斜體、底線、連結、清單、清除格式）。提示 <Copy en="Supports text, tables, and images." zh="支援文字、表格、圖片。" />整體超過 100 KB：<Copy en="Message content exceeds the 100 KB limit. Please reduce content size or remove/compress embedded images." zh="訊息內容超過 100 KB 上限。請減少內容，或移除、壓縮內嵌圖片。" />{REQ}</>],
        ]} />
        <Notes items={[
          { title: '提示文字', body: <>第二步的文字欄位都沒有提示文字（placeholder），欄位標題已經說明要填什麼。只有模板選單有：<Copy en="Choose a template" zh="選擇模板" />，搜不到時顯示 <Copy en="No matching templates" zh="找不到符合的模板" />。</> },
          { title: '字數', body: '字數 n / 上限在欄位下方右側，跟說明文字或錯誤訊息同一列；超過時數字變紅，錯誤 Up to n characters.' },
          { title: '必填', body: <>沒填一律顯示 {REQ}</> },
        ]} />
        <Gallery items={[['s2-empty', '空白'], ['s2-error', '沒填就按 Next']]} />
      </Section>
      <Section eyebrow="Step 2" title="模板與預填">
        <SpecTable head={['情況', '行為', 'Toast']} nowrap={[0]} rows={[
          ['選 Use template', '右側模板選單可用，列出這個空間的模板：名稱，下方一行是它含的通道（例如 Device Notifications · Email）。', '—'],
          ['選模板，而且目前沒填任何內容（或選的是已套用的同一個）', '直接套用。', <Copy en="Template applied" zh="已套用模板" />],
          ['選模板，但已經填了內容', <>先問 Replace your text?：Replace 才套用，Cancel 保持原樣。</>, <><Copy en="Template applied" zh="已套用模板" />（按 Replace 後）</>],
          ['套用模板', '寄件人、通知標題與內容、SMS 文字、Email 主旨與內文換成模板的；收件人、通道、排程不變。', '—'],
          ['選回 New', '模板選項清掉，已填的內容保留。', <Copy en="Template removed. Your text stays." zh="已取消模板，內容保留。" />],
          ['模板沒有通知內容', '勾了 Device Notifications 或 Desktop OS 時，區塊最上方一則灰色提示框：這個模板沒有通知內容。', '—'],
          ['Save as template', '內容有錯時不開對話框，改顯示錯誤並出現 toast；沒有錯才開 Save as template 對話框，存好後模板出現在這個空間的模板清單。', <><Copy en="Finish the message first" zh="請先完成訊息內容" />（有錯時，紅色）、<Copy en="Template saved" zh="已存成模板" /></>],
          ['只勾 Email', '沒勾 Device Notifications 與 Desktop OS、Email 還是空的，而通知欄位已經填了：用通知的標題與內容預填 Email 主旨與內文。', '—'],
        ]} />
      </Section>
      <Section eyebrow="Step 2" title="紅字出現的時機">
        <SpecTable head={['情況', '紅字內容', '什麼時候出現', '擋 Next 嗎']} nowrap={[0]} rows={[
          ['必填欄位沒填', <Copy en="This field is required." zh="此欄位為必填。" />, '按過 Next 後；按 Send me a test、Save as template 時內容有錯也算', '擋'],
          ['超過字數上限', <Copy en="Up to n characters." zh="最多 n 字。" />, '即時', '擋'],
          ['Sender 有不允許的字元', <Copy en="Please use half-width English letters, numbers, and spaces only." zh="請只使用半形英文字母、數字和空格。" />, '即時', '擋'],
          ['Email Content 超過 100 KB', <Copy en="Message content exceeds the 100 KB limit…" zh="訊息內容超過 100 KB 上限…" />, '即時', '擋'],
          ['Send me a test、Save as template 時內容有錯', <><Copy en="Finish the message first" zh="請先完成訊息內容" />（紅色 toast）</>, '按下按鈕當下', '—'],
        ]} />
      </Section>
    </>
  )
}

// ---------- step 3 ----------
function Step3() {
  return (
    <>
      <Section eyebrow="Step 3" title="Schedule & preview" lead={<>頁面說明 <Copy en="Choose when to send and review all settings before submission." zh="選擇傳送時間，並在送出前確認所有設定。" /></>}>
        <Big name="s3-now" title="立即傳送（預設）" />
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['Schedule', <>區塊說明 Taipei time (GMT+8)。兩張選項卡片：<Copy en="Send now" zh="立即傳送" />、<Copy en="Scheduled send" zh="排程傳送" />（說明 <Copy en="Up to 3 months ahead" zh="3 個月內任一時間" />）。</>],
          ['Date and time', '選 Scheduled send 才出現；預設隔天 09:00。欄位下方提示 Sends <日期時間>；需要核准時加 if approved by then。'],
          ['Review', <>一個 Preview 框：右上角切換通道（Device Notifications、SMS、Desktop OS、Email）；標題下方 <Copy en="Audience: n people" zh="收件人：n 人" />，是這個通道的人數；下方是預覽。</>],
          ['警告', <>有人所有通道都收不到時，Preview 上方一列 <Copy en="n people can’t get the message" zh="n 人收不到訊息" /></>],
        ]} />
        <Gallery items={[['s3-schedule', '排程傳送'], ['s3-error', '日期錯誤'], ['s3-preview-email', '預覽 Email']]} />
        <Notes items={[
          { title: '排程錯誤', body: <>選到過去或超過 3 個月：<Copy en="Please select a date between now and next 3 months." zh="請選擇現在到未來 3 個月內的日期。" /></> },
          { title: '預覽', body: 'Device Notifications 的預覽只有寄件人與內容（沒有標題欄位）；Email 預覽主旨與內文。只有一個通道時不顯示切換，只顯示通道名稱。' },
          { title: '各通道的收件人數', body: 'Device Notifications：有裝置的人。SMS：可以寄 SMS 的人加外部電話。Desktop OS：有桌面程式的人。Email：所有人加外部 Email。' },
          { title: '排程時間', body: '選 Scheduled send 時預設明天 09:00；改回 Send now 欄位隱藏，再選回來保留上次選的時間。時間填錯的錯誤，填了值就顯示，不用等按 Create message。' },
          { title: 'Send me a test', body: '只檢查步驟 2 的內容。有錯時不寄，標記步驟 2 的錯誤並出現紅色 toast；沒錯就寄給自己。' },
        ]} />
      </Section>
      <Section eyebrow="Step 3" title="紅字出現的時機">
        <SpecTable head={['情況', '紅字內容', '什麼時候出現', '擋 Create message 嗎']} nowrap={[0]} rows={[
          ['排程時間沒填', <Copy en="This field is required." zh="此欄位為必填。" />, '按 Create message 被帶回這一步後', '擋'],
          ['排程時間在過去或超過 3 個月', <Copy en="Please select a date between now and next 3 months." zh="請選擇現在到未來 3 個月內的日期。" />, '即時（選了時間就檢查）', '擋'],
        ]} />
        <Notes items={[
          { title: '不是紅字的提醒', body: 'Review 裡的「n people can’t get the message」是黃色警示色，不是錯誤，不擋送出。' },
          { title: '按 Create message 時', body: '步驟 1 到 3 依序檢查，停在第一個有錯的步驟；那一步當作已經按過 Next，該步驟所有紅字一起出現並捲到第一個錯誤。' },
        ]} />
      </Section>
    </>
  )
}

// ---------- dialogs ----------
function Dialogs() {
  return (
    <>
      <Section eyebrow="Overview" title="對話框一覽" lead="都使用設計系統 Dialog：標題、內容、右下角按鈕（Cancel 在左、主要動作在右），按鈕不放圖示，不放副標。">
        <SpecTable head={['對話框', '開啟方式', '寬度', '主要動作']} nowrap={[0]} rows={[
          ['Batch import', '步驟 1 Batch import', '720', 'Find matches → Add n audiences'],
          ['n people can’t get the message', '步驟 1 通道下方 See who', '720', '無（Close）'],
          ['Save as group', '步驟 1 頁尾', '560', 'Save'],
          ['Save as template', '步驟 2 頁尾', '560', 'Save'],
          ['Replace your text?', '步驟 2 選模板', '480', 'Replace'],
          ['Send without SMS approval?', '步驟 3 緊急送出時 Create message', '480', 'Skip approval and send（紅色）'],
          ['Leave without sending?', '任何步驟 Cancel', '480', 'Discard（紅色）'],
          ['Remove all audiences?', '步驟 1 Remove all', '480', 'Remove all（紅色）'],
        ]} />
      </Section>
      <Section eyebrow="Import" title="Batch import" lead="兩個階段：輸入名單 → 比對結果。">
        <Gallery items={[['dlg-import', '輸入名單', '先選資料類型'], ['dlg-import-list', '貼上名單'], ['dlg-import-result', '比對結果']]} />
        <SpecTable head={['項目', '規格']} nowrap={[0]} rows={[
          ['Data type', '必填，名單裡每一筆都要是這個類型：NT account、Employee ID、Name、Email、Phone、MVPN、Org code。'],
          ['List', <>多行輸入，提示 <Copy en="Separate with commas or new lines." zh="用逗號或換行分隔。" />右上角顯示筆數。下方 Upload .csv or .txt 與 Try a sample。</>],
          ['比對結果', '數量標籤：n ready（綠）、n to choose（黃）、n not found（紅）、n already added（灰）。下方分組：Who do you mean?（同名，勾選）、Ready to add、Not found。'],
          ['按鈕', '輸入階段：Cancel、Find matches；結果階段：Edit list（回到輸入）、Add n audiences（沒有可加入的時是 Nothing to add；只剩找不到的時是 Fix entries not found）。'],
        ]} />
      </Section>
      <Section eyebrow="Step 1" title="收件人相關">
        <Gallery items={[['dlg-unreach', 'n people can’t get the message', '每人一列：頭像、姓名、組織代號 · NT · 工號，右側原因；只有 Close'], ['dlg-save-group', 'Save as group', 'Group name 必填 50 字、Description 200 字']]} />
      </Section>
      <Section eyebrow="Confirm" title="確認對話框">
        <Gallery items={[['dlg-save-tpl', 'Save as template'], ['dlg-urgent', 'Send without SMS approval?'], ['dlg-leave', 'Leave without sending?']]} max={520} />
        <SpecTable head={['對話框', '說明', '按鈕']} nowrap={[0]} rows={[
          ['Leave without sending?', <Copy en="What you’ve written won’t be kept." zh="你填寫的內容不會保留。" />, 'Cancel、Discard（紅色）'],
          ['Replace your text?', <Copy en="“<模板>” will replace what you’ve written. Audiences and channels stay the same." zh="「<模板>」會取代你寫的內容，收件人和通道不變。" />, 'Cancel、Replace'],
          ['Send without SMS approval?', <Copy en="Only for urgent, important messages. This request will be kept on record." zh="僅限緊急且重要的訊息，此次申請將會留存紀錄。" />, 'Cancel、Skip approval and send（紅色）。說明下方三列：Reason（填的原因）、Logged as（姓名與時間）、Notified（SMS 審核人員和主管）'],
          ['Remove all audiences?', <Copy en="Channels and text stay the same." zh="通道和內容不受影響。" />, 'Cancel、Remove all（紅色）'],
        ]} />
      </Section>
      <Section eyebrow="Errors" title="對話框裡的紅字出現的時機">
        <SpecTable head={['對話框', '情況', '紅字內容', '什麼時候出現', '擋什麼']} nowrap={[0]} rows={[
          ['Save as group、Save as template', '名稱沒填', <Copy en="Enter a name." zh="請輸入名稱。" />, '按 Save 後', '擋 Save'],
          ['Save as group、Save as template', '名稱超過 50 字、與這個空間已有的重名', <><Copy en="Up to 50 characters." zh="最多 50 字。" />　<Copy en="This name is taken." zh="這個名稱已經有人用了。" /></>, '即時', '擋 Save'],
          ['Batch import', '有找不到的項目', '紅色標籤 n not found，下方列出每筆的原因', '按 Find matches 後', '不擋；找得到的照樣可以加入'],
          ['Batch import', '上傳的檔案讀不到', <Copy en="Can’t read that file. Use .csv or .txt." zh="無法讀取檔案，請用 .csv 或 .txt。" />, '上傳當下（紅色 toast）', '—'],
        ]} />
      </Section>
    </>
  )
}

// ---------- after ----------
function After() {
  return (
    <Section eyebrow="After" title="送出之後" lead="按 Create message 後回到訊息列表，以 toast 顯示結果；新訊息的紀錄排在列表最上方。">
      <SpecTable head={['情況', 'Toast', '列表上的狀態']} nowrap={[0, 1]} rows={[
        ['立即傳送，不需核准（含緊急送出）', <Copy en="Sending to n audiences" zh="傳送給 n 位收件人" />, <StatusTag s="progress" />],
        ['排程傳送，不需核准', <Copy en="Scheduled for <時間>" zh="已排程：<時間>" />, <StatusTag s="scheduled" />],
        ['需要核准（SMS 備援或外部收件人）', <Copy en="Sent for approval" zh="已送出審核" />, <StatusTag s="pending" />],
      ]} />
      <SpecTable head={['核准規則', '誰核准', '可以略過嗎']} nowrap={[0]} rows={[
        ['勾了 SMS 備援', 'SMS 審核人員', '可以：勾 It’s urgent 並填原因，送出前要通過 Send without SMS approval? 確認'],
        ['有外部收件人（對應通道有勾）', '你的主管', '不行；緊急送出也一樣'],
        ['兩者都有', '兩邊都需要', '緊急送出只略過 SMS 審核人員，主管仍要核准'],
      ]} />
      <Section eyebrow="Toast" title="整個流程的 Toast">
        <SpecTable head={['時機', 'Toast']} nowrap={[0]} rows={[
          ['Batch import 加入收件人', <Copy en="Added n audiences" zh="已加入 n 位收件人" />],
          ['套用模板', <Copy en="Template applied" zh="已套用模板" />],
          ['選回 New 取消模板', <Copy en="Template removed. Your text stays." zh="已取消模板，內容保留。" />],
          ['存成模板', <Copy en="Template saved" zh="已存成模板" />],
          ['存成群組', <Copy en="Group saved" zh="已存成群組" />],
          ['Send me a test 成功', <Copy en="Test sent" zh="已寄出測試" />],
          ['Send me a test、Save as template 時內容有錯（紅色）', <Copy en="Finish the message first" zh="請先完成訊息內容" />],
          ['Batch import 上傳的檔案讀不到（紅色）', <Copy en="Can’t read that file. Use .csv or .txt." zh="無法讀取檔案，請用 .csv 或 .txt。" />],
          ['Edit content 儲存', <Copy en="Content saved" zh="已儲存內容" />],
        ]} />
      </Section>
      <Notes items={[{ title: 'Toast', body: '顯示在畫面下方置中（設計系統 Toaster，position 設為 bottom-center）；一行文字，前面不放圖示；右側有關閉鈕。' }]} />
      <Big name="after-submit" title="回到列表" sub="緊急送出：In progress" />
    </Section>
  )
}

// ---------- errors ----------
function Errors() {
  return (
    <Section eyebrow="Errors" title="錯誤訊息總表" lead="錯誤都顯示在欄位或區塊下方（紅字），欄位變紅框；按 Next 或 Create message 時檢查，之後邊改邊更新。">
      <SpecTable head={['步驟', '欄位或情況', '錯誤訊息']} nowrap={[0, 1]} rows={[
        ['1', '沒有收件人', <Copy en="Add at least one audience." zh="請加入至少一位收件人。" />],
        ['1', '超過 500 人', <Copy en="n over the limit. Remove some, or split into separate messages." zh="超過上限 n 人。請移除部分收件人，或分成多則訊息。" />],
        ['1', '沒有通道', <Copy en="Pick at least one channel." zh="請選擇至少一個通道。" />],
        ['1', '外部 Email 沒有 Email 通道（只在沒選任何通道時單獨出現；不擋 Next）', <Copy en="n external emails can only get Email. Turn on Email or remove them." zh="n 個外部 Email 只能收 Email。請開啟 Email 或移除。" />],
        ['1', '外部電話沒有 SMS 備援（只在沒選任何通道時單獨出現；不擋 Next）', <Copy en="n external phones can only get SMS. Turn on SMS fallback or remove them." zh="n 支外部電話只能收 SMS。請開啟 SMS 備援或移除。" />],
        ['1', '緊急原因', <>{REQ}超過 200 字：Up to 200 characters.</>],
        ['2', '所有必填欄位', REQ],
        ['2', '所有有上限的欄位', <Copy en="Up to n characters." zh="最多 n 字。" />],
        ['2', 'Sender（Device Notifications、Desktop OS）', <Copy en="Please use half-width English letters, numbers, and spaces only." zh="請只使用半形英文字母、數字和空格。" />],
        ['2', 'Email Content 超過 100 KB', <Copy en="Message content exceeds the 100 KB limit. Please reduce content size or remove/compress embedded images." zh="訊息內容超過 100 KB 上限。請減少內容，或移除、壓縮內嵌圖片。" />],
        ['3', '排程時間沒填', REQ],
        ['3', '排程時間在過去或超過 3 個月', <Copy en="Please select a date between now and next 3 months." zh="請選擇現在到未來 3 個月內的日期。" />],
        ['1', '搜尋 Phone、Email、MVPN 的格式', '見步驟 1「搜尋類型」表'],
        ['對話框', 'Save as group、Save as template 的名稱', <><Copy en="Enter a name." zh="請輸入名稱。" />　<Copy en="Up to 50 characters." zh="最多 50 字。" />　<Copy en="This name is taken." zh="這個名稱已經有人用了。" /></>],
      ]} />
    </Section>
  )
}
