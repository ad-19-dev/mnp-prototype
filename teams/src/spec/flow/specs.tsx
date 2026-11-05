// The design spec behind each node of the UI flow: DS components, rules and copy, short enough for a side panel,
// with a link to the full send-flow spec. Keys: a step's id for its main screen, "<step id>/<card title>" for a
// card under it, and an outcome's id.
import * as React from 'react'

export type SpecTab = 'overview' | 'audiences' | 'channels' | 'message' | 'review' | 'after' | 'dialogs' | 'rules' | 'edge'
export interface SpecDef { tab: SpecTab; comps?: string[]; rules: React.ReactNode[]; copy?: [string, string][] }
export const SPEC_URL = 'https://claude.ai/artifact/5Cp4EoipMcFczPk314XxRK'
export const TAB_NAME: Record<SpecTab, string> = {
  overview: '總覽與流程', audiences: '1 · 收件人', channels: '1 · 通道與核准', message: '2 · 訊息內容', review: '3 · 確認送出',
  after: '送出之後', dialogs: '對話框', rules: '驗證與字數', edge: '邊界情境',
}

export const SPECS: Record<string, SpecDef> = {
  // ---------- entry ----------
  entry: { tab: 'overview', comps: ['DataTable', 'Button primary', 'Tabs（頁首第二列）'],
    rules: ['「+ New message」在頁首第一列右側，primary。', '訊息建在目前所在的發送空間；共享空間右邊另有團隊設定齒輪。', '頁首：麵包屑（目前頁面粗體）＋右側按鈕；第二列是空間分頁。'] },
  'entry/編輯': { tab: 'overview', rules: ['只有已排程、已駁回可以編輯。', '麵包屑標題「Edit message」；排程時間帶入 Scheduled send。', '建立後覆蓋原訊息；需要核准時重新送審。'], copy: [['Edit', '編輯'], ['Edit and resubmit', '修改後重新送審']] },
  'entry/複製': { tab: 'overview', rules: ['麵包屑標題「Duplicate message」。', '帶入收件人、通道、內容、模板；不帶傳送時間。', '三個步驟都可以直接點。'], copy: [['Duplicate to new message', '複製為新訊息']] },
  'entry/重寄': { tab: 'overview', rules: ['麵包屑標題「Resend to missed audiences」。', '收件人換成失敗名單的人，其餘同複製。'], copy: [['Resend to N', '重寄給 N 人']] },
  'entry/任何一步離開': { tab: 'overview', comps: ['Dialog（確認）'], rules: ['「Cancel」或點麵包屑的空間名稱。', '填過任何東西才確認；沒填過直接回列表。', '「Discard」是紅色（danger）。'],
    copy: [['Leave without sending?', '還沒送出，要離開嗎？'], ['What you’ve written won’t be kept.', '你填寫的內容不會保留。'], ['Keep editing · Discard', '繼續編輯 · 捨棄']] },

  // ---------- step 1 ----------
  step1: { tab: 'audiences', comps: ['Steps', 'Select', 'Input', 'DataTable', 'Checkbox（通道卡）', 'Banner', 'Tag'],
    rules: ['最多 500 人（展開群組與組織、去重後）；超過時右上人數變紅並擋下一步。', '頁首核准標籤：有外部收件人「Needs supervisor approval」；開 SMS 備援「Needs SMS approval」。', 'SMS 備援只在勾了 Device Notifications 後出現；關掉推播時一起關。', '通道區最下方一行：「N of M people get it · K don’t」＋「See who」＋補救按鈕。', '底部左側「Save as group」，沒有收件人時停用。'],
    copy: [['Up to 500 people. Add contractors by phone or email.', '最多 500 人。外包人員可用電話或 Email 加入。'], ['All N people get it', 'N 人都收得到']] },
  'step1/選收件人類型': { tab: 'audiences', comps: ['Select（寬 128）'], rules: ['Person、Org、Group、Phone、Email、MVPN。', '切換後輸入框清空、自動聚焦，提示字跟著換。'],
    copy: [['Name, NT account or employee ID', '姓名、NT 帳號或工號'], ['Org code or name', '組織代碼或名稱'], ['Mobile number, e.g. 0912-345-678', '手機號碼，例如 0912-345-678']] },
  'step1/搜尋並加入': { tab: 'audiences', comps: ['Popover 選單'], rules: ['比對中英文姓名、NT 帳號、工號；公司 Email 也會找到本人。', '按 Enter 加入第一筆。', '已加入的顯示灰色「Added」，不能重複加。'],
    copy: [['No match for “…”.', '找不到「…」。'], ['Contractors? Switch to Phone or Email.', '外包人員請改選電話或 Email。']] },
  'step1/加入群組': { tab: 'audiences', rules: ['還沒輸入時列出「Your groups」（這個空間的群組）。', '加入後選單不關，可以連續加。', '選單裡不展開成員；要看成員，加入後點表格的人數。'] },
  'step1/批次匯入': { tab: 'dialogs', comps: ['Dialog（720）', 'Select', 'Textarea', 'FileUpload', 'DataTable'],
    rules: ['先選資料類型：NT accounts、Employee IDs、Names、Emails、Mobile numbers、MVPN、Org codes。', '逗號或換行分隔；可上傳 .csv / .txt，或「Try a sample」。', '比對結果：「N ready」「N not found」；同名多人時「Who do you mean?」。', '找不到的留在名單框修正。'],
    copy: [['Find matches', '比對名單'], ['Add N audiences', '加入 N 位收件人'], ['Edit list', '修改名單']] },
  'step1/查看群組成員': { tab: 'dialogs', comps: ['Dialog（640）', 'Input sm', 'DataTable（高 340）', 'Empty'],
    rules: ['標題是群組或組織名稱，副標「Group · N people」。', '群組欄位：姓名｜Added by（NT、Email、手機或工號）；組織：姓名｜工號｜NT 帳號；不列組織欄。', '找不到時表格內空狀態。'],
    copy: [['Search name, NT, email or mobile', '搜尋姓名、NT 帳號、Email 或手機'], ['No matching members', '找不到符合的成員']] },
  'step1/選擇 SMS 號碼': { tab: 'dialogs', comps: ['Dialog（720）', 'RadioGroup'], rules: ['只在開了 SMS 備援、員工有公司和個人兩支手機時出現。', '可以一次全選公司手機。', '沒選完不能進下一步；按 Next 會自動打開。'],
    copy: [['N person has 2 phone numbers. Pick one for SMS.', 'N 人有兩支電話，請選一支收 SMS。'], ['Choose', '選擇號碼']] },
  'step1/有人收不到': { tab: 'channels', comps: ['Dialog（720）', 'Button secondary'], rules: ['補救按鈕：Email 能補到的優先，否則 SMS。', '對話框每人一列，附原因（No device、No desktop agent…）。'],
    copy: [['N people won’t get this', 'N 人收不到'], ['Add Email to reach everyone', '加入 Email，全部收得到'], ['Turn on SMS fallback', '開啟 SMS 備援']] },
  'step1/緊急發送': { tab: 'channels', comps: ['Checkbox', 'Textarea（2 行，200 字）', 'Banner neutral'],
    rules: ['只在開了 SMS 備援時出現；勾選後框標題改成「SMS approval will be skipped」。', '原因必填；有外部收件人時仍要主管核准。', '頁首標籤改成紅色「Skipping SMS approval (urgent)」。'],
    copy: [['It’s urgent: send without waiting for SMS approval', '這是緊急訊息，不等 SMS 核准直接傳送'], ['Only for urgent, important messages. This request will be kept on record.', '僅限緊急且重要的訊息，此次申請將會留存紀錄。']] },
  'step1/存成群組': { tab: 'dialogs', comps: ['Dialog（560）', 'Input', 'Textarea'], rules: ['名稱必填、50 字、同空間不可重複；說明選填、200 字。', '只存員工；有外部收件人時提示不會存入。'],
    copy: [['External addresses aren’t saved.', '外部收件人不會存入。'], ['This name is taken.', '這個名稱已經有人用了。']] },
  'step1/還沒填完就按 Next': { tab: 'rules', comps: ['FormField error', 'ErrText'], rules: ['按 Next 才檢查這一步，超過字數則打字時就顯示。', '留在這一步、標出所有錯誤、捲到第一個。'],
    copy: [['Add at least one audience.', '請加入至少一位收件人。'], ['Pick at least one channel.', '請選擇至少一個通道。'], ['N over the limit. Remove some, or split into separate messages.', '超過上限 N 人。請移除部分收件人，或分成多則訊息。']] },

  // ---------- step 2 ----------
  step2: { tab: 'message', comps: ['RadioGroup', 'Select（可搜尋，寬 320）', 'FormField', 'Input', 'Textarea', 'RichText'],
    rules: ['區塊順序固定：Device Notifications → SMS → Desktop OS → Email；標題 body semibold、不加圖示。', 'Device Notifications：Sender* 20、Title* 50、Text* 300。', 'SMS text* 70；Desktop OS：Sender 20、Title* 40、Text* 120（放得下，不需截斷警示）。', 'Email：Subject* 120、Email text* 5,000（RichText，沒有附件）。', '每個欄位右上「目前 / 上限」，超過變紅。'] },
  'step2/使用模板': { tab: 'message', rules: ['模板選單在選「Use template」前停用；選項：名稱＋下方通道小字。', '已經寫了內容時先確認取代。', '改回 New：取消連結但保留文字。'],
    copy: [['Template applied', '已套用模板'], ['Replace your text? · Keep mine · Replace', '要取代目前的內容嗎？ · 保留我的 · 取代'], ['Template removed. Your text stays.', '已取消模板，內容保留。']] },
  'step2/存成模板': { tab: 'dialogs', comps: ['Dialog（560）', 'Input'], rules: ['只有「Template name」：必填、50 字、同空間不重複。', '沒有說明文字和內容總覽。', '內容沒填完不能存。'],
    copy: [['Finish the message first', '請先完成訊息內容'], ['Enter a name.', '請輸入名稱。']] },
  'step2/還沒填完就按 Next': { tab: 'rules', rules: ['每個缺的必填欄位都標紅框與紅字。', '超過字數一律「Up to N characters.」。'],
    copy: [['Enter a sender name.', '請輸入寄件人名稱。'], ['Enter a title.', '請輸入標題。'], ['Enter the SMS text.', '請輸入 SMS 內容。'], ['Write the email.', '請輸入 Email 內文。']] },

  // ---------- step 3 ----------
  step3: { tab: 'review', comps: ['RadioGroup（卡片）', 'DatePicker', 'SegmentedControl sm', 'Banner warning', 'Button primary'],
    rules: ['Send now 說明：不需核准「Starts right away」，需要核准「Right after approval」。', 'Review 列：Audiences、SMS approval（開了 SMS 時）、收不到的人（有的話）。', 'Preview 用 DS 卡片，不畫擬真裝置。', '主要按鈕一律「Create message」；圖示：核准盾牌、緊急警示盾牌、排程日曆、立即紙飛機。'],
    copy: [['Needs approval from your supervisor · Nothing is sent until it’s approved.', '需要主管核准 · 核准前不會送出。']] },
  'step3/排程傳送': { tab: 'review', comps: ['DatePicker（showTime，可輸入，寬 ≤ 384）'], rules: ['台北時間；預設明天 09:00；沒有「此刻」按鈕。', '可選 10 分鐘後到 30 天內。', '提示「Sends <時間>」，需要核准時加「if approved by then」。'],
    copy: [['Pick a time at least 10 minutes from now.', '請選 10 分鐘以後的時間。'], ['Pick a time within 30 days.', '最多只能排 30 天內。']] },
  'step3/切換預覽': { tab: 'review', rules: ['只列出選了的通道；只有一個時改成文字。', 'Desktop OS 用自己的文字，最多 3 行；SMS 是泡泡；Email 有主旨與寄件者，內文最高 260 後捲動。', '還沒填的欄位顯示灰色欄位名稱。'] },
  'step3/寄測試給自己': { tab: 'review', rules: ['內容要先填完。', '寄到你的手機、電腦或信箱（依選的通道），不含 SMS。'], copy: [['Send me a test', '寄測試給我'], ['Test sent', '已寄出測試']] },
  'step3/緊急發送的確認': { tab: 'after', comps: ['Dialog（480）', 'Button danger'], rules: ['列出 Reason、Logged as（姓名・時間）、Notified（SMS 審核人員和主管）。', '略過核准不能復原，所以一定先確認。'],
    copy: [['Send without SMS approval?', '要略過 SMS 核准直接送出嗎？'], ['Go back · Skip approval and send', '返回 · 略過核准並送出']] },

  // ---------- outcomes ----------
  'done-approval': { tab: 'after', comps: ['Empty 式置中版面', 'Button tertiary', 'Button primary'],
    rules: ['黃色圓底盾牌、text-h3 標題。', '摘要：Request ID、Approver、Channels、Submitted、Sends、Audiences。', '說明依審核人：主管、SMS 審核人員，或先主管後 SMS 審核人員。', '列表狀態：Pending approval。'],
    copy: [['Sent for approval', '已送出審核'], ['New message · Back to messages', '再發一則 · 回到訊息列表']] },
  'done-now': { tab: 'after', rules: ['回到列表第 1 頁，清除搜尋與篩選；新訊息在最上面。', 'Toast 只有一行標題，4 秒自動消失。', '狀態 In progress，送完變 Sent。'], copy: [['Sending to N audiences', '傳送給 N 位收件人']] },
  'done-sched': { tab: 'after', rules: ['回到列表第 1 頁；狀態 Scheduled。', '時間到才送；可在列選單編輯或刪除。'], copy: [['Scheduled for <time>', '已排程：<時間>']] },
}

// the panel body (also used inline in the list view)
export function SpecBody({ spec }: { spec: SpecDef }) {
  return (
    <div className="flow-spec">
      {spec.comps?.length ? <section><h4>使用元件</h4><div className="flow-chips">{spec.comps.map(c => <code key={c}>{c}</code>)}</div></section> : null}
      <section><h4>規則</h4><ul>{spec.rules.map((r, i) => <li key={i}>{r}</li>)}</ul></section>
      {spec.copy?.length ? (
        <section><h4>文案</h4>
          <dl>{spec.copy.map(([en, zh], i) => <div key={i}><dt>{en}</dt><dd>{zh}</dd></div>)}</dl>
        </section>
      ) : null}
      <a className="flow-spec-link" href={SPEC_URL + '#' + spec.tab} target="_blank" rel="noreferrer">在發送訊息規格看完整內容：{TAB_NAME[spec.tab]} ↗</a>
    </div>
  )
}
