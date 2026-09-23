import { GeminiRotator } from "./gemini_rotator.js";
import { readState } from "./state.js";

/**
 * AutoThreads-AI: The Director Engine (Gen Z Mode)
 * Executes the Quote Generation Pipeline for Instagram.
 */

export class DirectorEngine {
  constructor(apiKeysString) {
    this.rotator = new GeminiRotator(apiKeysString);
  }

  /**
   * Phase 1 & 2: Quote Generation
   */
  async generateQuoteAndScene(retries = 0) {
    const state = readState();
    const history = state.ig_history || [];
    
    // Extract previously used authors from history to prevent repetition
    const usedAuthors = history
      .map(h => h.topic)
      .filter(t => t) // Ignore empty topics
      .map(t => t.trim())
      .filter(a => a)
      .join(", ");

    const availableTopics = [
      "procrastinating actual work by doing fake productive tasks",
      "the sudden urge to change your entire life at 2am",
      "imposter syndrome kicking in at the worst times",
      "hating small talk but being terrified of deep conversations",
      "spending money you don't have to fix a bad mood",
      "the specific anxiety of sending an email and waiting for a reply",
      "overanalyzing a text message from 3 years ago",
      "wanting to be invited out but not actually wanting to go",
      "the dread of Sunday evening",
      "forgetting why you walked into a room and questioning your reality",
      "the fake scenarios you make up before falling asleep",
      "hyper-fixating on a new hobby for 3 days then dropping it",
      "feeling like an NPC in your own life",
      "the sheer exhaustion of being perceived by others",
      "scrolling reels for 4 hours while your to-do list cries",
      "the existential dread of picking a career path",
      "romanticizing your life for 5 minutes then giving up",
      "the fear of running into someone you vaguely know in public"
    ];

    // Pick 2 random unique topics
    const shuffled = availableTopics.sort(() => 0.5 - Math.random());
    const topic1 = shuffled[0];
    const topic2 = shuffled[1];

    const directorPrompt = `
You are a Gen Z social media strategist running the account @the.ace___.

TASK 1: VISUAL QUOTES (quotes array)
Write 2 to 4 raw, authentic, relatable thoughts that feel like real journal entries or casual text messages.
- At least one topic MUST BE about: "${topic1}"
- At least one topic MUST BE about: "${topic2}"
- If generating 3 or 4 quotes, they must explore variations or escalations of these themes.
- Use internet culture tone, lowercase letters, no hashtags, and keep each under 100 characters.
- They should be highly relatable, slightly vulnerable, or ironic.

TASK 2: ALGORITHMIC CAPTION (caption)
Write an Instagram-optimized caption for this multi-slide carousel photo dump.
- The caption MUST directly reference the exact scenarios described in the quotes.
- You MUST use line breaks (\n\n) to separate the hook and the contexts for the slides. Do not write a wall of text.
- Keep the tone heavily Gen-Z, slightly unhinged, and very casual. 
- You MUST end the caption with a highly cynical or ironic statement (e.g., "it is what it is", "im so tired", or "we're cooked").
- NEVER use upbeat or supportive phrases like "virtual hug", "you're not alone", or "send this to a friend".
- Only output 💀, 😭, ✨, or no emojis. 
- Include 3-5 hyper-niche aesthetic hashtags at the bottom.

CRITICAL: DO NOT use quotes from any of these previously used authors or topics: ${usedAuthors || 'None yet'}.

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with exactly three keys. Do NOT wrap it in markdown backticks.
{
  "quotes": ["First short relatable quote here.", "Second entirely different short quote here."],
  "caption": "The full Instagram caption including the hook, body, CTA, and 3-5 niche hashtags.",
  "author": "topic: ${topic1} / ${topic2}"
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
      
      // Force sanitize millennial emojis that the LLM stubbornly adds using split/join to avoid surrogate pair regex bugs
      if (parsed.caption) {
        const badEmojis = ['😂','🤣','😫','😩','🤯','💯','🔥','🙌','👏','🥺','🥺','🥺'];
        for (const emoji of badEmojis) {
          parsed.caption = parsed.caption.split(emoji).join('');
        }
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
