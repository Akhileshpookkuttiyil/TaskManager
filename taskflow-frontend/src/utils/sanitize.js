/**
 * Sanitizes error messages and stack traces to prevent sensitive
 * credentials (tokens, passwords, keys) from leaking into logs or UI.
 */
export const sanitizeErrorDetails = (error) => {
  if (!error) return { message: "An unexpected error occurred.", stack: "" };

  const rawMessage = typeof error === "string" ? error : error.message || String(error);
  const rawStack = error.stack || "";

  // Scrub JWTs, Bearer tokens, passwords, and sensitive params
  const scrubPatterns = [
    /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi,
    /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi,
    /(["']?password["']?\s*[:=]\s*["'])[^"']+([^"']*["'])/gi,
    /(["']?token["']?\s*[:=]\s*["'])[^"']+([^"']*["'])/gi,
    /(["']?secret["']?\s*[:=]\s*["'])[^"']+([^"']*["'])/gi,
  ];

  let cleanMessage = rawMessage;
  let cleanStack = rawStack;

  scrubPatterns.forEach((pattern) => {
    cleanMessage = cleanMessage.replace(pattern, "[REDACTED]");
    cleanStack = cleanStack.replace(pattern, "[REDACTED]");
  });

  return { message: cleanMessage, stack: cleanStack };
};
