// Builds a password-locked single-file page from a Vite dist folder.
// The app's CSS + JS are encrypted (PBKDF2-SHA256 → AES-GCM); the page only holds ciphertext
// and a small unlock form, so the prototype can't be read from the source without the password.
// usage: node tools/lock.mjs <password> <out.html> [project dir, e.g. teams or teams/split-spec] [title]
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { webcrypto as crypto } from 'node:crypto'

const [pw, out, proj = 'teams', title = 'MNP Prototype'] = process.argv.slice(2)
const dir = proj + '/dist/assets/'
const pick = ext => readFileSync(dir + readdirSync(dir).find(f => f.endsWith(ext)), 'utf8')
const payload = JSON.stringify({ css: pick('.css'), js: pick('.js') })

const ITER = 250000
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12))
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey'])
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload)))
const b64 = u => Buffer.from(u).toString('base64')

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
<style id="gate-style">
/* gate-only colors, prefixed so they never shadow the design system tokens; removed on unlock */
:root { --gate-bg: #f5f6f8; --gate-card: #fff; --gate-fg: #1f2329; --gate-muted: #646a73; --gate-line: #d0d3d6; --gate-primary: #1456f0; --gate-primary-hover: #0f45c7; --gate-error: #d83931; --gate-ring: rgba(20,86,240,.25); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --gate-bg: #141518; --gate-card: #1e1f23; --gate-fg: #e8eaed; --gate-muted: #a0a4ab; --gate-line: #3a3c42; --gate-primary: #4c84ff; --gate-primary-hover: #6b9bff; --gate-error: #f2645b; --gate-ring: rgba(76,132,255,.3); } }
:root[data-theme="dark"] { --gate-bg: #141518; --gate-card: #1e1f23; --gate-fg: #e8eaed; --gate-muted: #a0a4ab; --gate-line: #3a3c42; --gate-primary: #4c84ff; --gate-primary-hover: #6b9bff; --gate-error: #f2645b; --gate-ring: rgba(76,132,255,.3); }
body { margin: 0; background: var(--gate-bg); color: var(--gate-fg); font-family: Roboto, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif; }
#gate { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
#gate form { width: 100%; max-width: 360px; background: var(--gate-card); border: 1px solid var(--gate-line); border-radius: 12px; padding: 32px 24px; box-sizing: border-box; display: flex; flex-direction: column; gap: 16px; }
#gate .logo { width: 32px; height: 32px; border-radius: 8px; background: var(--gate-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
#gate h1 { margin: 0; font-size: 18px; font-weight: 600; }
#gate p { margin: 4px 0 0; font-size: 14px; color: var(--gate-muted); }
#gate label { font-size: 14px; font-weight: 500; display: flex; flex-direction: column; gap: 6px; }
#gate input { height: 36px; border: 1px solid var(--gate-line); border-radius: 6px; padding: 0 12px; font: inherit; font-size: 14px; background: var(--gate-card); color: var(--gate-fg); outline: none; }
#gate input:focus { border-color: var(--gate-primary); box-shadow: 0 0 0 3px var(--gate-ring); }
#gate input[aria-invalid="true"] { border-color: var(--gate-error); }
#gate .err { font-size: 13px; color: var(--gate-error); min-height: 18px; margin-top: -8px; }
#gate button { height: 36px; border: 0; border-radius: 6px; background: var(--gate-primary); color: #fff; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; }
#gate button:hover { background: var(--gate-primary-hover); }
#gate button:disabled { opacity: .6; cursor: progress; }
</style>
<div id="gate">
  <form autocomplete="off">
    <div class="logo">T</div>
    <div><h1>${title}</h1><p>請輸入密碼查看 · Enter the password to view</p></div>
    <label>密碼 Password<input id="pw" type="password" autofocus aria-describedby="err"></label>
    <div id="err" class="err" role="alert"></div>
    <button type="submit">進入 Enter</button>
  </form>
</div>
<div id="root"></div>
<script>
(function () {
  var D = { salt: "${b64(salt)}", iv: "${b64(iv)}", it: ${ITER}, ct: "${b64(ct)}" }
  var un = function (s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0) }) }
  var form = document.querySelector('#gate form'), pw = document.getElementById('pw'), err = document.getElementById('err'), btn = form.querySelector('button')
  async function open(p) {
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(p), 'PBKDF2', false, ['deriveKey'])
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: un(D.salt), iterations: D.it, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
    var app = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: un(D.iv) }, key, un(D.ct))))
    var st = document.createElement('style'); st.textContent = app.css; document.head.appendChild(st)
    document.getElementById('gate').remove(); document.getElementById('gate-style').remove()
    var sc = document.createElement('script'); sc.type = 'module'; sc.textContent = app.js; document.body.appendChild(sc)
  }
  form.addEventListener('submit', async function (e) {
    e.preventDefault(); btn.disabled = true; err.textContent = ''
    try { await open(pw.value); try { sessionStorage.setItem('mnp-pw', pw.value) } catch (_) {} }
    catch (_) { err.textContent = '密碼不正確 · Wrong password'; pw.setAttribute('aria-invalid', 'true'); pw.select(); btn.disabled = false }
  })
  pw.addEventListener('input', function () { pw.removeAttribute('aria-invalid'); err.textContent = '' })
  // stay unlocked on reload within the same tab
  var saved = null; try { saved = sessionStorage.getItem('mnp-pw') } catch (_) {}
  if (saved) open(saved).catch(function () { try { sessionStorage.removeItem('mnp-pw') } catch (_) {} })
})()
</script>
`
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log('wrote', out, Math.round(html.length / 1024) + 'KB')
