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

TASK 1: VISUAL QUOTES (quotes array)
Write TWO raw, authentic, relatable "late-night thoughts" or "shower thoughts" that feel like real journal entries or casual text messages.
- They must be on completely different topics (e.g., one about sleep, one about social anxiety).
- Use internet culture tone, lowercase letters, no hashtags, and keep each under 100 characters.
- They should be highly relatable, slightly vulnerable, or ironic (e.g., "not to be dramatic but...", "it is what it is", "me when...").

TASK 2: ALGORITHMIC CAPTION (caption)
Write an Instagram-optimized caption using the 'social-captions' algorithm skill:
- Hook in the first 125 characters that stops the scroll (e.g., a bold claim or relatable hook).
- 1-2 short sentences of body text expanding on the feeling.
- One strong CTA optimizing for Saves or Shares (e.g., "save this to remind yourself later" or "send this to a friend who overthinks").
- Exactly 3-5 highly niche SEO keywords/hashtags (NO generic tags like #fyp or #viral).
- EMOJI RULE: NEVER use millennial emojis like 😂, 😫, 🤣, 😍, or 💯. Use ONLY Gen Z emojis like 💀, 😭, ✨, or no emojis at all.

CRITICAL: DO NOT use quotes from any of these previously used authors or topics: ${usedAuthors || 'None yet'}.

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with exactly three keys. Do NOT wrap it in markdown backticks.
{
  "quotes": ["First short relatable quote here.", "Second entirely different short quote here."],
  "caption": "The full Instagram caption including the hook, body, CTA, and 3-5 niche hashtags.",
  "author": "Anonymous or a relatable persona name"
}
`;

    console.log(`[Director] 🎬 Phase 1 & 2: Generating Quote (Attempt ${retries + 1})...`);
    const rawOutput = await this.rotator.generateContent(directorPrompt);
    
    try {
      const jsonStr = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      
      if (!parsed.quotes || !Array.isArray(parsed.quotes) || parsed.quotes.length === 0) {
        throw new Error("Missing 'quotes' array in JSON.");
      }
      for (const q of parsed.quotes) {
        if (!q || typeof q !== 'string') {
          throw new Error("Invalid quote element in quotes array.");
        }
        if (q.length > 200) {
          throw new Error(`QuoteTooLongError: A quote is ${q.length} characters.`);
        }
      }
      
      // Force sanitize millennial emojis that the LLM stubbornly adds
      if (parsed.caption) {
        parsed.caption = parsed.caption.replace(/[😂🤣😫😩🤯💯🔥🙌👏]/g, '');
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
