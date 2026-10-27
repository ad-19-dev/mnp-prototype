# MNP prototype — rebuilt on @qijenchen/design-system

把 MNP v2 prototype(Preact 單檔版)用 `@qijenchen/design-system@0.1.0-beta.147` 的元件重做一次。
功能、假資料、文案、驗證規則都跟 v2 一樣。

## 怎麼跑

需要 Node 22+。

```
npm install --legacy-peer-deps
npm run dev        # 開發模式,瀏覽器打開終端機顯示的網址
npm run build      # 輸出到 dist/
```

## 檔案在哪

```
src/lib/data.ts              假資料(人、組織、群組、模板、訊息)與比對規則
src/lib/compose.ts           發送流程規則:觸及人數、審核、欄位驗證
src/lib/store.ts             三個頁面共用的資料(訊息、群組、模板)
src/components/shell.tsx     tWorkspace 上方列 + MNP 側欄(DS AppShell)
src/components/ui.tsx        共用小元件(狀態 Tag、通道圖示、表單欄位、確認對話框)
src/components/RecvInput.tsx 收件人複合輸入(類型 + 搜尋)
src/components/RichText.tsx  Email 編輯器(DS 沒有,自己用 DS 按鈕組出來)
src/pages/messages/          訊息列表、詳情、三步驟發送流程、對話框
src/pages/groups/            Audience Group 列表與編輯
src/pages/templates/         Templates 列表與編輯
```
