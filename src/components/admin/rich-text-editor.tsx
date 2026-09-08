"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Anchor,
  Bold,
  Eye,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Table,
  EyeOff,
} from "lucide-react";

// ============================================================
// Lightweight HTML editor — textarea + toolbar that wraps the
// current selection with tags (no execCommand, string ops only).
// ============================================================

export interface InternalLinkOption {
  label: string;
  href: string;
  group: string;
}

export function RichTextEditor({
  value,
  onChange,
  rows = 12,
  variant = "basic",
  internalLinks = [],
  placeholder = "Write the content here. Use the toolbar for formatting.",
  previewClassName = "",
}: {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  variant?: "basic" | "full";
  internalLinks?: InternalLinkOption[];
  placeholder?: string;
  previewClassName?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  /** Apply a transformation on the textarea selection. */
  function apply(fn: (ctx: { sel: string; before: string; after: string }) => { text: string; selStart: number; selEnd: number }) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const ctx = {
      sel: value.slice(start, end),
      before: value.slice(0, start),
      after: value.slice(end),
    };
    const { text, selStart, selEnd } = fn(ctx);
    onChange(text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  }

  function wrapSel(open: string, close: string, ph: string) {
    apply(({ sel, before, after }) => {
      const inner = sel || ph;
      const text = `${before}${open}${inner}${close}${after}`;
      return { text, selStart: before.length + open.length, selEnd: before.length + open.length + inner.length };
    });
  }

  function prefixLines(prefix: string, numbered = false) {
    apply(({ sel, before, after }) => {
      const lineStart = before.lastIndexOf("\n") + 1;
      const head = before.slice(0, lineStart);
      const lines = (sel || "text").split("\n");
      const out = lines
        .map((line, i) => (numbered ? `${prefix}${i + 1}. ${line}` : `${prefix} ${line}`.replace(/^ +$/, "")))
        .join("\n");
      const text = `${head}${out}${after}`;
      return { text, selStart: lineStart, selEnd: lineStart + out.length };
    });
  }

  function insertAtCursor(str: string) {
    apply(({ sel, before, after }) => {
      const text = `${before}${str}${sel ? sel : ""}${after}`;
      return { text, selStart: before.length + str.length, selEnd: before.length + str.length + sel.length };
    });
  }

  function insertLink() {
    const url = window.prompt("Link URL (e.g. https://… or #/product/slug):");
    if (url === null) return;
    wrapSel(`<a href="${escapeAttr(url)}">`, "</a>", "link text");
  }

  function insertImage() {
    const url = window.prompt("Image URL (e.g. /uploads/photo.webp):");
    if (url === null) return;
    const alt = window.prompt("Image description (alt text):") || "";
    insertAtCursor(`<figure><img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" /><figcaption>${alt}</figcaption></figure>\n`);
  }

  function insertAnchor() {
    const id = window.prompt("Anchor id (letters/numbers/hyphens):");
    if (id === null || !id.trim()) return;
    wrapSel(`<span id="${escapeAttr(id.trim())}">`, "</span>", "anchor target");
  }

  function insertTable() {
    insertAtCursor(
      `<table>\n<thead><tr><th>Column 1</th><th>Column 2</th></tr></thead>\n<tbody>\n<tr><td>Row 1 · A</td><td>Row 1 · B</td></tr>\n<tr><td>Row 2 · A</td><td>Row 2 · B</td></tr>\n</tbody>\n</table>\n`,
    );
  }

  function insertInternal(href: string) {
    wrapSel(`<a href="${escapeAttr(href)}">`, "</a>", "link text");
  }

  const groups = groupBy(internalLinks);

  const btn = "h-8 w-8 p-0" as const;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1.5">
        <Button type="button" variant="ghost" size="icon" className={btn} title="Bold" onClick={() => wrapSel("<strong>", "</strong>", "bold text")}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={btn} title="Italic" onClick={() => wrapSel("<em>", "</em>", "italic text")}>
          <Italic className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button type="button" variant="ghost" size="icon" className={btn} title="Heading 2" onClick={() => prefixLines("<h2>")}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={btn} title="Heading 3" onClick={() => prefixLines("<h3>")}>
          <Heading3 className="h-4 w-4" />
        </Button>
        {variant === "full" ? (
          <Button type="button" variant="ghost" size="icon" className={btn} title="Heading 4" onClick={() => prefixLines("<h4>")}>
            <Heading4 className="h-4 w-4" />
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="icon" className={btn} title="Paragraph" onClick={() => prefixLines("<p>")}>
          <Pilcrow className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button type="button" variant="ghost" size="icon" className={btn} title="Bullet list" onClick={() => prefixLines("<li>", false)}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={btn} title="Numbered list" onClick={() => prefixLines("<li>", true)}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={btn} title="Quote" onClick={() => prefixLines("<blockquote>")}>
          <Quote className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button type="button" variant="ghost" size="icon" className={btn} title="Insert link" onClick={insertLink}>
          <Link2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={btn} title="Insert image" onClick={insertImage}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        {variant === "full" ? (
          <>
            <Button type="button" variant="ghost" size="icon" className={btn} title="Insert 2×2 table" onClick={insertTable}>
              <Table className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={btn} title="Insert anchor" onClick={insertAnchor}>
              <Anchor className="h-4 w-4" />
            </Button>
            {internalLinks.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" title="Insert internal link">
                    <Link2 className="h-3.5 w-3.5 mr-1" /> Internal
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto custom-scroll">
                  {Object.entries(groups).map(([group, items]) => (
                    <div key={group}>
                      <DropdownMenuLabel className="text-xs">{group}</DropdownMenuLabel>
                      {items.slice(0, 12).map((item) => (
                        <DropdownMenuItem key={item.href + item.label} onClick={() => insertInternal(item.href)} className="max-w-72 truncate">
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </>
        ) : null}
        <span className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1"
          onClick={() => setPreview((p) => !p)}
          title={preview ? "Back to editing" : "Preview rendered content"}
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? "Edit" : "Preview"}
        </Button>
      </div>

      {preview ? (
        <div
          className={`prose-content p-4 min-h-40 overflow-y-auto custom-scroll ${previewClassName}`}
          style={{ maxHeight: rows * 20 + 40 }}
          dangerouslySetInnerHTML={{ __html: value || "<p><em>Nothing to preview yet.</em></p>" }}
        />
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full resize-y bg-transparent p-4 font-mono text-sm leading-6 outline-none placeholder:text-muted-foreground/60"
          aria-label="HTML content editor"
        />
      )}
      <p className="border-t bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        Toolbar buttons wrap the selected text with HTML tags. HTML is sanitized on save (safe tags only).
      </p>
    </div>
  );
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function groupBy(links: InternalLinkOption[]): Record<string, InternalLinkOption[]> {
  const out: Record<string, InternalLinkOption[]> = {};
  for (const l of links) {
    (out[l.group] ||= []).push(l);
  }
  return out;
}
