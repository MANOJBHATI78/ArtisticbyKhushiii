/**
 * Custom code injection — parses the owner's raw HTML snippets (Admin → Site
 * Settings → Custom Code) into React nodes so they render on the SERVER and
 * appear in View Source / raw HTML for crawlers.
 *
 * Supported tags: <meta>, <link>, <script src>, inline <script>, <style>,
 * <title>, <noscript>. React 19 hoists <meta>/<link>/<title> into <head>
 * automatically; scripts render + execute in the body (how the GA4 tag works).
 *
 * Also contains the path matcher for the per-page Schema Manager entries.
 */

export type CustomCodeNode =
  | { kind: "meta"; attrs: Record<string, string> }
  | { kind: "link"; attrs: Record<string, string> }
  | { kind: "script-src"; attrs: Record<string, string> }
  | { kind: "script-inline"; attrs: Record<string, string>; content: string }
  | { kind: "style"; content: string }
  | { kind: "title"; content: string }
  | { kind: "noscript"; content: string };

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    // Never allow inline event handlers from pasted snippets (onload=… etc.)
    if (name.startsWith("on")) continue;
    attrs[name] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

export function parseCustomCode(raw: string): CustomCodeNode[] {
  if (!raw || !raw.trim()) return [];
  // Strip comments — they're for humans, not for the DOM.
  const html = raw.replace(/<!--[\s\S]*?-->/g, "");
  const nodes: CustomCodeNode[] = [];

  const tagRe = /<(meta|link|script|style|title|noscript)(\s[^>]*)?>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const tag = m[1].toLowerCase();
    const attrs = parseAttrs(m[2] || "");
    if (tag === "meta" || tag === "link") {
      nodes.push({ kind: tag, attrs });
      continue;
    }
    // Paired tag — capture everything up to its closing tag.
    const closeRe = new RegExp(`</${tag}\\s*>`, "i");
    const rest = html.slice(m.index + m[0].length);
    const closeMatch = rest.match(closeRe);
    const content = closeMatch ? rest.slice(0, closeMatch.index ?? 0) : "";
    if (closeMatch) tagRe.lastIndex = m.index + m[0].length + (closeMatch.index ?? 0) + closeMatch[0].length;

    if (tag === "script") {
      if (attrs.src) nodes.push({ kind: "script-src", attrs });
      else nodes.push({ kind: "script-inline", attrs, content });
    } else if (tag === "noscript") {
      nodes.push({ kind: "noscript", content });
    } else if (tag === "style") {
      nodes.push({ kind: "style", content });
    } else {
      nodes.push({ kind: "title", content });
    }
  }
  return nodes;
}

/**
 * Does a Schema Manager entry's path match the current page path?
 *  - "/"          → only the homepage
 *  - "/products"  → exactly /products
 *  - "/product/*" → every path starting with /product/
 *  - "/*"         → the whole site
 */
export function schemaPathMatches(entryPath: string, currentPath: string): boolean {
  const entry = entryPath.trim().replace(/\/+$/, "") || "/";
  const current = currentPath.trim().replace(/\/+$/, "") || "/";
  if (entry === "/*" || entry === "/") return current === "/" ? true : entry === "/*";
  if (entry.endsWith("/*")) {
    const prefix = entry.slice(0, -1); // keep the trailing "/"
    return current.startsWith(prefix);
  }
  return entry === current;
}
