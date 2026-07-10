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
} from "./config.js";
import { sanitize, validate } from "./sanitizer.js";

/**
 * Calculates today's topic index using day-of-year modulo rotation.
 * Guarantees consistent, varied daily content cycles without external state.
 *
 * @returns {{ topic: string, index: number, dayOfYear: number }}
 */
export function getTodaysTopic() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now - startOfYear;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % TOPICS.length;

  return {
    topic: TOPICS[index],
    index,
    dayOfYear,
  };
}

/**
 * Calls the Gemini API with retry logic and exponential backoff.
 *
 * @param {string} apiKey - Gemini API key
 * @param {string} prompt - The user prompt
 * @returns {Promise<string>} The generated text response
 */
async function callGemini(apiKey, prompt) {
  const url = `${CONSTANTS.GEMINI_BASE_URL}?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 256,
      topP: 0.95,
      topK: 40,
    },
  };

  let lastError;

  // Initial attempt + retry attempts with exponential backoff
  const attempts = [0, ...CONSTANTS.RETRY_DELAYS_MS];

  for (let i = 0; i < attempts.length; i++) {
    if (attempts[i] > 0) {
      console.log(`   ⏳ Retrying in ${attempts[i] / 1000}s... (attempt ${i + 1}/${attempts.length})`);
      await sleep(attempts[i]);
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const statusCode = response.status;

        // Fatal errors: don't retry (auth failures, bad requests)
        if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
          throw new Error(`Gemini API fatal error (${statusCode}): ${errorText}`);
        }

        lastError = new Error(`Gemini API error (${statusCode}): ${errorText}`);
        console.error(`   ❌ Gemini API returned ${statusCode} on attempt ${i + 1}`);
        continue;
      }

      const data = await response.json();

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini returned empty content. Response: " + JSON.stringify(data).slice(0, 300));
      }

      return text;
    } catch (error) {
      if (error.message.includes("fatal")) {
        throw error; // Don't retry fatal errors
      }
      lastError = error;
      console.error(`   ❌ Gemini request failed on attempt ${i + 1}: ${error.message}`);
    }
  }

  throw lastError || new Error("All Gemini API attempts exhausted.");
}

/**
 * Generates, sanitizes, and validates content for Threads.
 * If content exceeds length threshold, triggers emergency reduction.
 *
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<{ content: string, topic: string, attempts: number, warnings: string[] }>}
 */
export async function generateContent(apiKey) {
  const { topic, index, dayOfYear } = getTodaysTopic();
  console.log(`\n📋 [Gemini] Topic rotation: Day ${dayOfYear} → Index ${index} → "${topic}"`);

  const allWarnings = [];
  let attempts = 0;

  // Initial generation
  attempts++;
  console.log(`   🔄 Generating content (attempt ${attempts})...`);
  let rawText = await callGemini(apiKey, GENERATION_PROMPT(topic));
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

    rawText = await callGemini(apiKey, REDUCTION_PROMPT(cleaned));
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

// ─── Utility ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
