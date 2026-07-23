/**
 * AutoThreads-AI: Gemini Content Generation Engine
 * Handles API communication, topic rotation, and emergency content reduction.
 */

import {
  TOPICS,
  SYSTEM_PROMPT,
  GENERATION_PROMPT,
  REDUCTION_PROMPT,
  CONSTANTS,
  FALLBACK_POSTS,
} from "./config.js";
import { sanitize, validate } from "./sanitizer.js";

import { readState } from "./state.js";

/**
 * Selects a random topic that hasn't been used recently to prevent repetition.
 *
 * @returns {{ topic: string, index: number, dayOfYear: number }}
 */
export function getTodaysTopic() {
  const state = readState();
  const recentTopics = (state.history || []).slice(-10).map(h => h.topic);
  
  // Filter out recently used topics
  let availableTopics = TOPICS.filter(t => !recentTopics.includes(t));
  
  if (availableTopics.length === 0) {
    availableTopics = TOPICS; // Fallback if history is too large
  }

  const index = Math.floor(Math.random() * availableTopics.length);
  const topic = availableTopics[index];

  return {
    topic: topic,
    index: TOPICS.indexOf(topic),
    dayOfYear: new Date().getDate(),
  };
}

import { GeminiRotator } from "./gemini_rotator.js";

/**
 * Generates, sanitizes, and validates content for Threads using GeminiRotator.
 * If content exceeds length threshold, triggers emergency reduction.
 *
 * @param {string} apiKeysString - Comma-separated Gemini API keys
 * @returns {Promise<{ content: string, topic: string, attempts: number, warnings: string[] }>}
 */
export async function generateContent(apiKeysString) {
  const { topic, index, dayOfYear } = getTodaysTopic();
  console.log(`\n📋 [Gemini] Topic rotation: Day ${dayOfYear} → Index ${index} → "${topic}"`);

  const rotator = new GeminiRotator(apiKeysString);
  const allWarnings = [];
  let attempts = 0;

  // Initial generation
  attempts++;
  console.log(`   🔄 Generating content (attempt ${attempts})...`);
  let rawText;
  try {
    rawText = await rotator.generateContent(GENERATION_PROMPT(topic));
  } catch (err) {
    console.error(`   ❌ Gemini Rotator failed completely: ${err.message}`);
    console.log(`   🆘 Using emergency fallback post...`);
    const fallbackIndex = Math.floor(Math.random() * FALLBACK_POSTS.length);
    rawText = FALLBACK_POSTS[fallbackIndex];
    allWarnings.push("Used emergency fallback post due to Gemini API failure.");
  }

  let cleaned = sanitize(rawText);
  let validation = validate(cleaned);

  console.log(`   📏 Content length: ${validation.length} characters`);

  if (validation.warnings.length > 0) {
    allWarnings.push(...validation.warnings);
    validation.warnings.forEach((w) => console.log(`   ⚠️  ${w}`));
  }

  // If content fails validation, attempt emergency reduction
  if (!validation.valid && validation.length > 0) {
    attempts++;
    console.log(`   🔄 Triggering emergency reduction (attempt ${attempts})...`);

    rawText = await rotator.generateContent(REDUCTION_PROMPT(cleaned));
    cleaned = sanitize(rawText);
    validation = validate(cleaned);

    console.log(`   📏 Reduced content length: ${validation.length} characters`);

    if (validation.warnings.length > 0) {
      allWarnings.push(...validation.warnings);
      validation.warnings.forEach((w) => console.log(`   ⚠️  ${w}`));
    }

    // Final fallback: hard truncate if still too long
    if (!validation.valid && validation.length > 0) {
      console.log(`   ✂️  Hard truncating to ${CONSTANTS.MAX_POST_LENGTH - 3} characters...`);
      cleaned = cleaned.slice(0, CONSTANTS.MAX_POST_LENGTH - 3) + "...";
      allWarnings.push("Content was hard-truncated after emergency reduction failed.");
    }
  }

  if (cleaned.length === 0) {
    throw new Error("Failed to generate any valid content after all attempts.");
  }

  console.log(`   ✅ Final content (${cleaned.length} chars): "${cleaned.slice(0, 80)}..."`);

  return {
    content: cleaned,
    topic,
    attempts,
    warnings: allWarnings,
  };
}

/**
 * Generates a witty, concise reply to a user's comment on a specific post.
 *
 * @param {string} apiKeysString - Comma-separated Gemini API keys
 * @param {string} originalPost - The original post text for context
 * @param {string} userComment - The user's comment to reply to
 * @returns {Promise<string>} The generated reply text
 */
export async function generateReply(apiKeysString, originalPost, userComment) {
  console.log(`\n🤖 [Gemini] Generating reply to comment: "${userComment.slice(0, 50)}..."`);
  
  const prompt = `You are the sarcastic, witty, and highly intelligent AI persona of the Threads account @the.ace___.
You post edgy, thought-provoking content about technology, AI, programming, and existentialism.

ORIGINAL POST YOU WROTE:
"${originalPost}"

USER'S COMMENT ON YOUR POST:
"${userComment}"

INSTRUCTIONS:
1. Write a witty, clever, or slightly sarcastic reply to the user's comment.
2. Keep it under 2 sentences.
3. Be engaging but maintain an air of intellectual superiority or dry humor.
4. If the comment is toxic, political, or explicitly inappropriate, reply with something dismissive like "Not worth my tokens."
5. Output ONLY the raw reply text. No quotes, no markdown, no hashtags.`;

  const rotator = new GeminiRotator(apiKeysString);
  try {
    const rawText = await rotator.generateContent(prompt);
    const cleaned = sanitize(rawText);
    console.log(`   ✅ Generated reply: "${cleaned}"`);
    return cleaned;
  } catch (err) {
    console.error(`   ❌ Failed to generate reply: ${err.message}`);
    return "Interesting perspective.";
  }
}
