/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize user input before storage
 * to prevent XSS and injection attacks.
 */

/**
 * Sanitize a string by escaping HTML entities
 * Use for user-provided text that will be displayed
 */
export function escapeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };

  return input.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char);
}

/**
 * Strip all HTML tags from a string
 * Use for plain text fields that should never contain HTML
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a string for safe storage
 * Removes null bytes and control characters
 */
export function sanitizeForStorage(input: string): string {
  // Remove null bytes and control characters except newlines (0x0A) and tabs (0x09)
  // Using character filtering instead of regex to avoid ESLint no-control-regex
  let result = "";
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    // Allow printable characters, newlines (10), tabs (9), and carriage returns (13)
    if (code >= 32 || code === 9 || code === 10 || code === 13) {
      result += input[i];
    }
  }
  return result;
}

/**
 * Sanitize JSON payload before storage
 * Ensures the payload is valid JSON and removes dangerous content
 */
export function sanitizeJsonPayload(payload: unknown): string {
  try {
    // Parse and re-stringify to ensure valid JSON
    const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;

    // Deep sanitize string values
    const sanitized = deepSanitize(parsed);

    return JSON.stringify(sanitized);
  } catch {
    // If not valid JSON, return escaped string
    return escapeHtml(String(payload));
  }
}

/**
 * Deep sanitize an object, escaping all string values
 */
function deepSanitize(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeForStorage(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys too
      const sanitizedKey = sanitizeForStorage(key);
      result[sanitizedKey] = deepSanitize(value);
    }
    return result;
  }

  return obj;
}

/**
 * Validate and sanitize an email address
 * Returns null if invalid
 */
export function sanitizeEmail(email: string): string | null {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Max length per RFC 5321
  if (trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize a URL
 * Returns null if invalid or potentially dangerous
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Truncate a string to a maximum length
 * Useful for preventing oversized inputs
 */
export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }
  return input.substring(0, maxLength);
}

/**
 * Sanitize a filename
 * Removes path traversal attempts and dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = filename.replace(/^.*[\\/]/, "");

  // Remove dangerous characters and control characters
  let result = "";
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    const code = sanitized.charCodeAt(i);
    // Skip control characters (0-31) and dangerous filename characters
    if (code < 32 || '<>:"/\\|?*'.includes(char)) {
      result += "_";
    } else {
      result += char;
    }
  }
  sanitized = result;

  // Prevent hidden files
  if (sanitized.startsWith(".")) {
    sanitized = "_" + sanitized.substring(1);
  }

  // Limit length
  return truncate(sanitized, 255);
}

/**
 * Sanitize numeric input
 * Returns the number if valid, or the default value
 */
export function sanitizeNumber(
  input: unknown,
  options: {
    min?: number;
    max?: number;
    default: number;
    integer?: boolean;
  }
): number {
  let num = typeof input === "number" ? input : parseFloat(String(input));

  if (isNaN(num) || !isFinite(num)) {
    return options.default;
  }

  if (options.integer) {
    num = Math.round(num);
  }

  if (options.min !== undefined && num < options.min) {
    return options.min;
  }

  if (options.max !== undefined && num > options.max) {
    return options.max;
  }

  return num;
}
