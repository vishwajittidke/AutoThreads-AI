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
  async generateQuoteAndScene() {
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

Ensure the quote is philosophically substantial, properly attributed, and not overused. Symbolism must be subtle and indirect. Lighting natural but varied. Maintain calm editorial refinement and ensure strong negative space for the quote and logo.

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with exactly three keys. Do NOT wrap it in markdown blockticks.
{
  "quote_text": "The exact quote text (without quotes).",
  "author": "Author Name",
  "imagen_prompt": "The highly detailed, cinematic prompt for Imagen 3 based on your scene design. Minimum 100 words describing lighting, composition, optics, and realism."
}
`;

    console.log("[Director] 🎬 Phase 1 & 2: Generating Quote and Scene Design...");
    const rawOutput = await this.rotator.generateContent(directorPrompt);
    
    try {
      const jsonStr = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error("[Director] ❌ Failed to parse Director JSON. Raw output:", rawOutput);
      throw new Error("Invalid JSON from Director");
    }
  }

  /**
   * Phase 3-6: Generate Image via Imagen 3 API
   */
  async generateImage(prompt) {
    console.log("[Director] 📸 Phase 3-6: Requesting free AI render via Pollinations...");

    try {
      // Force completely diverse generations by removing restrictive tags and adding a random seed
      const encodedPrompt = encodeURIComponent(prompt + " cinematic, moody atmosphere, ultra high quality, 8k resolution, photorealistic, masterpiece");
      const randomSeed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1350&nologo=true&seed=${randomSeed}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Pollinations API failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      
      console.log("[Director] ✅ Image rendered successfully!");
      return base64;
    } catch (error) {
      console.error(`[Director] ⚠️ Image API failed: ${error.message}`);
      throw new Error("All image generation attempts failed.");
    }
  }
}
