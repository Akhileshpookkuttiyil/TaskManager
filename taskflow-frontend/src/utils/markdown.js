/**
 * Supported safe URL protocols for markdown links.
 */
const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

/**
 * Checks if a string contains ASCII control characters or non-printables.
 */
const hasControlCharacters = (str = "") => {
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if ((code >= 0 && code <= 31) || (code >= 127 && code <= 159)) {
      return true;
    }
  }
  return false;
};

/**
 * Strips whitespace and non-printable control characters.
 */
const stripWhitespaceAndControls = (str = "") => {
  let result = "";
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    if (code > 32 && (code < 127 || code > 159)) {
      result += str[i];
    }
  }
  return result;
};

/**
 * Decodes basic HTML entities back to raw characters for URL protocol validation.
 */
const decodeHtmlEntities = (str = "") => {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

/**
 * Escapes characters for safe inclusion in an HTML attribute value.
 */
export const escapeHtmlAttribute = (str = "") => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

/**
 * Validates whether a URL uses an explicitly approved protocol (https, http, mailto)
 * or is a safe relative path/anchor. Rejects dangerous protocols like javascript:, data:, vbscript:.
 */
export const isAllowedUrl = (url = "") => {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject ASCII control characters and non-printables
  if (hasControlCharacters(trimmed)) {
    return false;
  }

  // Reject quote characters in URLs to prevent attribute breakout attempts
  if (trimmed.includes('"') || trimmed.includes("'")) {
    return false;
  }

  // Reject protocol-relative URLs (//) and backslash evasions (\\, /\)
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.startsWith("\\")) {
    return false;
  }

  // Strip internal whitespace to detect obfuscated schemes like "java script:" or "data :"
  const compact = stripWhitespaceAndControls(trimmed).toLowerCase();
  if (
    compact.startsWith("javascript:") ||
    compact.startsWith("data:") ||
    compact.startsWith("vbscript:")
  ) {
    return false;
  }

  // Match URI scheme (alphanumeric starting with letter, followed by colon)
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase() + ":";
    return ALLOWED_PROTOCOLS.has(scheme);
  }

  // Safe relative paths or anchors (e.g. /tasks, #overview, ?status=active)
  if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("?")) {
    return true;
  }

  return false;
};

/**
 * Extremely lightweight and safe markdown parser.
 * Converts basic markdown (bold, italics, code, lists, links) into HTML.
 */
export const parseMarkdown = (text = "") => {
  if (!text) return "";

  // Escape HTML characters to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italics (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Inline code (`code`)
  html = html.replace(/`(.*?)`/g, "<code class='px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-xs font-mono'>$1</code>");

  // Links ([label](url)) - enforce strict protocol validation and balanced parens
  html = html.replace(/\[([^\]]+)\]\(\s*((?:[^\s()]+|\((?:[^\s()]+|\([^\s()]*\))*\))*)\s*\)/g, (match, label, rawUrl) => {
    const decodedUrl = decodeHtmlEntities(rawUrl).trim();
    if (isAllowedUrl(decodedUrl)) {
      const safeHref = escapeHtmlAttribute(decodedUrl);
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="font-medium text-neutral-900 hover:underline dark:text-white">${label}</a>`;
    }
    // Rejected scheme: render safe label text without generating an executable <a> tag
    return label;
  });

  // Split lines to detect block elements like lists
  const lines = html.split("\n");
  let inList = false;
  const processedLines = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Bullet list (- item or * item)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        processedLines.push("<ul class='list-disc pl-5 space-y-1 my-2'>");
        inList = true;
      }
      processedLines.push(`<li>${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        processedLines.push("</ul>");
        inList = false;
      }
      
      // Paragraph or empty line
      if (trimmed === "") {
        processedLines.push("<div class='h-2'></div>");
      } else {
        processedLines.push(`<p class='my-1.5 leading-relaxed'>${line}</p>`);
      }
    }
  });

  if (inList) {
    processedLines.push("</ul>");
  }

  return processedLines.join("\n");
};
