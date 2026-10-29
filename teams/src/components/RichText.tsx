// Rich text editor for email bodies. The DS has no editor, so this one is built from
// DS Buttons (toolbar), Popover + Input (link) and the DS field colours.
// React renders the editable element once per `seedKey` and never touches its children,
// so typing keeps the caret where it is.
import * as React from 'react'
import { Button, ButtonDivider, Input, Popover, PopoverAnchor, PopoverContent, cn } from '@qijenchen/design-system'
import { Bold, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline } from 'lucide-react'
import { cleanHtml, escHtml } from '../lib/data'
import { flash } from '../lib/store'
import { L } from '../lib/i18n'

export function MailHtml({ html, className }: { html: string; className?: string }) {
  return <div className={cn('mail-html rounded-md border border-divider bg-surface p-3 text-body', className)} dangerouslySetInnerHTML={{ __html: cleanHtml(html) || '<p class="text-fg-muted">' + L('No email text.', '沒有內文。') + '</p>' }} />
}

export function RichText({ id, seedKey, html, onInput, error, placeholder, label, readOnly }: {
  id: string; seedKey: string | number; html: string; onInput: (html: string, text: string) => void
  error?: boolean; placeholder?: string; label: string; readOnly?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [fmt, setFmt] = React.useState<Record<string, boolean>>({})
  const [link, setLink] = React.useState<null | { url: string; editing: boolean }>(null)
  const range = React.useRef<Range | null>(null)
  const linkA = React.useRef<HTMLAnchorElement | null>(null)
  const [empty, setEmpty] = React.useState(!html)
  // seed the editor whenever the key changes (template applied, mode switched)
  const seeded = React.useRef<string | number | null>(null)
  React.useLayoutEffect(() => {
    if (ref.current && seeded.current !== seedKey) { ref.current.innerHTML = html; seeded.current = seedKey; setEmpty(!(ref.current.innerText || '').trim()) }
  })
  if (readOnly) return <MailHtml html={html} />

  const commit = () => { const el = ref.current; if (!el) return; const t = (el.innerText || '').replace(/ /g, ' '); setEmpty(!t.trim()); onInput(el.innerHTML, t) }
  const sync = () => {
    const q = (c: string) => { try { return document.queryCommandState(c) } catch { return false } }
    const sel = window.getSelection(), node = sel && sel.anchorNode
    const elx = node ? (node.nodeType === 1 ? node as Element : node.parentElement) : null
    const f = { bold: q('bold'), italic: q('italic'), underline: q('underline'), ul: q('insertUnorderedList'), ol: q('insertOrderedList'), link: !!(elx && elx.closest('[data-rte] a')) }
    if (Object.keys(f).some(k => (f as any)[k] !== !!fmt[k])) setFmt(f)
  }
  const cmd = (c: string) => {
    const el = ref.current
    if (!el) return
    if (document.activeElement !== el) el.focus()
    document.execCommand(c, false)
    commit(); sync()
  }
  const openLink = () => {
    const el = ref.current, sel = window.getSelection()
    if (!el || !sel || !sel.rangeCount || !el.contains(sel.getRangeAt(0).commonAncestorContainer)) { flash(L('Click in the text first', '請先點一下內文'), 'err'); return }
    const r = sel.getRangeAt(0), start = r.startContainer.nodeType === 1 ? r.startContainer as Element : r.startContainer.parentElement
    const a = start && start.closest('a')
    if (a && el.contains(a)) { const rr = document.createRange(); rr.selectNodeContents(a); range.current = rr; linkA.current = a }
    else { range.current = r.cloneRange(); linkA.current = null }
    setLink({ url: a ? a.getAttribute('href') || '' : 'https://', editing: !!a })
  }
  const restore = () => {
    const el = ref.current, sel = window.getSelection()
    if (!el || !range.current || !sel) return false
    el.focus(); sel.removeAllRanges(); sel.addRange(range.current)
    return true
  }
  const applyLink = () => {
    let url = (link?.url || '').trim()
    if (!url || url === 'https://') { flash(L('Enter a link', '請輸入連結'), 'err'); return }
    if (!/^(https?:\/\/|mailto:)/i.test(url)) url = 'https://' + url
    if (!restore()) { setLink(null); return }
    if (linkA.current) linkA.current.setAttribute('href', url)
    else if (range.current!.collapsed) document.execCommand('insertHTML', false, '<a href="' + escHtml(url) + '">' + escHtml(url.replace(/^https?:\/\//, '')) + '</a>&nbsp;')
    else document.execCommand('createLink', false, url)
    setLink(null); commit()
  }
  const unlink = () => { if (restore()) document.execCommand('unlink', false); setLink(null); commit() }
  const hold = (e: React.MouseEvent) => e.preventDefault()
  const tb = (c: string, label: string, Icon: typeof Bold, on?: boolean) => (
    <Button variant="text" size="sm" iconOnly startIcon={Icon} aria-label={label} pressed={!!on} onMouseDown={hold} onClick={() => cmd(c)} />
  )
  return (
    <div className={cn('w-full overflow-hidden rounded-md border bg-surface focus-within:border-primary', error ? 'border-error' : 'border-border hover:border-border-hover')} data-err={error ? '' : undefined}>
      <div role="toolbar" aria-label={L('Formatting', '格式')} className="flex flex-wrap items-center gap-0.5 border-b border-divider bg-neutral-1 px-1 py-1">
        {tb('bold', L('Bold (Ctrl+B)', '粗體 (Ctrl+B)'), Bold, fmt.bold)}
        {tb('italic', L('Italic (Ctrl+I)', '斜體 (Ctrl+I)'), Italic, fmt.italic)}
        {tb('underline', L('Underline (Ctrl+U)', '底線 (Ctrl+U)'), Underline, fmt.underline)}
        <ButtonDivider />
        <Popover open={!!link} onOpenChange={o => { if (!o) setLink(null) }}>
          <PopoverAnchor asChild>
            <span><Button variant="text" size="sm" iconOnly startIcon={Link2} aria-label={L('Link', '連結')} pressed={!!fmt.link} onMouseDown={hold} onClick={openLink} /></span>
          </PopoverAnchor>
          <PopoverContent align="start" className="w-96 p-3">
            <div className="flex flex-col gap-2">
              <label htmlFor={id + '-url'} className="text-body font-medium">{L('Link', '連結')}</label>
              <Input id={id + '-url'} size="sm" autoFocus value={link?.url || ''} placeholder="https://"
                onChange={e => setLink(l => l && { ...l, url: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } }} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="tertiary" onClick={() => setLink(null)}>{L('Cancel', '取消')}</Button>
                {link?.editing ? <Button size="sm" variant="tertiary" onClick={unlink}>{L('Remove', '移除')}</Button> : null}
                <Button size="sm" variant="primary" onClick={applyLink}>{link?.editing ? L('Update', '更新') : L('Add', '加入')}</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <ButtonDivider />
        {tb('insertUnorderedList', L('Bulleted list', '項目符號'), List, fmt.ul)}
        {tb('insertOrderedList', L('Numbered list', '編號清單'), ListOrdered, fmt.ol)}
        <ButtonDivider />
        {tb('removeFormat', L('Clear formatting', '清除格式'), RemoveFormatting, false)}
      </div>
      <div className="relative">
        {empty ? <div className="pointer-events-none absolute left-3 top-2.5 text-body text-fg-muted" aria-hidden>{placeholder}</div> : null}
        <div
          ref={ref} id={id} data-rte contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} aria-invalid={error || undefined}
          className="mail-html min-h-48 px-3 py-2 text-body outline-none"
          onInput={commit} onKeyUp={sync} onMouseUp={sync}
          onPaste={e => { const t = e.clipboardData.getData('text/plain'); e.preventDefault(); document.execCommand('insertText', false, t) }}
        />
      </div>
    </div>
  )
}
