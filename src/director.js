import { GeminiRotator } from "./gemini_rotator.js";

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
    const directorPrompt = `
You are a world-class creative director building high-end Instagram content for @the.ace___.
Create a 4K 3840x4800 minimalist editorial Instagram quote image. Select a completely new, meaningful quote from a different author than previously used. Do not reuse any prior quote, author, or theme from earlier outputs. Ensure the quote is philosophically substantial, properly attributed, and not overused. The background must be visually distinct and unpredictable. Avoid repeating previously used environmental themes or symbolic elements. Maintain minimalist composition with strong negative space for text overlay. Use only one primary focal element. Symbolism must be subtle and indirect. Lighting natural but varied. Composition must differ in perspective, spatial depth, and tonal range from prior outputs. Prioritize novelty over familiarity while preserving calm editorial refinement.

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
      // The user grid is moody and nature-focused. We append a subtle aesthetic lock.
      const encodedPrompt = encodeURIComponent(prompt + " cinematic, deep tones, nature, minimalist, ultra high quality, 8k resolution, photorealistic");
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1350&nologo=true`;
      
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
