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
Follow these precise phases:

PHASE 1 — VERIFIED QUOTE ACQUISITION
Search your knowledge base to select a meaningful quote with confirmed author attribution.
- Philosophically or emotionally substantial
- Properly attributed
- Contextually accurate
- Not an overused cliché

PHASE 2 — MULTI-LAYER INTERPRETATION
Determine the emotional tone, psychological energy, and symbolic meaning of the quote.
Translate this meaning into a real-world photographic scenario grounded in physical plausibility.
Avoid literal over-illustration. Avoid exaggerated metaphor stacking.

PHASE 3 to 6 — SCENE & LIGHTING DESIGN
Design a natural environment, professional camera optics, and lighting coherence for an Imagen 3 prompt.

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with exactly two keys. Do NOT wrap it in markdown blockticks.
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
  async generateImage(imagePrompt) {
    console.log("[Director] 📸 Phase 3-6: Requesting Imagen 3 render...");
    
    let lastError;
    // We can also rotate keys for image generation!
    for (let i = 0; i < this.rotator.keys.length; i++) {
      const apiKey = this.rotator.keys[this.rotator.currentKeyIndex];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              outputOptions: { mimeType: "image/jpeg" }
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        const data = await response.json();
        if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
          console.log("[Director] ✅ Image successfully generated.");
          return data.predictions[0].bytesBase64Encoded;
        } else {
          throw new Error("No image data returned from Imagen.");
        }
      } catch (err) {
        console.error(`[Director] ⚠️ Imagen API failed on key ${this.rotator.currentKeyIndex}: ${err.message}`);
        lastError = err;
        this.rotator.rotateKey();
      }
    }

    throw new Error(`All keys failed for Image Generation. Last error: ${lastError.message}`);
  }
}
