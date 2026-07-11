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

    const directorPrompt = `
You are a world-class creative director building high-end Instagram content for @the.ace___.
Create a 4K 3840x4800 minimalist editorial Instagram quote image. Select a completely new, meaningful quote from a different author than previously used. 

CRITICAL: DO NOT use quotes from any of these previously used authors: ${usedAuthors || 'None yet'}.

Ensure the quote is philosophically substantial, properly attributed, and not overused. 
The background must be WILDLY visually distinct and unpredictable every single time. DO NOT default to water, lakes, oceans, or stones in the water. We need extreme aesthetic diversity: wild jungles, macro leaf photography, vast desert dunes, foggy mountains, brutalist architecture, neon city rain, starry nebulas, etc. Symbolism must be subtle and indirect. Lighting natural but varied. Composition must differ drastically in perspective, spatial depth, and tonal range from prior outputs. Prioritize total visual novelty over familiarity while preserving calm editorial refinement.

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
