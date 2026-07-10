/**
 * AutoThreads-AI: Content Sanitization & Validation Layer
 * Strips markdown artifacts and enforces Threads character limits.
 */

import { CONSTANTS } from "./config.js";

// ─── Markdown Stripping Regex Array ──────────────────────────────────────────
const SANITIZATION_RULES = [
  // Strip bold/italic markdown (**text**, *text*, __text__, _text_)
  { pattern: /\*{1,3}(.*?)\*{1,3}/g, replacement: "$1" },
  { pattern: /_{1,3}(.*?)_{1,3}/g, replacement: "$1" },

  // Strip headers (# Header, ## Header, etc.)
  { pattern: /^#{1,6}\s*/gm, replacement: "" },

  // Strip inline code ticks (`code`)
  { pattern: /`{1,3}(.*?)`{1,3}/g, replacement: "$1" },

  // Strip code blocks (```...```)
  { pattern: /```[\s\S]*?```/g, replacement: "" },

  // Strip blockquotes (> text)
  { pattern: /^>\s*/gm, replacement: "" },

  // Strip horizontal rules (---, ***, ___)
  { pattern: /^[-*_]{3,}\s*$/gm, replacement: "" },

  // Strip link markdown [text](url) → text
  { pattern: /\[([^\]]+)\]\([^)]+\)/g, replacement: "$1" },

  // Strip image markdown ![alt](url)
  { pattern: /!\[([^\]]*)\]\([^)]+\)/g, replacement: "$1" },

  // Strip wrapping quotation marks (leading/trailing)
  { pattern: /^["']+|["']+$/g, replacement: "" },

  // Strip bullet points (- item, * item, + item)
  { pattern: /^[\s]*[-*+]\s+/gm, replacement: "" },

  // Strip numbered lists (1. item, 2. item)
  { pattern: /^[\s]*\d+\.\s+/gm, replacement: "" },

  // Collapse multiple newlines into double newline
  { pattern: /\n{3,}/g, replacement: "\n\n" },

  // Trim leading/trailing whitespace
  { pattern: /^\s+|\s+$/g, replacement: "" },
];

/**
 * Sanitizes raw Gemini output by stripping all markdown syntax
 * and cleaning the text for Threads mobile rendering.
 *
 * @param {string} rawText - The raw text from Gemini API
 * @returns {string} Cleaned plain text ready for Threads
 */
export function sanitize(rawText) {
  let cleaned = rawText;

  for (const rule of SANITIZATION_RULES) {
    cleaned = cleaned.replace(rule.pattern, rule.replacement);
  }

  return cleaned.trim();
}

/**
 * Validates that the sanitized text meets Threads posting requirements.
 * Returns a validation result with status and diagnostics.
 *
 * @param {string} text - The sanitized text to validate
 * @returns {{ valid: boolean, length: number, warnings: string[] }}
 */
export function validate(text) {
  const length = text.length;
  const warnings = [];

  if (length === 0) {
    return { valid: false, length, warnings: ["Content is empty after sanitization."] };
  }

  if (length >= CONSTANTS.MAX_POST_LENGTH) {
    warnings.push(`Content exceeds maximum length: ${length}/${CONSTANTS.MAX_POST_LENGTH} characters.`);
    return { valid: false, length, warnings };
  }

  if (length >= CONSTANTS.LENGTH_WARNING_THRESHOLD) {
    warnings.push(`Content approaching limit: ${length}/${CONSTANTS.MAX_POST_LENGTH} characters. Triggering re-generation.`);
    return { valid: false, length, warnings };
  }

  return { valid: true, length, warnings };
}
