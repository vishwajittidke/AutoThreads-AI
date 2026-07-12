import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AutoThreads-AI: Gemini API Key Rotator & Image Generation Engine
 * Handles seamless failover across an array of 10 API keys.
 */
export class GeminiRotator {
  constructor(apiKeysString) {
    if (!apiKeysString) {
      throw new Error("Missing GEMINI_API_KEYS environment variable.");
    }
    // Parse comma-separated keys
    this.keys = apiKeysString.split(",").map(k => k.trim()).filter(k => k);
    this.currentKeyIndex = 0;
    this.attemptsOnCurrentKey = 0;
    this.maxAttemptsPerKey = 3;
    
    console.log(`[Gemini Rotator] Initialized with ${this.keys.length} API keys.`);
  }

  getCurrentKey() {
    return this.keys[this.currentKeyIndex];
  }

  rotateKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    this.attemptsOnCurrentKey = 0;
    console.log(`[Gemini Rotator] 🔄 Switched to API Key Index: ${this.currentKeyIndex}`);
  }

  async generateContent(prompt, retries = 0) {
    if (retries >= this.keys.length * this.maxAttemptsPerKey) {
      throw new Error("All Gemini API keys failed after maximum retries.");
    }

    if (this.attemptsOnCurrentKey >= this.maxAttemptsPerKey) {
      console.log(`[Gemini Rotator] ⚠️ Key ${this.currentKeyIndex} failed 3 times. Rotating...`);
      this.rotateKey();
    }

    try {
      this.attemptsOnCurrentKey++;
      const apiKey = this.getCurrentKey();
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use gemini-3.5-flash
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
      
      console.log(`[Gemini Rotator] 🧠 Generating content using Key Index ${this.currentKeyIndex} (Attempt ${this.attemptsOnCurrentKey}/3)`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      const tokens = response.usageMetadata?.totalTokenCount || 0;
      const { recordTokenUsage } = await import("./state.js");
      recordTokenUsage(tokens);
      
      // Reset attempts on success
      this.attemptsOnCurrentKey = 0;
      return response.text();

    } catch (error) {
      console.error(`[Gemini Rotator] ❌ Attempt failed: ${error.message}`);
      return this.generateContent(prompt, retries + 1);
    }
  }
}
