import { GeminiRotator } from "./gemini_rotator.js";
import { readState } from "./state.js";

/**
 * AutoThreads-AI: The Director Engine
 * Executes the 8-Phase Quote & Image Generation Pipeline for Instagram.
 */
export class DirectorEngine {
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
      .filter(t => t && t.startsWith("IG:"))
      .map(t => t.split("|")[0].replace("IG:", "").trim())
      .filter(a => a)
      .join(", ");

    const categories = [
      "Ethereal Cloudscapes (sunset, dawn, or deep blue skies with distinct fluffy clouds)",
      "Northern Lights & Aurora (vibrant green/blue aurora borealis in a dark night sky)",
      "Minimalist Botanicals (close-up single flowers, daisies, or macro leaves on very dark backgrounds)",
      "Moody Architecture (lit towers, city silhouettes, or dark structures glowing at night)",
      "Atmospheric Water (ocean waves crashing, boat wakes, or deep calm water)",
      "Warm Light & Shadows (candlelight, bokeh, abstract warm glowing light in dark spaces)",
      "Mountain Silhouettes (dark jagged peaks against moody starry or foggy skies)",
      "Aviation & Sky Lines (airplane contrails, high altitude majestic views)",
      "Deep Texture (plain dark atmospheric textures, minimal distractions, golden hour silhouettes)"
    ];
    
    // Mathematically rotate through categories so it never repeats the same theme
    const postCount = state.total_posts || 0;
    const currentCategory = categories[postCount % categories.length];

    const directorPrompt = `
You are a world-class creative director building high-end Instagram content for @the.ace___.
Create a 4K 3840x4800 minimalist editorial Instagram quote image. Select a completely new, meaningful quote from a different author than previously used. 

CRITICAL: DO NOT use quotes from any of these previously used authors: ${usedAuthors || 'None yet'}.

MANDATORY AESTHETIC THEME FOR THIS POST:
You MUST design the scene entirely around this specific visual category: "${currentCategory}".
Do NOT deviate from this category. Ensure the imagery perfectly embodies this specific aesthetic.

CRITICAL TYPOGRAPHY RULE:
The quote MUST be extremely short and punchy. Maximum 200 characters total.

Ensure the quote is philosophically substantial, properly attributed, and not overused. Symbolism must be subtle and indirect. Lighting natural but varied. Maintain calm editorial refinement and ensure strong negative space for the quote and logo.

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
      const encodedPrompt = encodeURIComponent(prompt + " cinematic, moody atmosphere, ultra high quality, 8k resolution, photorealistic, masterpiece");
      const randomSeed = Math.floor(Math.random() * 1000000);
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
