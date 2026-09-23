import { GeminiRotator } from "./gemini_rotator.js";
import { readState } from "./state.js";

/**
 * AutoThreads-AI: The Director Engine (Gen Z Mode - Life Quotes)
 * Executes the Quote Generation Pipeline for Instagram.
 */

export class DirectorLifeQuotesEngine {
  constructor(apiKeysString) {
    this.rotator = new GeminiRotator(apiKeysString);
  }

  /**
   * Phase 1 & 2: Quote Generation
   */
  async generateQuoteAndScene(retries = 0) {
    const state = readState();
    const history = state.ig_history_life_quotes || [];
    
    // Extract previously used authors from history to prevent repetition
    const usedAuthors = history
      .map(h => h.topic)
      .filter(t => t && t.startsWith("LifeQuotes:"))
      .map(t => t.split("|")[0].replace("LifeQuotes:", "").trim())
      .filter(a => a)
      .join(", ");

    const directorPrompt = `
You are a Gen Z social media strategist running the account @life.quotes__98.

TASK 1: VISUAL QUOTE (quote_text)
Write a raw, authentic, relatable "late-night thought" or "shower thought" that feels like a real journal entry or a casual text message to a friend.
Use internet culture tone, lowercase letters, no hashtags, and keep it under 100 characters.
It should be highly relatable, slightly vulnerable, or ironic (e.g., "not to be dramatic but...", "it is what it is", "me when...").

TASK 2: ALGORITHMIC CAPTION (caption)
Write an Instagram-optimized caption using the 'social-captions' algorithm skill:
- Hook in the first 125 characters that stops the scroll (e.g., a bold claim or relatable hook).
- 1-2 short sentences of body text expanding on the feeling.
- One strong CTA optimizing for Saves or Shares (e.g., "save this to remind yourself later" or "send this to a friend who overthinks").
- Exactly 3-5 highly niche SEO keywords/hashtags (NO generic tags like #fyp or #viral).

CRITICAL: DO NOT use quotes from any of these previously used authors or topics: ${usedAuthors || 'None yet'}.

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with exactly three keys. Do NOT wrap it in markdown backticks.
{
  "quote_text": "The exact quote text for the image (without quotes, lowercase).",
  "caption": "The full Instagram caption including the hook, body, CTA, and 3-5 niche hashtags.",
  "author": "Anonymous or a relatable persona name"
}
`;

    console.log(`[Director] 🎬 Phase 1 & 2: Generating Quote (Attempt ${retries + 1})...`);
    const rawOutput = await this.rotator.generateContent(directorPrompt);
    
    try {
      const jsonStr = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.quote_text.length > 200) {
        throw new Error(`QuoteTooLongError: Quote is ${parsed.quote_text.length} characters.`);
      }
      
      return parsed;
    } catch (err) {
      console.error(`[Director] ⚠️ Validation/Parsing failed: ${err.message}`);
      if (retries < 3) {
        console.log(`[Director] 🔄 Auto-retrying generation to fix formatting or length...`);
        return this.generateQuoteAndScene(retries + 1);
      }
      throw new Error("Invalid JSON or Quote too long after maximum retries.");
    }
  }
}
