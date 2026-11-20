// Batch import tags: the design (option D of the tag study since 2026-11-20, with labels by data type; a live demo at
// the top) and why each part is the way it is, with screenshots of the study (tools/tagwhy-shots.mjs). Answers "why not
// show the person for a phone number" (2026-11-19). 2026-11-20: the text cut to what's needed, a little larger
// (tagwhy.css). Nothing here changes the prototype.
import * as React from 'react'
import { Figure, Notes, Section, Shot, SpecTable, type Note } from '../parts'
import { Demo } from '../importtags/ImportTags'

// one design decision: the screenshot, then what it does, why, and what was set aside
function Why({ shot, title, sub, how, why, not, max }: { shot: string; title: string; sub?: string; how: React.ReactNode; why: React.ReactNode; not?: React.ReactNode; max?: number }) {
  const notes: Note[] = [{ title: '做法', body: how }, { title: '依據', body: why }]
  if (not) notes.push({ title: '沒有這樣做', body: not })
  return <Figure label={title} sub={sub} shot={shot} max={max} notes={notes} wideNotes />
}

// screenshots one above the other, each with a caption
function Shots({ items }: { items: [string, string, string][] }) {
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
    <div className="tw">
      <div className="spec-top">
        <div className="spec-wrap flex flex-col gap-1 pt-4 pb-3">
          <span className="spec-eyebrow">MNP · Batch import · 標籤</span>
          <h1 className="spec-h1">批次匯入標籤的設計依據</h1>
          <span className="tw-sub">2026/11/20 · 截圖用原型的範例資料</span>
        </div>
      </div>
      <main className="spec-wrap spec-main">
        <Section eyebrow="Try" title="先試試" lead="現在的設計，可以直接操作。">
          <Demo mode="D" show="type" />
        </Section>

        <Section eyebrow="Summary" title="標籤顯示什麼" lead="看使用者手上的清單是什麼：看不出是誰的代碼顯示姓名，看得懂的值照原樣顯示。">
          <SpecTable head={['資料類型', '標籤', '滑過', '依據']} nowrap={[0]} rows={[
            ['NT accounts、Employee IDs', '大頭照與姓名', '輸入的值 · 組織', '代碼看不出是誰；打錯一個字可能是另一個人，看姓名才發現'],
            ['Emails、Phone numbers、MVPN', '輸入的值', '—', '使用者拿自己的清單來對；值本身看得懂'],
            ['Org IDs', '組織代碼', '名稱 · 人數', '代碼難懂，看名稱才確定沒選錯'],
            ['有問題的', '紅色，輸入的值', '問題的原因', '要知道怎麼改'],
          ]} />
        </Section>

        <Section eyebrow="Paste" title="貼上：照輸入順序">
          <Why shot="nt-paste" title="貼上 26 筆 NT 帳號，3 筆有問題" max={1184}
            how="照貼上的順序；有問題的是紅色，留在原位。重複的只留一個。說明文字寫幾筆 valid、幾筆 invalid。"
            why="使用者常要回原始清單（Excel、Email）查某一筆，同一個順序最好對。"
            not="紅色排最前面：名單長時還是要捲動，順序也對不回原始清單。" />
        </Section>

        <Section eyebrow="Edit" title="修改：點標籤變回文字">
          <Shots items={[
            ['nt-edit', '現在', '標籤變回文字，游標在字裡，位置不變'],
            ['now-edit', '之前', '換成一個有外框的輸入框，像欄位裡又有一個欄位'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '改錯字就是改字，和 Gmail、Outlook 的收件人欄一樣。' },
            { title: '結束', body: 'Enter 或點別處儲存，Esc 取消，清空就是刪除。' },
          ]} />
        </Section>

        <Section eyebrow="Suggest" title="打字時：選單列出比對到的人">
          <Shots items={[
            ['nt-edit-sug', '修改標籤時', '打 ytch，出現 Tina Chang'],
            ['nt-type-sug', '在名單最後打字時', '打 chen，列出符合的人'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '打字當下就確認是不是要的人。' },
            { title: '不選也可以', body: '直接按 Enter 或逗號，照打的字加入。外部 Email、外部號碼不會對到人，不出現選單。' },
          ]} />
        </Section>

        <Section eyebrow="Fixed" title="修好：留在原地">
          <Why shot="nt-fixed" title="a19999 改成 ytchang" sub="Tina Chang 留在原位，變灰色，外框閃一下綠色"
            how="修好的標籤不移動，說明文字的數字跟著更新。"
            why="使用者要看到剛改的那筆真的好了；標籤跳走就找不到。"
            not="修好就重新排序（原型目前的做法）。" />
        </Section>

        <Section eyebrow="Show only invalid" title="名單很長時：只看有問題的">
          <Shots items={[
            ['invalid-hover', '滑過「3 invalid」', '和列表上的「n not sent」一樣，滑過才有底線'],
            ['only-fixed', '點下去', '只剩有問題的；在這裡修好的留在畫面上'],
            ['only-back', '按 Show all', '回到完整名單，修好的在原位'],
          ]} />
          <Notes cols items={[
            { title: '依據', body: '幾百筆裡找幾筆錯，捲著找很慢。名單短時用不到，所以入口只是那個數字，不另外放按鈕。' },
            { title: '沒有這樣做', body: '另外放 Show only invalid、Remove all 連結：比數字還顯眼，畫面變複雜。' },
          ]} />
        </Section>

        <Section eyebrow="Paste more" title="再貼一批：接在最後">
          <Why shot="more-after" title="再貼 kylln, thliu, a20001, psyang" sub="新的接在最後；psyang 已經在名單裡，不重複"
            how="新的值照順序接在最後，原本的標籤都不動。"
            why="畫面上的東西不該自己移動。" />
        </Section>

        <Section eyebrow="Keyboard" title="鍵盤：和收件人欄一樣">
          <Why shot="key-focus" title="從輸入框按 ← 移到標籤上" sub="有焦點框；紅色標籤同時顯示原因"
            how="整個欄位只佔一個 Tab 位置，用左右鍵在標籤之間移動（見下表）。"
            why="使用者習慣 Gmail、Outlook 的操作；名單有幾百筆時，按 Tab 不必經過每個標籤。"
            not="空的輸入框按 Backspace 直接刪掉最後一個標籤：容易誤刪。" />
          <SpecTable head={['在哪裡', '按鍵', '結果']} nowrap={[0, 1]} rows={[
            ['輸入框', '←（游標在最前面）', '移到最後一個標籤'],
            ['輸入框（空的）', 'Backspace', '移到最後一個標籤；再按一次才刪'],
            ['標籤上', '← / →', '前一個／後一個；最後一個按 → 回到輸入框'],
            ['標籤上', 'Home / End', '第一個標籤／回到輸入框'],
            ['標籤上', 'Enter', '修改'],
            ['標籤上', 'Backspace / Delete', '刪除，焦點移到旁邊那一個'],
            ['標籤上', '打字、Esc', '回到輸入框'],
            ['任何地方', 'Tab', '離開欄位'],
          ]} />
        </Section>

        <Section eyebrow="Labels" title="其他資料類型">
          <Shots items={[
            ['phone-paste', 'Phone numbers', '顯示輸入的號碼，統一格式；沒有滑過提示'],
            ['org', 'Org IDs', '顯示代碼，滑過看名稱和人數'],
          ]} />
        </Section>

        <Section eyebrow="Why not" title="為什麼電話不顯示成人">
          <Shots items={[['phone-names', '如果都換成姓名', '對到的變「姓名 · 號碼」，沒對到的只能是號碼：一半人、一半號碼，標籤也變長']]} />
          <ol className="spec-notes cols">
            {[
              ['清單一定混到不是人的號碼', '外部、值班機都只能顯示號碼，一份清單會有兩種長相。'],
              ['使用者拿號碼清單來對', '畫面變成姓名，就對不回自己的清單。'],
              ['一人多支、一支多人', '兩支號碼都顯示同一個名字，看起來像重複；值班機顯示誰都不對。'],
              ['標籤變兩倍長', '同時要姓名和號碼，一個畫面只看得到一半。'],
            ].map(([t, b], i) => <li key={i} style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}><span className="spec-pin">{i + 1}</span><div><b>{t}</b><p>{b}</p></div></li>)}
          </ol>
          <SpecTable head={['', 'NT 帳號、Employee ID', 'Email、電話、MVPN']} nowrap={[0]} rows={[
            ['看值知道是誰嗎', '不知道', '通常知道，或根本不是人'],
            ['打錯一個字', '可能變成另一個人', '通常對不到人，變紅色'],
            ['一定對到一個人嗎', '是', '不一定'],
          ]} />
          <div className="spec-callout">是誰，打字時的選單和按 Proceed 之後的收件人表格都看得到。</div>
        </Section>

        <Section eyebrow="Numbers" title="電話與 MVPN：以號碼為單位">
          <SpecTable head={['情況', '結果']} nowrap={[0]} rows={[
            ['號碼屬於一個人', '加入這個人，SMS 寄到這支'],
            ['一人兩支', '兩個標籤，兩支都寄'],
            ['一支多人共用（值班機）', '加入這支號碼，只寄一封；要寄給其中一人，在選單選他'],
            ['不屬於員工', '外部號碼，照樣寄'],
          ]} />
          <Notes items={[{ title: '依據', body: '使用者給的是號碼，就是要寄到這一支，不是舊系統隨機挑的那支。' }]} />
        </Section>

        <Section eyebrow="Region" title="電話：先選國碼">
          <Why shot="region" title="選 Phone numbers 時多一個 Region" max={760}
            how="預設 TW +886；以 + 開頭的號碼用自己的國碼。"
            why="Excel 裡的號碼通常沒有國碼，要先知道地區才能判斷號碼。" />
        </Section>

        <Section eyebrow="Guard" title="換資料類型前先確認">
          <Why shot="confirm" title="名單有東西時換類型" max={496}
            how="確認後才清空並換類型；名單是空的就直接換。"
            why="換類型一定要清空，幾千筆不該因為一次誤點就沒了。" />
        </Section>

        <Section eyebrow="Copy" title="文字">
          <SpecTable head={['項目', '內容', '依據']} nowrap={[0]} rows={[
            ['說明文字', '{n} valid · {m} invalid (click a tag to edit it)', '只有「{m} invalid」是紅色，要處理的只有它。用 invalid：不一定是查無此人，也可能是格式錯'],
            ['都沒問題', '{n} valid', ''],
            ['只看有問題的', '{m} invalid (showing {x} of {total}) · Show all', '讓人知道看的不是整份，以及怎麼回去'],
            ['按鈕', 'Proceed', '按了回到收件人欄位，不是寄出'],
          ]} />
        </Section>

        <Section eyebrow="Open" title="待工程確認">
          <SpecTable head={['問題', '原因']} nowrap={[0]} rows={[
            ['SMS 能否指定寄到哪一支', '舊系統隨機挑一支公司手機'],
            ['選單查詢速度', '公司超過 10 萬人'],
            ['幾萬個標籤的效能', '一次貼上幾萬筆'],
          ]} />
        </Section>
      </main>
    </div>
  )
}
