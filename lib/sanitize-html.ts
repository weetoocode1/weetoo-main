import DOMPurify from "isomorphic-dompurify";

// Configure DOMPurify with the same allowlist as the original implementation
const ALLOWED_TAGS = [
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
  "img",
];

const ALLOWED_ATTR = ["href", "title", "target", "rel", "src", "alt", "class"];

// Add a hook to enforce security for target="_blank" links
DOMPurify.addHook("afterSanitizeAttributes", (currentNode) => {
  if ("target" in currentNode) {
    const target = currentNode.getAttribute("target");
    if (target === "_blank") {
      // Enforce noopener noreferrer for security
      currentNode.setAttribute("rel", "noopener noreferrer");
    }
  }
});

export const sanitizeHtml = (html: string): string => {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
};

export default sanitizeHtml;
