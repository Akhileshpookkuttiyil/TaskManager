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
 * Regex to match markdown checklist items on a single line.
 * Matches: - [ ] item, - [x] item, - [X] item, * [ ] item, etc.
 */
export const CHECKLIST_ITEM_REGEX = /^[-*]\s+\[([ xX])\](?:\s+(.*))?$/;

/**
 * Extracts checklist progress metrics from raw markdown text.
 * Returns { total, completed, percent }.
 */
export const extractChecklistProgress = (text = "") => {
  if (!text || typeof text !== "string") {
    return { total: 0, completed: 0, percent: 0 };
  }

  const lines = text.split("\n");
  let total = 0;
  let completed = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(CHECKLIST_ITEM_REGEX);
    if (match) {
      total += 1;
      if (match[1].toLowerCase() === "x") {
        completed += 1;
      }
    }
  }

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent };
};

/**
 * Toggles a checklist item at the specified zero-based itemIndex.
 * Preserves surrounding indentation, bullet character (- or *), and label content.
 * Returns the modified markdown text.
 */
export const toggleChecklistItem = (text = "", itemIndex = 0) => {
  if (!text || typeof text !== "string" || itemIndex < 0) {
    return text;
  }

  const lines = text.split("\n");
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const match = trimmed.match(CHECKLIST_ITEM_REGEX);

    if (match) {
      if (currentIndex === itemIndex) {
        const isChecked = match[1].toLowerCase() === "x";
        const newBox = isChecked ? "[ ]" : "[x]";
        lines[i] = line.replace(/(\s*[-*]\s+)\[([ xX])\]/, `$1${newBox}`);
        return lines.join("\n");
      }
      currentIndex += 1;
    }
  }

  return text;
};

/**
 * Extremely lightweight and safe markdown parser.
 * Converts basic markdown (bold, italics, code, lists, checklists, links) into HTML.
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

  // Split lines to detect block elements like lists, checklists, headers
  const lines = html.split("\n");
  let inList = null; // null | "bullet" | "checklist"
  let checklistIndex = 0;
  const processedLines = [];

  const closeListIfNeeded = () => {
    if (inList) {
      processedLines.push("</ul>");
      inList = null;
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    // Checklist item (- [ ] item, - [x] item, * [ ] item, * [x] item)
    const checklistMatch = trimmed.match(CHECKLIST_ITEM_REGEX);

    if (checklistMatch) {
      if (inList !== "checklist") {
        closeListIfNeeded();
        processedLines.push("<ul class='checklist-group space-y-1.5 my-2 list-none pl-0'>");
        inList = "checklist";
      }
      const isChecked = checklistMatch[1].toLowerCase() === "x";
      const itemContent = checklistMatch[2] ? checklistMatch[2].trim() : "";
      const currentIndex = checklistIndex;
      checklistIndex += 1;

      processedLines.push(
        `<li class='checklist-item flex items-start gap-2 text-sm leading-normal' data-checklist-item='${currentIndex}'>` +
        `<input type='checkbox' data-checklist-index='${currentIndex}' ${isChecked ? "checked " : ""}aria-label='${escapeHtmlAttribute(itemContent || `Checklist item ${currentIndex + 1}`)}' class='checklist-checkbox mt-0.5 h-4 w-4 rounded border-strong text-[var(--text-primary)] focus:ring-0 cursor-pointer accent-[var(--text-primary)]' />` +
        `<span class='${isChecked ? "line-through text-muted" : "text-primary"} flex-1'>${itemContent}</span>` +
        `</li>`
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      // Bullet list (- item or * item)
      if (inList !== "bullet") {
        closeListIfNeeded();
        processedLines.push("<ul class='list-disc pl-5 space-y-1 my-2'>");
        inList = "bullet";
      }
      processedLines.push(`<li>${trimmed.substring(2)}</li>`);
    } else {
      closeListIfNeeded();

      // Headers support: ### Header 3, ## Header 2, # Header 1
      if (/^###\s+(.+)$/.test(trimmed)) {
        const headerText = trimmed.replace(/^###\s+/, "");
        processedLines.push(`<h5 class='text-xs font-bold uppercase tracking-wider text-muted mt-3 mb-1'>${headerText}</h5>`);
      } else if (/^##\s+(.+)$/.test(trimmed)) {
        const headerText = trimmed.replace(/^##\s+/, "");
        processedLines.push(`<h4 class='text-sm font-bold text-primary mt-3 mb-1'>${headerText}</h4>`);
      } else if (/^#\s+(.+)$/.test(trimmed)) {
        const headerText = trimmed.replace(/^#\s+/, "");
        processedLines.push(`<h3 class='text-base font-bold text-primary mt-3.5 mb-1.5'>${headerText}</h3>`);
      } else if (trimmed === "") {
        processedLines.push("<div class='h-2'></div>");
      } else {
        processedLines.push(`<p class='my-1.5 leading-relaxed'>${line}</p>`);
      }
    }
  });

  closeListIfNeeded();

  return processedLines.join("\n");
};
