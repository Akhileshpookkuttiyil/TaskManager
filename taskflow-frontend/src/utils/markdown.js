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

  // Links ([label](url))
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' target='_blank' rel='noopener noreferrer' class='text-brand-600 hover:underline dark:text-brand-400'>$1</a>");

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
