import sanitizeHtml from "sanitize-html";

const TEXT_ALIGN = [/^(left|right|center|justify)$/];
const SIZE = [/^\d{1,4}px$/];

// The rich text the editor can produce. Anything else is stripped before saving.
// Keep in sync with the Shopify app's sanitize-description.server.js.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "span", "a",
    "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
    "img", "div", "iframe",
    "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    div: ["data-youtube-video"],
    iframe: ["src", "width", "height", "allowfullscreen", "frameborder", "allow", "title"],
    th: ["colspan", "rowspan", "colwidth"],
    td: ["colspan", "rowspan", "colwidth"],
    "*": ["style"],
  },
  allowedStyles: {
    "*": { "text-align": TEXT_ALIGN },
    span: { color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]{3,20}$/i] },
    table: { "min-width": SIZE, width: SIZE },
    col: { "min-width": SIZE, width: SIZE },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["https"], iframe: ["https"] },
  allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com"],
  allowIframeRelativeUrls: false,
  selfClosing: [...sanitizeHtml.defaults.selfClosing, "col"],
  // Images and videos whose source was removed as unsafe are dropped entirely.
  exclusiveFilter: (frame) => ["img", "iframe"].includes(frame.tag) && !frame.attribs.src,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}),
        ...(attribs.target && attribs.target !== "_blank" ? { target: "" } : {}),
      },
    }),
  },
};

export function sanitizeDescription(html: string) {
  return sanitizeHtml(html, OPTIONS);
}
