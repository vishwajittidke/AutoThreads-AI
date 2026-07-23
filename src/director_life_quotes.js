import { GeminiRotator } from "./gemini_rotator.js";
import { readState } from "./state.js";

/**
 * AutoThreads-AI: The Director Engine
 * Executes the 8-Phase Quote & Image Generation Pipeline for Instagram.
 */
export class DirectorLifeQuotesEngine {
  constructor(apiKeysString) {
    this.rotator = new GeminiRotator(apiKeysString);
  }

  /**
   * Phase 1 & 2: Quote Generation & Scene Design
   */
  async generateQuoteAndScene(retries = 0) {
    const state = readState();
    const history = state.history || [];
    
    // Extract previously used authors from history to prevent repetition
    const usedAuthors = history
      .map(h => h.topic)
      .filter(t => t && t.startsWith("LifeQuotes:"))
      .map(t => t.split("|")[0].replace("LifeQuotes:", "").trim())
      .filter(a => a)
      .join(", ");

    const categories = [
      "Earthy & Tactile Minimalism (Smooth river rocks, pebbles on sand, a compass, rustic wooden bowls, solitary feathers. Warm beiges, browns, muted golds)",
      "The Artisan’s Focus (Craftsmen at wooden workbenches, open books, dim rooms illuminated by warm desk lamps. Deep shadows, rich browns, amber light)",
      "Solitude & Reflection (Silhouettes sitting by large windows overlooking moody cityscapes at dusk, drinking coffee in quiet rooms. Cool blues contrasting with warm indoor lighting)",
      "Scenic Life Journeys (Glowing A-frame cabins in dark forests, a runner on a scenic path, dusk falling on an urban street. Sunset oranges, deep forest greens)",
      "Ethereal & Magical Nature (Highly saturated dreamy landscapes, rainbows over valleys, soft blurred flowers with sparkling butterflies, starry night skies. Vibrant pinks, purples, bright blues)"
    ];
    
    // Mathematically rotate through categories so it never repeats the same theme
    const postCount = state.ig_total_posts_life_quotes || 0;
    const currentCategory = categories[postCount % categories.length];

    const directorPrompt = `
You are a world-class creative director building beautiful, uplifting, and scenic Instagram content for @life.quotes__98.
Create a 4K 3840x4800 Instagram quote image. Select a completely new, meaningful quote from a different author than previously used. The quote should be relatable, uplifting, motivational, or focused on daily life, growth, and resilience.

CRITICAL: DO NOT use quotes from any of these previously used authors: ${usedAuthors || 'None yet'}.

MANDATORY AESTHETIC THEME FOR THIS POST:
You MUST design the scene entirely around this specific visual category: "${currentCategory}".
Do NOT deviate from this category, BUT you MUST invent a wildly unique, highly specific composition. Never describe the exact same scene twice. 
CRITICAL SUBJECT RULE: Change the core subject completely, BUT the subject MUST be logical, visually clear, and subtly complement the metaphor or mood of the quote. Do NOT generate nonsensical objects. Keep it grounded and sensible. Ensure the imagery perfectly embodies this specific aesthetic in a completely new way.

CRITICAL TYPOGRAPHY & COMPOSITION RULE:
The quote MUST be extremely short and punchy. Maximum 200 characters total.
For the image design, you MUST dictate a minimalist composition. The exact center of the image MUST be dark, empty negative space so the text will be readable.

Ensure the quote is philosophically substantial, properly attributed, and not overused. Lighting must be low-key and dramatic. Maintain calm editorial refinement and ensure strong negative space in the center. No busy elements in the middle.

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with exactly three keys. Do NOT wrap it in markdown blockticks.
{
  "quote_text": "The exact quote text (without quotes).",
  "author": "Author Name",
  "imagen_prompt": "The highly detailed, cinematic prompt for Imagen 3 based on your scene design. Minimum 100 words describing lighting, composition, optics, and realism."
}
`;

    console.log(`[Director] 🎬 Phase 1 & 2: Generating Quote and Scene Design (Attempt ${retries + 1})...`);
    const rawOutput = await this.rotator.generateContent(directorPrompt);
    
    try {
      const jsonStr = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      
      // Milestone 3: Typography Overflow Protection
      if (parsed.quote_text.length > 200) {
        throw new Error(`QuoteTooLongError: Quote is ${parsed.quote_text.length} characters, exceeding the 200 character limit for safe typography rendering.`);
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

  /**
   * Phase 3-6: Generate Image via Imagen 3 API or Fallback
   */
  async generateImage(prompt) {
    console.log("[Director] 📸 Phase 3-6: Requesting free AI render via Pollinations...");

    try {
      // Primary: Pollinations AI
      const randomSeed = Math.floor(Math.random() * 999999999);
      // Inject strict universal constraints using natural language (Pollinations strips brackets) to perfectly bust the cache
      const strictModifiers = `Unique photographic variant ${randomSeed}. Shot with low-key lighting, intentionally underexposed, heavily muted desaturated colors, massive dark empty negative space in the exact center, clear and sensible subject, highly detailed, minimalist composition, NO humans, NO hands, NO faces, NO people, no text, no watermarks, cinematic, ultra high quality, 8k resolution, masterpiece. Scene description: `;
      const encodedPrompt = encodeURIComponent(strictModifiers + prompt);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1350&nologo=true&seed=${randomSeed}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Pollinations API failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log("[Director] ✅ Primary Image API (Pollinations) rendered successfully!");
      return Buffer.from(arrayBuffer).toString("base64");
    } catch (error) {
      console.error(`[Director] ⚠️ Primary Image API failed: ${error.message}`);
      console.log("[Director] 🔄 Engaging Secondary Fallback API (Hugging Face)...");
      
      // Milestone 4: Image Generation Fallback System
      const hfToken = process.env.HF_TOKEN;
      if (!hfToken) {
        throw new Error("Pollinations failed and HF_TOKEN is not configured for the fallback API.");
      }
      
      try {
        const hfUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";
        const hfResponse = await fetch(hfUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: prompt }),
        });
        
        if (!hfResponse.ok) {
          throw new Error(`Hugging Face API failed: ${hfResponse.statusText}`);
        }
        
        const arrayBuffer = await hfResponse.arrayBuffer();
        console.log("[Director] ✅ Fallback Image API (Hugging Face) rendered successfully!");
        return Buffer.from(arrayBuffer).toString("base64");
      } catch (fallbackError) {
        console.error(`[Director] ❌ Fallback Image API failed: ${fallbackError.message}`);
        throw new Error("All image generation attempts (Primary & Fallback) failed.");
      }
    }
  }
}
