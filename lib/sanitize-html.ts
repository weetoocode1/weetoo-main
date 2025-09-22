// Lightweight HTML sanitizer with an allowlist, no external dependencies
// Intended to remove dangerous tags/attributes and unsafe URL protocols

const GLOBAL_ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "div",
  "a",
  // Images are typically handled separately in this app, but keep for safety
  // If you do not want inline images in content, remove "img" from this list
  "img",
]);

const ALLOWED_ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title"]),
  // Generic elements may keep only class for typography styling
  _generic: new Set(["class"]),
};

const SAFE_URL_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

const isSafeUrl = (value: string): boolean => {
  try {
    const url = new URL(value, "http://localhost");
    return SAFE_URL_PROTOCOLS.includes(url.protocol);
  } catch {
    // Not a valid absolute/relative URL; disallow javascript: and data: by scan
    const lowered = value.trim().toLowerCase();
    if (lowered.startsWith("javascript:")) return false;
    if (lowered.startsWith("data:")) return false;
    return true;
  }
};

export const sanitizeHtml = (html: string): string => {
  if (!html) return "";
  // Guard for non-browser environments
  if (typeof document === "undefined") {
    return html;
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const sanitizeNode = (node: Node) => {
    // Remove script/style/comment nodes outright
    if (node.nodeType === Node.COMMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (!GLOBAL_ALLOWED_TAGS.has(tag)) {
      // Unwrap the element but preserve its children text
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }

    // Remove event handlers and non-allowlisted attributes
    const allowedForTag = new Set([
      ...(ALLOWED_ATTRS_BY_TAG._generic || new Set<string>()),
      ...(ALLOWED_ATTRS_BY_TAG[tag] || new Set<string>()),
    ]);

    // Iterate over a copy since we'll mutate
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      // Remove event handlers and style entirely
      if (name.startsWith("on") || name === "style") {
        el.removeAttribute(attr.name);
        return;
      }

      if (!allowedForTag.has(name)) {
        el.removeAttribute(attr.name);
        return;
      }

      // URL safety checks for href/src
      if (
        (tag === "a" && name === "href") ||
        (tag === "img" && name === "src")
      ) {
        if (!isSafeUrl(value)) {
          el.removeAttribute(attr.name);
          return;
        }
      }

      // Enforce rel=noopener for target=_blank links
      if (tag === "a" && name === "target" && value === "_blank") {
        const currentRel = el.getAttribute("rel") || "";
        const needed = ["noopener", "noreferrer"];
        const relParts = new Set(currentRel.split(/\s+/).filter(Boolean));
        needed.forEach((p) => relParts.add(p));
        el.setAttribute("rel", Array.from(relParts).join(" "));
      }
    });

    // Recurse
    Array.from(el.childNodes).forEach(sanitizeNode);
  };

  Array.from(template.content.childNodes).forEach(sanitizeNode);
  return template.innerHTML;
};

export default sanitizeHtml;
