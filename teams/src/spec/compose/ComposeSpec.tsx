// Design spec for sending a message (everything after "+ New message"): one page, a tab per part of the flow,
// routed on the URL hash. Screens are screenshots of the teams prototype with measured pins.
import * as React from 'react'
import { Tabs, TabsList, TabsTrigger, Tag } from '@qijenchen/design-system'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { ChIcons, StatusTag } from '../../components/ui'
import { C, Copy, Figure, Notes, Section, Shot, SpecTable } from '../parts'

const PROTO = 'https://claude.ai/artifact/3wDkTsa8LZcfDikRr1RhWv'
const LOG_SPEC = 'https://claude.ai/artifact/DJqKQRYHc7zduwfKU9T3FW'
const TABS = [
  ['overview', '總覽與流程'], ['audiences', '1 · 收件人'], ['channels', '1 · 通道與核准'], ['message', '2 · 訊息內容'],
  ['review', '3 · 確認送出'], ['after', '送出之後'], ['dialogs', '對話框'], ['rules', '驗證與字數'], ['edge', '邊界情境'],
] as const
type TabKey = typeof TABS[number][0]
const isTab = (h: string): h is TabKey => TABS.some(t => t[0] === h)

export default function ComposeSpec() {
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
            <span className="spec-eyebrow">MNP · New message</span>
            <h1 className="spec-h1">發送訊息設計規格</h1>
            <span className="text-caption text-fg-secondary">
              2026/11/05 · 團隊版 · 畫面取自 <a className="text-primary hover:underline" href={PROTO} target="_blank" rel="noreferrer">MNP Teams prototype</a>（需密碼）· 送出後的列表與詳情見 <a className="text-primary hover:underline" href={LOG_SPEC} target="_blank" rel="noreferrer">訊息紀錄設計規格</a>
            </span>
          </div>
          <Tabs value={tab} onValueChange={v => go(v as TabKey)}>
            <TabsList overflow="scroll">{TABS.map(([k, t]) => <TabsTrigger key={k} value={k}>{t}</TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
      </div>
      <main className="spec-wrap spec-main" key={tab}>
        {tab === 'overview' ? <Overview go={go} /> : null}
        {tab === 'audiences' ? <AudiencesTab /> : null}
        {tab === 'channels' ? <ChannelsTab /> : null}
        {tab === 'message' ? <MessageTab /> : null}
        {tab === 'review' ? <ReviewTab /> : null}
        {tab === 'after' ? <AfterTab /> : null}
        {tab === 'dialogs' ? <DialogsTab /> : null}
        {tab === 'rules' ? <RulesTab /> : null}
        {tab === 'edge' ? <EdgeTab /> : null}
      </main>
    </>
  )
}

const Step = ({ children }: { children: React.ReactNode }) => <span className="step">{children}</span>
const Act = ({ children }: { children: React.ReactNode }) => <span className="act">{children}</span>

// ---------- overview ----------
function Overview({ go }: { go: (k: TabKey) => void }) {
  return (
    <>
      <Section eyebrow="Flow" title="完整流程" lead="點「+ New message」後是三個步驟，每一步只處理一件事；最後依「要不要核准」和「什麼時候送」走到四種結果之一。">
        <div className="spec-flow2">
          <div className="line"><Step>訊息列表 · <b>+ New message</b></Step>→<Step>1 · Audiences &amp; channels</Step><Act>選收件人、選通道、需要時設定 SMS 號碼與緊急發送</Act>→<Step>2 · Message</Step><Act>選新訊息或模板，填各通道內容</Act>→<Step>3 · Review &amp; send</Step><Act>選傳送時間、看預覽、可寄測試</Act>→<Step><b>Create message</b></Step></div>
          <div className="line"><Act>不需核准、立即傳送</Act>→<Step>回到列表 · <StatusTag s="progress" /></Step><Act>toast「Sending to N audiences」</Act></div>
          <div className="line"><Act>不需核准、排程傳送</Act>→<Step>回到列表 · <StatusTag s="scheduled" /></Step><Act>toast「Scheduled for &lt;時間&gt;」</Act></div>
          <div className="line"><Act>需要 ICSD 或主管核准</Act>→<Step>「Sent for approval」結果頁</Step>→<Step>列表 · <StatusTag s="pending" /></Step></div>
          <div className="line"><Act>勾選緊急略過 ICSD</Act>→<Step>確認對話框「Send without ICSD approval?」</Step>→<Act>沒有外部收件人：直接送出；有外部收件人：仍走主管核准</Act></div>
        </div>
        <div className="spec-cards">
          {([['audiences', '1 · 收件人', '加人、群組、組織、外部聯絡人，批次匯入，查看群組成員'], ['channels', '1 · 通道與核准', '三個通道、SMS 備援、ICSD 與主管核准、緊急發送、觸及人數'], ['message', '2 · 訊息內容', '新訊息或模板，四種內容區塊，存成模板'], ['review', '3 · 確認送出', '傳送時間、確認內容、各通道預覽、寄測試'], ['after', '送出之後', '結果頁、toast、訊息在列表的狀態'], ['rules', '驗證與字數', '每個欄位的必填、上限與錯誤文案']] as [TabKey, string, string][]).map(([k, t, d]) => (
            <button key={k} type="button" className="spec-card" onClick={() => go(k)}><b>{t}</b><span>{d}</span></button>
          ))}
        </div>
      </Section>

      <Section eyebrow="Frame" title="頁面框架" lead="三個步驟共用同一個框架：頁首、步驟列、內容、固定在底部的按鈕列。內容最寬 1120px，置中。">
        <Figure label="步驟 1（空白）" sub="個人發送空間 · 1680 × 1000" shot="s1-empty" notes={[
          { n: 1, title: '頁首麵包屑', body: <>頁面最上方就是頁首（沒有全站頂部列）：「發送空間名稱 › New message」。點空間名稱等於取消，會先確認要不要離開。需要核准時，右側出現核准標籤（見「通道與核准」）。</> },
          { n: 2, title: '步驟列', body: <>DS <C>Steps</C> horizontal。目前步驟是實心數字；完成的步驟打勾。可以點已完成的步驟回去，也可以點下一步（等同按 Next）；跳到更後面要先通過前面的檢查。手機寬度改成「圓形數字＋步驟名稱＋第 N 步，共 3 步」。</> },
          { n: 3, title: '收件人類型', body: '見「收件人」。' },
          { n: 4, title: '搜尋輸入框', body: '見「收件人」。' },
          { n: 5, title: '批次匯入', body: '見「收件人」與「對話框」。' },
          { n: 6, title: '人數上限', body: <>「目前人數 / 500」。超過時變紅字並 medium。</> },
          { n: 7, title: '還沒有收件人', body: <>DS <C>Empty</C>：「No audiences yet · Search above, or use Batch import.」</> },
          { n: 8, title: '通道', body: '見「通道與核准」。' },
          { n: 9, title: '底部左側：本步驟的附加動作', body: <>步驟 1「Save as group」（沒有收件人時停用）、步驟 2「Save as template」、步驟 3「Send me a test」。都是 <C>Button tertiary</C>。</> },
          { n: 10, title: '底部右側：前進後退', body: <>「Cancel」（text）、「Back」（tertiary，步驟 2、3 才有）、主要按鈕：步驟 1、2 是「Next」，步驟 3 是「Create message」。按鈕列 sticky 在畫面底部。</> },
        ]} />
      </Section>

      <Section eyebrow="Modes" title="四種進入方式" lead="同一個流程，依進入的地方帶入不同內容。">
        <SpecTable head={['模式', '從哪裡進來', '麵包屑標題', '帶入的內容', '建立後']} nowrap={[0]} rows={[
          ['新訊息', '頁首「+ New message」', <Copy en="New message" zh="新訊息" />, '空白', '新增一則訊息'],
          ['編輯', <>列選單「Edit」（<StatusTag s="scheduled" />）或「Edit and resubmit」（<StatusTag s="rejected" />）</>, <Copy en="Edit message" zh="編輯訊息" />, '原本的收件人、通道、內容、模板；排程時間帶入「Scheduled send」', '覆蓋原本那則訊息'],
          ['複製', '列選單「Duplicate to new message」', <Copy en="Duplicate message" zh="複製訊息" />, '收件人、通道、內容、模板（不含傳送時間）', '新增一則訊息'],
          ['重寄', '傳送失敗名單「Resend to N」', <Copy en="Resend to missed audiences" zh="重寄給未送達的人" />, '收件人換成失敗的人，其餘同複製', '新增一則訊息'],
        ]} />
        <Notes items={[{ title: '帶入內容時', body: '三個步驟都可以直接點（已完成）。訊息屬於目前所在的發送空間。' }]} />
      </Section>

      <Section eyebrow="Leave" title="離開流程" lead="按「Cancel」或點麵包屑的空間名稱。">
        <div className="spec-row side">
          <div className="spec-canvas"><Shot name="dlg-leave" max={480} alt="離開確認" /></div>
          <Notes items={[
            { title: '有填過任何東西時才確認', body: <>標題 <Copy en="Leave without sending?" zh="還沒送出，要離開嗎？" />，內文 <Copy en="What you’ve written won’t be kept." zh="你填寫的內容不會保留。" /></> },
            { title: '按鈕', body: <><Copy en="Keep editing" zh="繼續編輯" />、紅色 <Copy en="Discard" zh="捨棄" /></> },
            { title: '沒填過', body: '直接回到列表。' },
          ]} />
        </div>
      </Section>
    </>
  )
}

// ---------- step 1: audiences ----------
function AudiencesTab() {
  return (
    <>
      <Section eyebrow="Step 1" title="收件人" lead="先選類型再搜尋，加入的收件人列在下方表格。最多 500 人（展開群組與組織、去重後）。">
        <div className="spec-gallery wide">
          <figure><figcaption><b>收件人類型</b><span>DS Select，寬 128。切換後輸入框清空、自動聚焦，提示字跟著換。</span></figcaption><div className="spec-canvas"><Shot name="s1-types" alt="類型選單" /></div></figure>
          <figure><figcaption><b>搜尋人員</b><span>輸入就列出符合的人；按 Enter 加入第一筆。</span></figcaption><div className="spec-canvas"><Shot name="s1-search" alt="搜尋人員" /></div></figure>
          <figure><figcaption><b>群組</b><span>還沒輸入時列出「Your groups」（這個空間可用的群組），加入後選單保持打開，可以連續加。</span></figcaption><div className="spec-canvas"><Shot name="s1-group" alt="群組選單" /></div></figure>
        </div>
        <SpecTable head={['類型', '提示字', '比對', '加入後']} nowrap={[0]} rows={[
          [<Copy en="Person" zh="人員" />, <Copy en="Name, NT account or employee ID" zh="姓名、NT 帳號或工號" />, '中英文姓名、NT 帳號、工號；公司 Email 也會找到本人', '一位員工'],
          [<Copy en="Org" zh="組織" />, <Copy en="Org code or name" zh="組織代碼或名稱" />, '組織代碼或名稱', '整個組織的人'],
          [<Copy en="Group" zh="群組" />, <Copy en="Group name" zh="群組名稱" />, '這個發送空間的收件群組', '群組成員'],
          ['Phone 電話', <Copy en="Mobile number, e.g. 0912-345-678" zh="手機號碼，例如 0912-345-678" />, '員工的號碼會加入那位員工；其他號碼是外部電話', '員工或外部電話（只收 SMS）'],
          ['Email', <Copy en="Email address, e.g. name@vendor.com" zh="Email，例如 name@vendor.com" />, '公司信箱加入員工；其他是外部 Email', '員工或外部 Email（只收 Email）'],
          ['MVPN', <Copy en="5-digit MVPN" zh="5 碼 MVPN" />, '5 碼公司短號', '一位員工'],
        ]} />
        <Notes items={[
          { title: '電話與 Email 類型', body: <>輸入框右邊多一顆「Add」按鈕（格式正確才可按）。格式錯誤時，輸入框下方紅字說明。</> },
          { title: '已加入的', body: <>選單裡顯示灰色「Added / 已加入」，不能重複加。</> },
          { title: '找不到', body: <>選單顯示「No match for “…”.」；人員類型另外提示「Contractors? Switch to Phone or Email.」</> },
        ]} />
      </Section>

      <Section eyebrow="Table" title="收件人表格" lead="加入的每個收件人一列。用 DS DataTable，有外框；超過 6 列時固定高度 320 並出現表格上方的篩選框與「全部移除」。">
        <Figure label="加入多種收件人、選好通道" sub="組織、群組、兩位同事、外部 Email、外部電話；Device Notifications＋SMS 備援＋Email" shot="s1-filled" notes={[
          { n: 1, title: '核准標籤', body: '頁首右側，見「通道與核准」。' },
          { n: 2, title: 'Audience 收件人', body: <>320 寬，釘選左側。員工：頭像、中英文名、NT・工號・組織；群組：說明；組織：全名；外部：「Email only」或「SMS only」。</> },
          { n: 3, title: 'People 人數', body: <>100 寬，靠右。群組和組織的人數是藍色連結，打開可搜尋的成員名單（見「對話框」）。</> },
          { n: 4, title: 'Can receive 可收到的通道', body: <>每個通道一個小標籤：圖示＋可收到的人數（群組、組織才顯示數字），滑鼠移上顯示「通道：n / 總數」。沒有人可以收到時刪除線、淡色。</> },
          { n: 5, title: '選擇號碼', body: <>開了 SMS 備援、這位員工有公司和個人兩支手機時，名字旁邊出現「Choose number」。</> },
          { n: 6, title: '號碼提示', body: <>黃色 <C>Banner</C>「1 person has 2 phone numbers. Pick one for SMS.」＋「Choose」。全部選好後變藍色「SMS numbers set for N people.」＋「Review」。</> },
          { title: '7–11 通道、SMS 備援、ICSD 核准、主管核准、觸及人數', body: '見下一個分頁「1 · 通道與核准」。' },
        ]} />
        <SpecTable head={['項目', '規則']} rows={[
          ['移除', <>每列右側釘選的「×」；超過 6 列時上方有紅字「Remove all」，會先確認 <Copy en="Remove all audiences? · Channels and text stay the same." zh="移除所有收件人？ · 通道和內容不受影響。" /></>],
          ['篩選收件人', <>超過 6 列時出現 sm 搜尋框「Filter audiences」，旁邊顯示「符合 / 全部」。</>],
          ['沒有電話的人', <>開了 SMS 時，灰色 <C>Banner</C>「&lt;姓名&gt; has no phone number and won’t get SMS.」；名字旁標籤「No phone」。</>],
          ['超過 500 人', <>人數變紅字，表格下方紅字「N over the limit. Remove some, or split into separate messages.」，不能進下一步。</>],
          ['存成群組', <>底部「Save as group」把目前的員工收件人存成這個空間的收件群組（見「對話框」）。</>],
        ]} />
      </Section>
    </>
  )
}

// ---------- step 1: channels and approval ----------
function ChannelsTab() {
  return (
    <>
      <Section eyebrow="Step 1" title="通道" lead="三張可勾選的通道卡（DS Checkbox 包在 label 卡片裡，整張可點），桌面三欄、窄版一欄。SMS 不是獨立通道，是 Device Notifications 的備援。">
        <SpecTable head={['通道', '說明文字', '誰收得到', '規則']} nowrap={[0]} rows={[
          [<span className="flex items-center gap-2"><ChIcons list={['push']} />Device Notifications</span>, <Copy en="Push to the app on company phones." zh="推播到公司手機的 App。" />, '有註冊裝置的員工', '關掉時 SMS 備援一起關掉'],
          [<span className="flex items-center gap-2"><ChIcons list={['desktop']} />Desktop OS</span>, <Copy en="Pop-up on company Windows PCs." zh="在公司 Windows 電腦跳出通知。" />, '有安裝桌面程式的員工', '—'],
          [<span className="flex items-center gap-2"><ChIcons list={['email']} />Email</span>, <Copy en="Company mailbox, with formatting and files." zh="寄到公司信箱，可加格式和附件。" />, '所有員工＋外部 Email', '外部 Email 必須開 Email'],
          [<span className="flex items-center gap-2"><ChIcons list={['sms']} />Device Notifications (SMS)</span>, <Copy en="Send an SMS to anyone the push doesn’t reach." zh="推播沒送到的人，改發 SMS。" />, '推播送不到且有手機的員工＋外部電話', <>只在勾了 Device Notifications 後出現；標籤 <Tag size="sm" color="amber">Needs ICSD approval</Tag>；外部電話必須開</>],
        ]} />
        <Notes items={[
          { title: '選中的卡片', body: <>主色外框、淡主色底，圖示變藍。</> },
          { title: '套用模板時', body: <>卡片下方多一行：綠字「Template has text for this」或灰字「Template has no text for this」。</> },
        ]} />
      </Section>

      <Section eyebrow="Reach" title="觸及人數" lead="選了收件人和至少一個通道後，通道區最下方一行告訴使用者幾個人收得到。">
        <Figure label="有人收不到" sub="F18/MFG3（412 人），只勾 Device Notifications" shot="s1-unreach" wideNotes notes={[
          { n: 1, title: '人數', body: <><span className="spec-q">369 of 412 people get it</span> · 43 don’t（369 / 412 人收得到，43 人收不到）。全部收得到時改成綠字勾勾「All 412 people get it」。</> },
          { n: 2, title: '查看是誰', body: <>「See who」打開收不到的名單（見「對話框」）。</> },
          { n: 3, title: '補救建議', body: <>右側 secondary 按鈕，一鍵加通道：Email 能補到的人優先，「Add Email to reach everyone」或「Add Email (+N)」；否則「Add SMS to reach everyone」或「Add SMS (+N)」。</> },
        ]} />
      </Section>

      <Section eyebrow="Approval" title="核准" lead="兩種核准互不取代：含 SMS 要 ICSD 核准；有外部收件人要主管核准。兩者都要時先主管、後 ICSD。">
        <SpecTable head={['情況', '頁首標籤', '通道區', '步驟 3']} rows={[
          ['開了 SMS 備援', <Tag size="md" color="amber" icon={ShieldCheck}>Needs ICSD approval</Tag>, <>SMS 下方的框：「ICSD approves this message before it’s sent」＋緊急勾選框</>, <>Review「ICSD approval · Sent after ICSD approves it」；黃色橫幅「Needs approval from ICSD」</>],
          ['有外部 Email（且開 Email）或外部電話（且開 SMS）', <Tag size="md" color="amber" icon={ShieldCheck}>Needs supervisor approval</Tag>, <>黃色橫幅「Includes N external audiences. Your supervisor, &lt;姓名&gt;, must approve.」</>, <>黃色橫幅「Needs approval from your supervisor」</>],
          ['勾了緊急', <Tag size="md" color="red" icon={ShieldAlert}>Skipping ICSD approval (urgent)</Tag>, '見下方', <>Review「ICSD approval · Skipped as urgent. Reason: …」（黃色警示）</>],
        ]} />
        <Figure label="緊急發送" sub="勾選「It’s urgent」後" shot="s1-urgent" wideNotes notes={[
          { n: 1, title: '緊急勾選框', body: <><Copy en="It’s urgent: send without waiting for ICSD" zh="這是緊急訊息，不等 ICSD 核准直接傳送" />，說明 <Copy en="Only for urgent, important messages. This request will be kept on record." zh="僅限緊急且重要的訊息，此次申請將會留存紀錄。" />。勾選後框的標題改成「ICSD approval will be skipped」。</> },
          { n: 2, title: '原因（必填）', body: <>2 行 Textarea，最多 200 字，提示字「e.g. Typhoon warning issued at 07:30; staff must know before commuting.」。沒填按 Next 會顯示「Say why this can’t wait for ICSD.」</> },
          { n: 3, title: '仍需主管核准', body: <>有外部收件人時，灰色橫幅「Your supervisor still has to approve it, because it goes outside the company.」</> },
        ]} />
      </Section>
    </>
  )
}

// ---------- step 2: message ----------
function MessageTab() {
  return (
    <>
      <Section eyebrow="Step 2" title="訊息內容" lead="上方選「New」或「Use template」，下面依步驟 1 選的通道出現對應的內容區塊，順序固定：Device Notifications → SMS → Desktop OS → Email。區塊之間 2 倍 loose 間距，區塊標題 body semibold、不加圖示。">
        <Figure label="四個通道都選時" sub="還沒填" shot="s2-empty" notes={[
          { n: 1, title: 'New', body: '預設。從空白開始寫。' },
          { n: 2, title: 'Use template', body: <>選了之後右邊的 DS <C>Select</C>（寬 320、可搜尋）才能用；沒選時停用。選項是這個空間的模板：名稱＋下方小字列出模板有內容的通道。選好後欄位只顯示模板名稱。</> },
          { n: 3, title: 'Device Notifications', body: 'Sender（必填）、Title（必填）、Text（必填，4 行）。Text 下方提示「Lock screens show about 4 lines.」' },
          { n: 4, title: '字數', body: <>每個欄位右上角「目前 / 上限」，超過時變紅（見「驗證與字數」）。</> },
          { n: 5, title: 'Device Notifications (SMS)', body: <>SMS text（必填，2 行，70 字）。標題右邊灰色標籤「For people without the app」（有外部電話時加「and external phones」）。提示「Links won’t open in SMS.」</> },
          { n: 6, title: 'Desktop OS', body: <>自己的 Sender（選填）、Title（必填，40 字）、Text（必填，120 字）。字數上限剛好是桌面通知放得下的長度，所以不會被截斷，也不需要截斷警告。</> },
          { n: 7, title: 'Email', body: 'Subject（必填，120 字）。' },
          { n: 8, title: 'Email text', body: <>RichText 編輯器（粗體、斜體、底線、連結、項目符號、編號、清除格式），必填，5,000 字。沒有附件。</> },
          { n: 9, title: 'Save as template', body: '把目前內容存成模板（見「對話框」）。內容沒填完時不能存，會提示「Finish the message first」。' },
        ]} />
      </Section>

      <Section eyebrow="Template" title="使用模板" lead="模板只換文字，收件人和通道不變。">
        <div className="spec-row side">
          <div className="spec-canvas"><Shot name="s2-tpl" max={560} alt="模板選單" /></div>
          <Notes items={[
            { title: '套用', body: <>選了模板就填入各區塊：Device Notifications 與 Desktop OS 填入同一段通知文字（使用者再把桌面版縮短）、SMS、Email。toast「Template applied」。</> },
            { title: '已經寫了內容時', body: <>先確認 <Copy en="Replace your text? · “<template>” will replace what you’ve written. Audiences and channels stay the same." zh="要取代目前的內容嗎？ · 「<模板>」會取代你寫的內容，收件人和通道不變。" />，按鈕「Keep mine / Replace」。</> },
            { title: '改回 New', body: <>取消和模板的連結，但保留已填的文字，toast「Template removed. Your text stays.」</> },
            { title: '模板缺少某個通道的內容', body: <>那個區塊上方灰色橫幅「This template has no notification text.」，使用者自己寫。</> },
            { title: '方括號', body: <>模板裡的 [what]、[date] 是要替換的地方，送出前使用者自己改。</> },
          ]} />
        </div>
        <Figure label="套用模板後" sub="Personal reminder" shot="s2-filled" notes={[
          { n: 1, title: '模板欄位', body: '顯示目前套用的模板名稱，可以換別的。' },
          { n: 2, title: 'Desktop OS 的文字', body: '和 Device Notifications 一樣先帶入，超過 40 / 120 字時欄位會標紅，使用者縮短。' },
        ]} />
      </Section>
    </>
  )
}

// ---------- step 3: review ----------
function ReviewTab() {
  return (
    <>
      <Section eyebrow="Step 3" title="確認送出" lead="選傳送時間，確認收件人和核准，看每個通道收到的樣子，最後按「Create message」。">
        <Figure label="步驟 3" sub="需要 ICSD 核准、立即傳送" shot="s3-now" notes={[
          { n: 1, title: 'Send now', body: <>DS <C>RadioGroup</C> 卡片，預設。說明：不需核准時「Starts right away」，需要核准時「Right after approval」。</> },
          { n: 2, title: 'Scheduled send', body: <>說明「Up to 30 days ahead」。選了之後出現日期時間欄位（見下方）。區塊副標「Taipei time (GMT+8)」。</> },
          { n: 3, title: 'Audiences', body: <>「N audiences」，有外部時加「, incl. N external」。</> },
          { n: 4, title: 'ICSD approval', body: <>只在開了 SMS 時出現：「Sent after ICSD approves it」，或緊急時黃色「Skipped as urgent. Reason: …」。另外，若有人收不到，會多一列黃色「N people won’t get this · None of your channels reach them.」</> },
          { n: 5, title: 'Preview', body: '有外框的區塊，標題「Preview」。用 DS 樣式畫的簡單卡片，不畫擬真裝置。' },
          { n: 6, title: '預覽切換', body: <>DS <C>SegmentedControl</C> sm，列出選了的通道；只有一個通道時改成文字。</> },
          { n: 7, title: '核准提醒', body: <>需要核准時黃色橫幅「Needs approval from ICSD / your supervisor / your supervisor and ICSD」＋「Nothing is sent until it’s approved.」</> },
          { n: 8, title: 'Send me a test', body: <>寄一份給自己：手機、電腦、信箱（依選的通道，不含 SMS），toast「Test sent」。內容沒填完時提示「Finish the message first」。</> },
          { n: 9, title: 'Create message', body: <>不論傳送時間或是否核准，文字都是「Create message / 建立訊息」。圖示依情況：需要核准是盾牌、緊急是警示盾牌、排程是日曆、立即傳送是紙飛機。</> },
        ]} />
      </Section>

      <Section eyebrow="Preview" title="各通道預覽" lead="切換上方的分段控制看每個通道。">
        <div className="spec-gallery wide">
          <figure><figcaption><b>Desktop OS</b><span>用 Desktop OS 自己的寄件人、標題和內文；內文最多顯示 3 行。</span></figcaption><div className="spec-canvas"><Shot name="prev-desktop" alt="Desktop OS 預覽" /></div></figure>
          <figure><figcaption><b>Device Notifications (SMS)</b><span>訊息泡泡，只有 SMS 內容。</span></figcaption><div className="spec-canvas"><Shot name="prev-sms" alt="SMS 預覽" /></div></figure>
          <figure><figcaption><b>Email</b><span>主旨、寄件者「MNP &lt;no-reply@tsmc.com&gt;」，下方 Email 內文（保留格式，最高 260 後捲動）。</span></figcaption><div className="spec-canvas"><Shot name="prev-email" alt="Email 預覽" /></div></figure>
        </div>
        <Notes items={[{ title: '還沒填的欄位', body: '預覽裡顯示灰色的欄位名稱（Title、Text、Subject…），讓使用者知道還缺什麼。' }]} />
      </Section>

      <Section eyebrow="Schedule" title="排程傳送">
        <Figure label="選了 Scheduled send" shot="s3-sched" wideNotes notes={[
          { n: 1, title: '日期和時間', body: <>DS <C>DatePicker</C>（含時間、可直接輸入），寬最多 384，格式「YYYY/MM/DD HH:MM」，預設明天 09:00。沒有「此刻」按鈕。下方提示「Sends &lt;時間&gt;」，需要核准時「Sends &lt;時間&gt; if approved by then」。</> },
        ]} />
        <SpecTable head={['錯誤', '文案']} rows={[
          ['沒選', <Copy en="Pick a date and time." zh="請選擇日期和時間。" />],
          ['不到 10 分鐘後', <Copy en="Pick a time at least 10 minutes from now." zh="請選 10 分鐘以後的時間。" />],
          ['超過 30 天', <Copy en="Pick a time within 30 days." zh="最多只能排 30 天內。" />],
        ]} />
      </Section>
    </>
  )
}

// ---------- after ----------
function AfterTab() {
  return (
    <>
      <Section eyebrow="Result" title="需要核准：結果頁" lead="按 Create message 後，需要 ICSD 或主管核准的訊息不會直接回到列表，而是先看到這一頁，讓使用者知道接下來會發生什麼。">
        <Figure label="Sent for approval" sub="ICSD 核准、排程傳送" shot="result" notes={[
          { title: '圖示與標題', body: <>黃色圓底盾牌、<C>text-h3</C>「Sent for approval / 已送出審核」。</> },
          { title: '說明', body: <>只要 ICSD：「ICSD will review it. We’ll notify you when it’s approved.」只要主管：「Your supervisor will review it. …」兩者：「Your supervisor reviews it first, then ICSD. We’ll notify you at each step.」</> },
          { title: '摘要', body: 'Request ID、Approver、Channels、Submitted、Sends（排程：「<時間>, if it’s approved by then」；立即：「As soon as it’s approved」）、Audiences。' },
          { title: '按鈕', body: <>「New message」（tertiary，再發一則）、「Back to messages」（primary）。</> },
          { title: '在列表', body: <>這則訊息是 <StatusTag s="pending" />。之後的變化見訊息紀錄規格的「狀態」。</> },
        ]} />
      </Section>

      <Section eyebrow="No approval" title="不需要核准" lead="直接回到訊息列表（第 1 頁、清除搜尋與篩選），新訊息在最上面，並出現一行 toast。">
        <SpecTable head={['傳送時間', '列表狀態', 'Toast']} nowrap={[0]} rows={[
          ['Send now', <><StatusTag s="progress" /> → <StatusTag s="sent" /></>, <Copy en="Sending to 59 audiences" zh="傳送給 59 位收件人" />],
          ['Scheduled send', <StatusTag s="scheduled" />, <Copy en="Scheduled for <time>" zh="已排程：<時間>" />],
        ]} />
      </Section>

      <Section eyebrow="Urgent" title="緊急發送的確認" lead="略過 ICSD 不能復原而且會留紀錄，所以按 Create message 後一定先確認。">
        <div className="spec-row side">
          <div className="spec-canvas"><Shot name="dlg-urgent" max={480} alt="略過 ICSD 確認" /></div>
          <Notes items={[
            { title: '標題與說明', body: <><Copy en="Send without ICSD approval?" zh="要略過 ICSD 核准直接送出嗎？" />，說明同步驟 1。</> },
            { title: '紀錄內容', body: 'Reason（步驟 1 填的原因）、Logged as（建立者姓名・時間）、Notified（ICSD 和主管）。' },
            { title: '按鈕', body: <>「Go back」、紅色「Skip approval and send」。</> },
            { title: '送出後', body: <>沒有外部收件人：直接傳送，列表標題前有 <Tag size="sm" color="amber">Urgent</Tag>。有外部收件人：仍走主管核准的結果頁。</> },
          ]} />
        </div>
      </Section>
    </>
  )
}

// ---------- dialogs ----------
function DialogsTab() {
  const G = ({ name, t, d }: { name: string; t: string; d: React.ReactNode }) => <figure><figcaption><b>{t}</b><span>{d}</span></figcaption><div className="spec-canvas"><Shot name={name} alt={t} /></div></figure>
  return (
    <Section eyebrow="Dialogs" title="流程中的對話框" lead="都用 DS Dialog：標題、可選的一行副標、內容、右下角按鈕（取消在左、主要在右）。">
      <div className="spec-gallery">
        <G name="dlg-import" t="批次匯入 1/2：貼上名單" d={<>先選資料類型（NT accounts、Employee IDs、Names、Emails、Mobile numbers、MVPN、Org codes），再貼上（逗號或換行分隔）或上傳 .csv / .txt，也可以「Try a sample」。按「Find matches」比對。</>} />
        <G name="dlg-import2" t="批次匯入 2/2：確認比對結果" d={<>上方「N ready」「N not found」。Ready to add 列出原始值 → 比對到的人；同名多人時出現「Who do you mean?」讓使用者選。Not found 可以「Copy」，加入後會留在名單框裡修正。按「Add N audiences」加入，「Edit list」回上一步。</>} />
        <G name="dlg-numbers" t="選擇 SMS 號碼" d={<>副標「These people have 2 numbers. Pick one for SMS.」每人一列，選公司或個人手機；可以一次全選公司手機。從「Choose number」或「Choose」打開；有人沒選就按 Next 也會打開。</>} />
        <G name="dlg-members" t="群組成員" d={<>從收件人表格的人數打開。標題是群組或組織名稱。群組列出姓名和「Added by」（當初用 NT 帳號、Email、手機或工號加入）；組織列出姓名、工號、NT 帳號。不列組織欄。可以搜尋。</>} />
        <G name="dlg-unreach" t="收不到的人" d={<>從觸及人數的「See who」打開。標題「N people won’t get this」，每人一列附原因（No device、No desktop agent…）。下方按鈕可以直接加 SMS 備援或 Email。</>} />
        <G name="dlg-savegroup" t="存成群組" d={<>名稱（必填，同空間不能重複）和說明（選填）。只存員工，不含外部聯絡人。</>} />
        <G name="dlg-savetpl" t="存成模板" d={<>只有「Template name」（必填，50 字，同空間不能重複）。不加說明文字和內容總覽。錯誤：「Enter a name.」「This name is taken.」</>} />
      </div>
    </Section>
  )
}

// ---------- validation ----------
function RulesTab() {
  return (
    <>
      <Section eyebrow="Validation" title="什麼時候顯示錯誤" lead="欄位不會一打開就紅。按 Next / Create message 時才檢查這一步；超過字數時打字當下就顯示。">
        <Notes items={[
          { title: '按 Next 有錯', body: '留在這一步、把所有錯誤標出來、捲到第一個錯誤。步驟列也不會讓使用者跳過有錯的步驟。' },
          { title: '按 Create message', body: '三個步驟全部再檢查一次；有錯就跳回那一步。還有人沒選 SMS 號碼時先打開選號碼對話框。' },
          { title: '錯誤樣式', body: <>欄位紅框＋下方紅字（DS <C>FormField</C> error）；不屬於單一欄位的錯誤（例如沒有收件人）用紅字一行放在區塊下方。</> },
        ]} />
        <div className="spec-gallery wide">
          <figure><figcaption><b>步驟 1 沒填就按 Next</b><span>「Add at least one audience.」「Pick at least one channel.」</span></figcaption><div className="spec-canvas"><Shot name="s1-errors" alt="步驟 1 錯誤" /></div></figure>
          <figure><figcaption><b>步驟 2 沒填就按 Next</b><span>每個必填欄位都標出來。</span></figcaption><div className="spec-canvas"><Shot name="s2-errors" alt="步驟 2 錯誤" /></div></figure>
        </div>
      </Section>

      <Section eyebrow="Fields" title="欄位、上限與錯誤文案">
        <SpecTable head={['步驟', '欄位', '必填', '上限', '錯誤文案']} nowrap={[0, 1, 2, 3]} rows={[
          ['1', '收件人', '是', '500 人', <><Copy en="Add at least one audience." zh="請加入至少一位收件人。" /><Copy en="Over the 500-audience limit." zh="超過 500 人上限。" /></>],
          ['1', '通道', '至少一個', '—', <Copy en="Pick at least one channel." zh="請選擇至少一個通道。" />],
          ['1', '外部 Email', '需開 Email', '—', <Copy en="N external emails can only get Email. Turn on Email or remove them." zh="N 個外部 Email 只能收 Email。請開啟 Email，或移除它們。" />],
          ['1', '外部電話', '需開 SMS', '—', <Copy en="N external phones can only get SMS. Turn on SMS fallback or remove them." zh="N 支外部電話只能收 SMS。請開啟 SMS 備援，或移除它們。" />],
          ['1', '緊急原因', '勾緊急時', '200', <Copy en="Say why this can’t wait for ICSD." zh="請說明為什麼不能等 ICSD 核准。" />],
          ['2', 'Device Notifications · Sender', '是', '20', <Copy en="Enter a sender name." zh="請輸入寄件人名稱。" />],
          ['2', 'Device Notifications · Title', '是', '50', <Copy en="Enter a title." zh="請輸入標題。" />],
          ['2', 'Device Notifications · Text', '是', '300', <Copy en="Enter the text." zh="請輸入內文。" />],
          ['2', 'SMS text', '是', '70', <Copy en="Enter the SMS text." zh="請輸入 SMS 內容。" />],
          ['2', 'Desktop OS · Sender', '否', '20', '—'],
          ['2', 'Desktop OS · Title', '是', '40', <Copy en="Enter a title." zh="請輸入標題。" />],
          ['2', 'Desktop OS · Text', '是', '120', <Copy en="Enter the text." zh="請輸入內文。" />],
          ['2', 'Email · Subject', '是', '120', <Copy en="Enter a subject." zh="請輸入主旨。" />],
          ['2', 'Email text', '是', '5,000', <Copy en="Write the email." zh="請輸入 Email 內文。" />],
          ['3', '排程時間', '選排程時', '10 分鐘後～30 天內', '見「確認送出」'],
        ]} />
        <Notes items={[{ title: '超過字數', body: <>所有欄位共用：<Copy en="Up to N characters." zh="最多 N 字。" />；字數計數變紅。</> }]} />
      </Section>
    </>
  )
}

// ---------- edge cases ----------
function EdgeTab() {
  return (
    <Section eyebrow="Edge cases" title="邊界情境">
      <SpecTable head={['情境', '規則']} rows={[
        ['同一人在多個群組或組織', '只算一人、只收一次；500 人上限算去重後的人數。'],
        ['員工的電話或 Email 被當成外部輸入', '會辨識成那位員工，不算外部、不需主管核准。'],
        ['外部收件人', '外部 Email 只收 Email、外部電話只收 SMS；有任何一個就需要主管核准，緊急也不能略過。'],
        ['群組裡有外包人員', '算外部收件人。'],
        ['關掉 Device Notifications', 'SMS 備援一起關掉，ICSD 核准與緊急設定也一起消失。'],
        ['只勾 Email', '沒有寄件人名稱；如果已經寫過通知文字，會自動帶進 Email 主旨與內文。'],
        ['員工有兩支手機、開了 SMS', '一定要選一支，否則不能進下一步。'],
        ['員工沒有手機、開了 SMS', '不擋，只提示他收不到 SMS。'],
        ['有人所有通道都收不到', '不擋，觸及人數與步驟 3 都會提醒，並建議加 Email 或 SMS。'],
        ['套用模板後又自己改文字', '仍記錄用了哪個模板。'],
        ['排程時間在核准之後才到', '照排程時間送出。'],
        ['排程時間到了還沒核准', '不會送出；核准時已過時間會變成「排程已過期」，見訊息紀錄規格。'],
        ['編輯已排程的訊息', '原地覆蓋；需要核准的話重新送審。'],
        ['手機寬度', '步驟列改成單一步驟的文字；通道卡改成一欄；按鈕列可換行。'],
      ]} />
    </Section>
  )
}
