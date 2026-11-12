// DS component map: for every screen of the per-channel list, the detail panel and New message, which Design System
// component it uses (with its Storybook spec page), how it is set up, and what is our own composition.
import * as React from 'react'
import { Notes, Section, SpecTable } from '../parts'

const SB = 'https://ajenchen.github.io/design-system/?path=/story/'
const ID: Record<string, [string, string]> = {
  AppShell: ['appshell', 'AppShell'], Sidebar: ['sidebar', 'Sidebar'], Breadcrumb: ['breadcrumb', 'Breadcrumb'], Steps: ['steps', 'Steps'],
  Button: ['button', 'Button'], Input: ['input', 'Input'], Textarea: ['textarea', 'Textarea'], Select: ['select', 'Select'], Checkbox: ['checkbox', 'Checkbox'],
  RadioGroup: ['radiogroup', 'RadioGroup'], DatePicker: ['datepicker', 'DatePicker'], SegmentedControl: ['segmentedcontrol', 'SegmentedControl'],
  DataTable: ['datatable', 'DataTable'], Tag: ['tag', 'Tag'], Avatar: ['avatar', 'Avatar'], DropdownMenu: ['dropdownmenu', 'DropdownMenu'],
  Pagination: ['pagination', 'Pagination'], Empty: ['empty', 'Empty'], Tooltip: ['tooltip', 'Tooltip'], Dialog: ['dialog', 'Dialog'],
  Toast: ['toast', 'Toast'], DescriptionList: ['descriptionlist', 'DescriptionList'], Accordion: ['accordion', 'Accordion'], Tabs: ['tabs', 'Tabs'],
  FileUpload: ['fileupload', 'FileUpload'], FileItem: ['fileitem', 'FileItem'], CircularProgress: ['circularprogress', 'CircularProgress'],
}
const link = (n: string) => {
  const [k, label] = ID[n] || [n.toLowerCase(), n]
  return <a key={n} className="text-primary hover:underline" href={SB + 'design-system-components-' + k + '-' + encodeURIComponent('設計規格') + '--overview'} target="_blank" rel="noreferrer">{label}</a>
}
const comps = (...n: string[]) => <span className="flex flex-wrap gap-x-2 gap-y-0.5">{n.map((x, i) => <React.Fragment key={x}>{link(x)}{i < n.length - 1 ? <span className="text-fg-muted">·</span> : null}</React.Fragment>)}</span>
const Own = ({ children }: { children: React.ReactNode }) => <span className="text-warning-text">{children}</span>
const HEAD = ['畫面位置', 'DS 元件', '怎麼用', '自己組的部分']

export default function DsMap() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · 開發用</span>
          <h1 className="spec-h1">DS 元件對照表</h1>
          <span className="text-caption text-fg-secondary">2026/11/11 · 列表、訊息詳情與 New message 每個畫面用到的設計系統元件。元件名稱連到 Storybook 的設計規格頁。</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Read me" title="怎麼看這份表" lead="「DS 元件」一欄直接用設計系統的元件，規格以 Storybook 為準。「自己組的部分」是設計系統沒有現成元件、由我們用 DS 元件與 token 組合出來的，開發需要自己實作。">
          <Notes items={[
            { title: '顏色、間距、字級', body: '一律用設計系統的 token（例：bg-muted、text-fg-secondary、--layout-space-loose），不使用色碼或固定數值。' },
            { title: '設計系統沒有的', body: '欄寬 token（欄寬是我們自己定的 4 的倍數）、內容最大寬度（New message 內容區 1120 px）。' },
          ]} />
        </Section>

        <Section eyebrow="List" title="訊息列表">
          <SpecTable head={HEAD} nowrap={[0]} rows={[
            ['整頁外殼', comps('AppShell', 'Sidebar'), '左側 Sidebar（發送空間）、頁首、主區。訊息詳情是 Dialog，不再用右側 AppShellAside。', <Own>—</Own>],
            ['共享空間的 ⋯', comps('Sidebar', 'DropdownMenu'), 'SidebarMenuAction（MoreHorizontal，showOnHover）當 DropdownMenu 的觸發：Space settings、分隔線、Leave space（紅字）。', <Own>Leave space 的確認對話框內容</Own>],
            ['空間頁籤', comps('Tabs'), 'Send messages / Audience groups / Templates，放在頁首第二列。', <Own>—</Own>],
            ['搜尋框', comps('Input'), 'type=search，開頭圖示 Search；寬 480。', <Own>寬度 480 是我們定的</Own>],
            ['建立日期篩選', comps('Button', 'DropdownMenu'), 'Button tertiary（endIcon ChevronDown）開 DropdownMenu（沒有標題）：DropdownMenuRadioGroup 單選 Last 7 days、Last 2 weeks（預設）、Last 30 days、Last 3 months、All time。不設 pressed。', <Own>按鈕文字 Created: 範圍；依 Created 日期篩選</Own>],
            ['Status / Channel 篩選', comps('Button', 'DropdownMenu'), 'Button 開 DropdownMenu（沒有標題），選項是 checkbox item；選了之後按鈕變藍並顯示數量；底部 Clear 有選項時為藍色。', <Own>FilterMenu：把按鈕、角標、選項、Clear 組成一個元件</Own>],
            ['表格', comps('DataTable'), 'bordered、固定高度；欄位用 meta.width，Title / Content 以外的欄再設 meta.maxWidth，多出的寬度才會全給 Title / Content；列尾 rowActions；排序用 manualSorting。', <Own>各欄的 cell 內容（見下）；欄寬</Own>],
            ['訊息 ID', comps('Tag'), 'size sm、neutral。', <Own>放在標題前、tabular 數字</Own>],
            ['通道', comps('Tag', 'Tooltip'), '只有圖示的 Tag（文字隱藏），Tooltip 顯示通道名稱。', <Own>隱藏 Tag 文字的樣式；Device Notifications (SMS) 的「手機加小信封」圖示（DS 與 lucide 都沒有，自己畫）</Own>],
            ['狀態', comps('Tag'), 'size sm，顏色與圖示依狀態（見規格頁的狀態表）。', <Own>狀態下方的 {'{n}'} not sent 連結（Button link）</Own>],
            ['建立者', comps('Avatar'), '大頭照加姓名，DS 的人員顯示（PersonDisplay，照片網址放 avatarUrl；沒有照片時退回姓名第一個字母）。', <Own>—</Own>],
            ['列尾按鈕', comps('Button', 'DropdownMenu'), '只有 ⋮（沒有 ⓘ）：DropdownMenu，只有快速動作，項目依狀態。', <Own>選單項目依狀態顯示的規則</Own>],
            ['分頁', comps('Pagination'), '頁碼與每頁筆數；沒有筆數文字。', <Own>以訊息為單位分頁</Own>],
            ['空狀態', comps('Empty'), '表格內：Empty 加 Clear filters。第一次使用：頁面層級的 Empty 加 New message 按鈕。', <Own>第一次使用時不顯示搜尋、篩選與表格</Own>],
          ]} />
        </Section>

        <Section eyebrow="Modal" title="訊息詳情">
          <SpecTable head={HEAD} nowrap={[0]} rows={[
            ['外殼', comps('Dialog'), 'maxWidth 1120、height fill；標題 Message details，前面是訊息 ID Tag；DialogFooter 放操作。', <Own>兩欄版面（左欄自己捲動；右欄寬 340、neutral-1 淺灰底、左側分隔線）</Own>],
            ['基本資訊', comps('DescriptionList', 'Tag'), 'vertical；Status 的值放 Tag，下方 n not sent 是 Button link。', <Own>Approval record（Button link）、Send time 可編輯時改用 DatePicker</Own>],
            ['內容欄位', comps('Input', 'Textarea'), '可編輯時 mode edit（有計數）；不能編輯時 mode readonly。', <Own>readonly 欄位 focus 時不顯示藍框（覆寫 DS，待 DS 負責人確認）；Read only 標籤（Tag）</Own>],
            ['Email 內文', comps('FileItem'), '附件用 FileItem。', <Own>可編輯時是格式編輯器；readonly 時是 bg-readonly 的 HTML 框</Own>],
            ['Audience', comps('DataTable', 'Checkbox', 'Button'), '和發送流程同樣的表格；SMS 兩欄手機用 Checkbox；可編輯時 rowActions 放移除鈕。', <Own>搜尋列（RecvInput）、Batch import 寫回這個表格</Own>],
            ['底部操作', comps('Button'), 'Cancel sending：secondary danger；Duplicate：secondary；Send now / Save changes：primary；Discard changes：tertiary。', <Own>有改動時換成 Discard / Save</Own>],
            ['成員對話框', comps('Dialog', 'DataTable'), '寬 640，表格列出成員，有搜尋。', <Own>—</Own>],
            ['發送明細', comps('Dialog', 'Select', 'Input', 'DropdownMenu', 'DataTable', 'Tag', 'Pagination'), 'Dialog 最大寬 1280、height fill；搜尋欄位 Select 加 Input；篩選沿用 FilterMenu；DataTable 固定高度；Status 欄 Tag 下方小字原因；Pagination 加每頁筆數 Select（50 / 100 / 200）。', <Own>伺服器端搜尋、篩選、分頁與匯出；多個工號的貼上比對</Own>],
          ]} />
        </Section>

        <Section eyebrow="New message" title="New message：整體與步驟 1">
          <SpecTable head={HEAD} nowrap={[0]} rows={[
            ['頁首', comps('Breadcrumb'), '空間名稱 › New message。', <Own>—</Own>],
            ['步驟列', comps('Steps'), 'horizontal；完成的步驟打勾。', <Own>手機寬度的簡化版（圓形數字加步驟名稱）</Own>],
            ['內容區', comps('AppShell'), '主區內自己置中，最大寬 1120。', <Own>最大寬度 1120、區塊間距</Own>],
            ['頁尾', comps('Button'), 'Cancel（text）、Back（tertiary）、Next / Create message（primary）。', <Own>固定在畫面底部的頁尾列</Own>],
            ['收件人搜尋', comps('Select', 'Input'), '左側 Select 選類型，右側 Input 搜尋；下拉選單列出符合的人。', <Own>RecvInput：整個搜尋加下拉選單的組合</Own>],
            ['Batch import 按鈕', comps('Button'), 'tertiary，開頭圖示 Upload。', <Own>—</Own>],
            ['收件人表格', comps('DataTable', 'Avatar', 'Tag', 'Empty'), '只有一欄 Audience：人員用 DS 人員顯示；其他是圖示、名稱、類型 Tag，組織與群組後接 Button link 的總人數。', <Own>灰色圓底圖示</Own>],
            ['通道卡片', comps('Checkbox'), '三張卡片，勾選框在右上角；在收件人之前選，只用來選通道，不顯示人數。', <Own>整張可點的卡片（藍框、淡藍底）；Device Notifications 說明裡 optional SMS fallback 用 500 字重</Own>],
            ['Delivery method、緊急送出', comps('RadioGroup', 'Checkbox', 'Tag'), 'RadioGroup 直向兩個選項（PNS only / PNS + SMS fallback），選項有 label 與 description；第二個選項的 label 後有 Need ICSD approval 標籤；緊急送出是縮排在下方的 Checkbox。', <Own>淺灰底加框的區塊，標題 Delivery method 與選項名稱 semibold</Own>],
            ['SMS 寄到哪支手機', comps('DataTable', 'Checkbox'), '選了 PNS + SMS fallback 時，收件人表格多兩欄 Company phone、Personal phone：每格一個 Checkbox，表頭 Checkbox 可全選（半選用 indeterminate）。', <Own>每列預設勾公務手機的規則</Own>],
            ['Message Coverage by Channel', '—', '設計系統沒有現成元件。', <Own>收件人下方的人數框：每個通道一行（圖示、名稱、緊接在後的 n / total，全收得到時綠色，最右側收不到的連結）；開 SMS 時 Device Notifications (SMS) 合成一列</Own>],
            ['收不到的人', comps('Button', 'Dialog', 'DataTable', 'Pagination'), '通道列最右側 Button link「N messages can’t be sent」；點了開 Dialog：搜尋 Input、DataTable（Audience、Source、Reason；Source 是名稱加類型 Tag）、超過 10 人時 Pagination、只有 Close。', <Own>展開組織與群組並去重、算出 Source 與 Reason</Own>],
          ]} />
        </Section>

        <Section eyebrow="New message" title="步驟 2 與步驟 3">
          <SpecTable head={HEAD} nowrap={[0]} rows={[
            ['New / Use template', comps('RadioGroup', 'Select'), '兩個選項；模板選單可搜尋。', <Own>—</Own>],
            ['文字欄位', comps('Input', 'Textarea'), '每個欄位：標題、說明或錯誤訊息，字數在欄位下方右側與說明同一列。', <Own>FormField：欄位標題加字數加說明加錯誤的組合</Own>],
            ['Email 內容', comps('Button'), '工具列的按鈕用 Button（含 ButtonDivider）。', <Own>RichText：整個文字編輯器（contentEditable，設計系統沒有）</Own>],
            ['通道區塊', '—', '設計系統沒有現成的卡片元件。', <Own>每個通道一個有框的區塊：rounded-lg、divider 色框線；標題列淺灰底（bg-neutral-1）加下框線，放通道圖示與名稱</Own>],
            ['Schedule', comps('RadioGroup'), '兩張選項卡片，RadioGroupItem 帶圖示與說明。', <Own>卡片外框樣式</Own>],
            ['日期時間', comps('DatePicker'), 'showTime、typeable；錯誤顯示在欄位下方。', <Own>—</Own>],
            ['預覽', comps('SegmentedControl'), '切換通道。', <Own>ChannelPreview：各通道的預覽畫面</Own>],
          ]} />
        </Section>

        <Section eyebrow="Dialogs" title="對話框與提示">
          <SpecTable head={HEAD} nowrap={[0]} rows={[
            ['所有對話框', comps('Dialog'), 'DialogHeader / Body / Footer；Cancel 在左、主要動作在右；按鈕沒有圖示；沒有副標。', <Own>—</Own>],
            ['確認對話框', comps('Dialog', 'Button'), '寬 480；標題、一句說明、兩個按鈕；危險動作用 danger。', <Own>Confirm：把標題、說明、按鈕組成共用的確認元件</Own>],
            ['Batch import', comps('Dialog', 'Select', 'Textarea', 'FileUpload'), '先選 Data type，再貼上或上傳；比對結果分組顯示。', <Own>比對結果的分組列表</Own>],
            ['Not sent to', comps('Dialog', 'DataTable', 'Avatar'), '單行儲存格；內部人員用 DS 人員顯示，外部用圖示加地址。', <Own>—</Own>],
            ['Toast', comps('Toast'), 'Toaster position=bottom-center、offset=48（比預設 24px 高一點）；一則一行。', <Own>隱藏 Toast 前面的圖示（CSS）</Own>],
          ]} />
          <Notes items={[{ title: '載入中', body: <>列表載入用 {link('CircularProgress')} 加 Empty；規格見 Storybook。</> }]} />
        </Section>
      </main>
    </>
  )
}
