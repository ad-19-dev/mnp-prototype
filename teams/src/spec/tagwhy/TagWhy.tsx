// Batch import tags: the design (option A of the tag study, with labels by data type) and why each part is the way it
// is, with screenshots of the study (tools/tagwhy-shots.mjs). For answering "why not show the person" (2026-11-19).
// Nothing here changes the prototype.
import * as React from 'react'
import { Figure, Notes, Section, Shot, SpecTable, type Note } from '../parts'


// one design decision: the screenshot, then what it does, why, and what was set aside
function Why({ shot, title, sub, how, why, not, max }: { shot: string; title: string; sub?: string; how: React.ReactNode; why: React.ReactNode; not?: React.ReactNode; max?: number }) {
  const notes: Note[] = [{ title: '做法', body: how }, { title: '依據', body: why }]
  if (not) notes.push({ title: '沒有這樣做', body: not })
  return <Figure label={title} sub={sub} shot={shot} max={max} notes={notes} wideNotes />
}

// two screenshots one above the other, each with a caption
function Pair({ items }: { items: [string, string, string][] }) {
  return (
    <div className="flex flex-col gap-[var(--layout-space-loose)]">
      {items.map(([n, t, d]) => (
        <figure key={n} className="spec-frame"><figcaption><b>{t}</b><span>{d}</span></figcaption><div className="spec-canvas"><Shot name={n} alt={t} pins={false} /></div></figure>
      ))}
    </div>
  )
}

export default function TagWhy() {
  return (
    <>
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · Batch import · 標籤</span>
          <h1 className="spec-h1">批次匯入標籤的設計依據</h1>
          <span className="text-caption text-fg-secondary">2026/11/19 · 截圖取自批次匯入標籤研究頁的 A 版本（依資料類型顯示），用原型的範例資料</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Summary" title="一句話" lead="標籤顯示什麼，看使用者手上的清單是什麼。NT 帳號、Employee ID 是看不出是誰的代碼，所以顯示姓名；Email、電話、MVPN 顯示輸入的值，因為使用者要拿它對回自己的清單，而且這幾種常混著找不到人的號碼。">
          <SpecTable head={['資料類型', '找到的標籤顯示', 'hover 顯示', '一句話依據']} nowrap={[0]} rows={[
            ['NT accounts、Employee IDs', '大頭照與姓名', '輸入的值 · 組織', '代碼看不出是誰；打錯一個字可能是另一個真的人，只有看姓名才發現'],
            ['Emails', '輸入的 Email', '是誰 · 組織（外部信箱：Outside email）', '使用者對的是自己清單上的 Email；外部信箱沒有人可以顯示'],
            ['Phone numbers、MVPN', '輸入的號碼（統一格式）', '是誰 · 組織 · 哪一種號碼；共用號碼列出共用的人', '見下面「為什麼電話不顯示成人」'],
            ['Org IDs', '組織代碼', '組織名稱 · 人數', '一個代碼是一群人，不是一個人'],
            ['找不到的', '紅色，輸入的值', '找不到的原因', '要讓人一眼看到、直接改'],
          ]} />
        </Section>

        <Section eyebrow="Paste" title="貼上之後：紅色排在最前面">
          <Why shot="nt-paste" title="貼上 26 筆 NT 帳號，3 筆找不到" max={1184}
            how="每一筆變成一個標籤。找不到的是紅色，貼上（或按 Add）的那一刻排到最前面；之後不再重新排序。重複的只留一個，不顯示。"
            why="一次貼上幾百、幾千筆時，要處理的幾筆一打開就看得到，不用捲到後面找。和收件人欄位長得一樣，學一次就會。"
            not="另外開一個比對頁面列出結果：多一個步驟，看完還要回到原本的地方改。" />
        </Section>

        <Section eyebrow="Edit" title="點標籤：變回純文字">
          <Pair items={[
            ['nt-edit', '現在的設計', '點紅色標籤 a19999，標籤變回文字，游標在字裡，位置不變。'],
            ['now-edit', '之前的做法', '點標籤會換成一個有外框的輸入框，欄位裡又有一個欄位，那一行也會跳一下。'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '改錯字只是改字。Gmail、Outlook 的收件人欄也是這樣：點一下收件人變回文字，改完按 Enter 變回標籤。' },
            { title: '怎麼結束', body: 'Enter 或點別的地方就存；Esc 取消；改成空白就是刪掉這一筆。' },
          ]} />
        </Section>

        <Section eyebrow="Suggest" title="打字時：比對到的人出現在選單">
          <Pair items={[
            ['nt-edit-sug', '修改標籤時', '把 a19999 改成 ytch，選單出現 Tina Chang（ytchang · PUX）。'],
            ['nt-type-sug', '在名單最後打字時', '打 chen，列出 NT 帳號或姓名有 chen 的人。'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '在打字的當下就確認是不是要的人，比全部加完再檢查早。選了之後加入的是那個人的 NT 帳號（照這份名單的資料類型），不是姓名。' },
            { title: '哪些類型有選單', body: 'NT accounts、Employee IDs、公司 Email、台灣員工的電話與 MVPN（每支號碼一項）、Org IDs。外部 Email 與外部號碼不會對到任何人，不出現選單。' },
            { title: '不選也可以', body: '選單只是提示：直接按 Enter 或逗號，就照打的字加入並比對。貼上整份名單時不出現選單。' },
          ]} />
        </Section>

        <Section eyebrow="Fixed" title="修好之後：留在原地，輕輕閃一下">
          <Why shot="nt-fixed" title="a19999 改成 ytchang" sub="Tina Chang 留在第一個位置，變成灰色，外圍閃一下細的綠框（不到 1 秒）"
            how="修好的標籤不移動；游標回到名單最後，但畫面不捲動。改完剛好和另一筆重複時，這一筆拿掉，原本那一筆閃一下。"
            why="使用者要確認剛剛改的那一筆真的好了。標籤跳走，名單長的時候就找不到它。訪談時「修好就跳走」被說很錯愕；綠框要很輕，使用者回饋只要「輕輕閃一下」。"
            not="每次修完就重新排序（紅色永遠在最前面）：修好的那一筆馬上跳到灰色區的最後。明顯的綠底或動畫：太搶眼。" />
        </Section>

        <Section eyebrow="Paste more" title="再貼一批：已經在畫面上的不動" lead="使用者常常分好幾批貼、邊貼邊修。第二批進來時，只安排新進來的標籤。">
          <Pair items={[
            ['more-before', '修好 a19999 之後', 'Tina Chang 在第一個位置；gywuu、cm.chen 還沒修'],
            ['more-after', '再貼一批：kylln, thliu, a20001, psyang', '兩筆找不到的排到最前面，新的人 Jason Liu 接在最後；psyang 已經在名單裡，不重複顯示。Tina Chang、gywuu、cm.chen 和其他標籤的順序不變'],
          ]} />
          <Notes items={[
            { title: '做法', body: '新進來的找不到的（紅色）放在名單最前面，新進來的找到的（灰色）接在最後，各自照輸入順序。已經在名單裡的標籤，包括還沒修的紅色和修好的灰色，順序都不變（前面多了新的紅色，所以整體往後挪，但彼此的前後不變）。有新的紅色時，名單捲回最上方。' },
            { title: '依據', body: '使用者記得剛剛修好、剛剛看過的標籤在哪裡。重新排整份名單，修好的標籤又跳回當初輸入的位置，使用者會懷疑「剛剛那筆還在嗎」，只好重新掃一遍；這也和「修好的留在原地」是同一個原則。新的紅色放最前面，貼完一眼就看到這一批要修什麼；新的灰色接在最後，和在輸入框一筆一筆打的結果一樣。' },
            { title: '沒有這樣做', body: '每次貼上都把整份名單重新排序（紅色在前、灰色照輸入順序）：修好的標籤會跳走。把所有紅色集中到最前面、灰色不動：紅色雖然都在一起，但前一批沒修的紅色會被搬動，畫面還是在變；剩下幾筆要修，說明文字已經會講。' },
          ]} />
        </Section>

        <Section eyebrow="Labels" title="標籤顯示什麼：依資料類型" lead="NT 帳號、Employee ID 顯示姓名（上面的截圖）。下面是電話、Org ID，以及「全部都換成姓名」會變成什麼樣子。">
          <Pair items={[
            ['phone-hover', '電話：顯示輸入的號碼，hover 看是誰', '0918-226-588 是 Grace Wu 的公務手機。號碼統一成同一種格式，方便對回清單。'],
            ['phone-shared', '多人共用的號碼：hover 看誰共用', '0919-000-119 是 ESH 值班機，三個人共用；只會寄一封 SMS 到這支號碼。'],
            ['org', 'Org ID：顯示代碼，hover 看名稱和人數', 'PENG 是 Platform Engineering 1，58 人。'],
            ['phone-names', '對照：同一份電話清單，全部換成姓名', '有對到的變成「姓名 · 號碼」，沒對到的只能是號碼：一半人、一半號碼，而且標籤變得很長。這是不採用的版本。'],
          ]} />
        </Section>

        <Section eyebrow="Why not" title="為什麼電話號碼不直接顯示成人" lead="研究頁把「都是姓名」和「依資料類型」兩種都做了。換成姓名之後，清單一半是姓名、一半是號碼，反而更難檢查。">
          <ol className="spec-notes cols">
            {[
              ['電話清單一定混到找不到人的號碼', '外部廠商、值班機、共用號碼都沒有對應的一個人，只能顯示號碼。對到的換成人、沒對到的留號碼，一份清單就有兩種長相，要先分辨「這是人還是號碼」才能檢查。'],
              ['使用者是拿自己的號碼清單來對', '他們從 Excel 複製一排號碼貼上來，檢查時想的是「這支有沒有進去」。畫面上變成人名，就對不回自己的清單。'],
              ['一個人可能有兩支號碼', '貼了兩支，就是要兩支都收到。都顯示「Grace Wu」看起來像重複了，也看不出哪個是哪支（上面對照圖的前兩個標籤）。'],
              ['一支號碼可能屬於好幾個人', '值班機是輪值的人共用，顯示任何一個姓名都不對。'],
              ['「姓名 · 號碼」太長', '要保留號碼又要顯示姓名，每個標籤都變成兩倍長；幾千個標籤時，一個畫面只看得到一半。'],
            ].map(([t, b], i) => <li key={i} style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}><span className="spec-pin">{i + 1}</span><div><b>{t}</b><p>{b}</p></div></li>)}
          </ol>
          <SpecTable head={['', 'NT 帳號、Employee ID', 'Email、電話、MVPN']} nowrap={[0]} rows={[
            ['看代碼知不知道是誰', '不知道（例：120389）', '通常知道，或根本不是人'],
            ['打錯一個字會怎樣', '可能變成另一個存在的人，只有看姓名才發現', '通常對不到任何人，會變紅色'],
            ['對得到的一定是一個人嗎', '是，一個代碼一個人', '不一定：有共用、外部、一人多支'],
            ['換成姓名後會不會混雜', '不會，整份都是姓名', '會，一半姓名、一半號碼'],
          ]} />
          <div className="spec-callout"><b>資訊沒有丟掉。</b>是誰，在三個地方看得到：標籤的 hover、打字時的選單、按 Proceed 之後的收件人表格（每一列都有姓名、組織和號碼）。如果討論後還是想在標籤上看出「這支有對到人」，可以考慮在號碼前加一個小人像圖示，文字仍是號碼；這個還沒做。</div>
        </Section>

        <Section eyebrow="Numbers" title="電話與 MVPN：以號碼為單位">
          <SpecTable head={['情況', '例子（範例資料）', '結果']} nowrap={[0]} rows={[
            ['號碼只屬於一個人', '0918-226-588（Grace Wu 的公務手機）', '加入這個人，SMS 寄到這支號碼'],
            ['一個人有兩支號碼', '0918-555-210（Jimmy Chen 的第二支公務手機）', '兩個標籤，兩支都收到'],
            ['一支號碼多人共用', '0919-000-119（ESH 值班機，三人）', '加入這支號碼本身，只寄一封 SMS；要寄給其中一人，在選單裡選他'],
            ['不屬於任何員工', '0987-654-321', '外部號碼，照樣寄'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '名單是用號碼給的，代表使用者要寄到「這一支」。所以 SMS 照貼上的號碼寄，不走舊系統「選人時隨機挑一支公司手機」。' },
            { title: '沒有這樣做', body: '把同一個人的兩支號碼合併成一個人：只會寄到其中一支，而且是哪一支無法控制。' },
          ]} />
        </Section>

        <Section eyebrow="Region" title="電話號碼：前面選國碼">
          <Why shot="region" title="Data type 選 Phone numbers 時，旁邊多一個 Region" max={760}
            how="預設 TW +886，可以改 US +1、JP +81、CN +86，和收件人搜尋的地區一樣。以 + 開頭的號碼用自己的國碼，所以同一份名單可以混不同地區。"
            why="Excel 裡的號碼通常沒有國碼。先選地區，才能判斷號碼對不對、統一格式，也才能比對是不是員工。"
            not="要求使用者自己在每支號碼前加國碼。" />
        </Section>

        <Section eyebrow="Guard" title="換資料類型前先確認">
          <Why shot="confirm" title="名單裡已經有東西時換資料類型" max={496}
            how="跳出「Change the data type?」，說明會清掉幾筆；按 Clear and change 才清掉並換類型。名單是空的就直接換。"
            why="已加入的內容沒辦法用另一種類型比對，換類型一定要清掉。幾千筆的名單不該因為一次誤點就沒了。"
            not="直接清掉。" />
        </Section>

        <Section eyebrow="Copy" title="說明文字與按鈕">
          <SpecTable head={['項目', '內容', '依據']} nowrap={[0]} rows={[
            ['說明文字', '{n} valid audiences. Click a tag to edit it.', '數字讓人確認匯入多少；後半句告訴人標籤可以點來改'],
            ['主要按鈕', 'Proceed', '按了是回到收件人欄位，不是直接寄出；寫 Add 或 Send 會讓人以為按了就寄'],
          ]} />
        </Section>

        <Section eyebrow="Open" title="還需要工程確認的事">
          <SpecTable head={['問題', '為什麼要問']} nowrap={[0]} rows={[
            ['SMS 能不能指定寄到哪一支號碼', '舊系統是隨機挑一支公司手機；「以號碼為單位」需要後端照貼上的號碼寄'],
            ['選單查伺服器的速度', '公司超過 10 萬人，打字停下約 0.3 秒再查，需要確認回應夠快'],
            ['幾萬個標籤的效能', '一次貼上幾萬筆時，比對和畫面是否還順'],
          ]} />
        </Section>
      </main>
    </>
  )
}
