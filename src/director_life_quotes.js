import { GeminiRotator } from "./gemini_rotator.js";
import { readState } from "./state.js";

/**
 * AutoThreads-AI: The Director Engine (Life Quotes Variant)
 * Executes the 8-Phase Quote & Image Generation Pipeline for Instagram @life.quotes__98.
 */

// ─── Diverse Visual Categories with Per-Category Modifiers ──────────────────
const CATEGORIES = [
  {
    name: "Earthy & Tactile Minimalism",
    description: "Smooth river rocks on sand, a rustic wooden bowl, scattered pebbles, solitary feather on dark slate. Warm natural textures, no humans.",
    modifiers: "warm beige and brown tones, muted gold accents, soft natural side lighting, tactile textures, cozy minimalism",
  },
  {
    name: "The Artisan's Focus",
    description: "Empty wooden workbench with scattered vintage tools, open antique book under a warm desk lamp, dim room with rich wood grain.",
    modifiers: "warm amber lamp light, deep shadows, rich brown tones, shallow depth of field, nostalgic artisan atmosphere",
  },
  {
    name: "Solitude Window Scene",
    description: "Empty leather armchair by a large window overlooking a moody cityscape at dusk, steaming cup of coffee on a glass table. No people.",
    modifiers: "cool blue exterior contrasting warm interior, soft window light, contemplative mood, cinematic composition",
  },
  {
    name: "Scenic Cabin & Paths",
    description: "Glowing A-frame cabin in a dark forest, or a lonely wooden bridge over a misty river at dusk. Warm inviting light from within.",
    modifiers: "warm orange cabin glow, deep forest greens, moody dusk sky, cozy atmosphere, landscape photography",
  },
  {
    name: "Ethereal Magical Nature",
    description: "Highly saturated dreamy landscape, rain on luminous forest leaves, bioluminescent mushrooms, enchanted garden with firefly-like lights.",
    modifiers: "vibrant pinks purples and blues, magical atmosphere, soft bokeh lights, fantasy nature, dreamy ethereal",
  },
  {
    name: "Golden Hour Meadow",
    description: "Sweeping meadow or grassland bathed in golden hour light, tall grass catching warm sunlight, soft breeze visible in the grain.",
    modifiers: "warm golden light, rich amber tones, lens flare, panoramic landscape, peaceful and warm",
  },
  {
    name: "Rainy Window Reflection",
    description: "Close-up of rain droplets on a window pane, blurred warm city lights or candles visible through the glass. No people visible.",
    modifiers: "soft bokeh lights, warm amber and cool blue contrast, intimate mood, macro detail on droplets",
  },
  {
    name: "Autumn Forest Floor",
    description: "Carpet of fallen autumn leaves in warm reds oranges and yellows, single path winding through tall trees, dappled sunlight.",
    modifiers: "warm autumn palette, rich reds and oranges, soft dappled light, cozy natural atmosphere",
  },
  {
    name: "Ocean Sunrise",
    description: "Calm ocean at sunrise, soft pink and orange sky reflected on gentle waves, distant horizon line, peaceful and vast.",
    modifiers: "soft sunrise colors, warm pinks and oranges, calm water reflections, wide panoramic, serene mood",
  },
  {
    name: "Vintage Library Corner",
    description: "Towering old bookshelves with leather-bound books, warm reading lamp casting amber pool of light, dust motes in the air. No people.",
    modifiers: "warm amber library lighting, rich leather and wood tones, atmospheric dust particles, scholarly calm",
  },
  {
    name: "Lavender Fields at Dusk",
    description: "Vast lavender field stretching to the horizon, soft warm dusk light, gentle purple rows creating natural perspective lines.",
    modifiers: "soft warm dusk light, vibrant purple and green, wide scenic view, peaceful and dreamy, landscape photography",
  },
  {
    name: "Snowy Silence",
    description: "Fresh undisturbed snow covering a quiet landscape, single tree or cabin, soft overcast light creating blue-white tones.",
    modifiers: "clean white snow, soft blue shadows, quiet overcast light, minimal composition, serene winter",
  },
  {
    name: "Candlelit Still Life",
    description: "Warm candlelit scene with a single flickering candle, old journal or dried flowers beside it, warm intimate atmosphere.",
    modifiers: "warm candlelight glow, rich amber and gold, soft shadows, intimate close-up, cozy atmosphere",
  },
  {
    name: "Japanese Zen Garden",
    description: "Raked sand patterns in a zen garden, carefully placed stones, soft morning light, bamboo or bonsai in the background.",
    modifiers: "soft morning light, muted earth tones, clean geometric sand patterns, peaceful minimalism, zen atmosphere",
  },
  {
    name: "Coastal Cliff Sunset",
    description: "Dramatic coastal cliff edge overlooking the ocean at sunset, warm golden light painting the rocky formations, seabirds in the distance.",
    modifiers: "dramatic sunset light, warm golden cliffs, deep blue ocean, panoramic scale, cinematic landscape",
  },
  {
    name: "Botanical Close-Up",
    description: "Extreme macro of a single flower with morning dewdrops, soft pastel petals, blurred garden background with bokeh.",
    modifiers: "macro photography, soft pastel colors, morning dew detail, creamy bokeh background, natural beauty",
  },
  {
    name: "Mountain Lake Reflection",
    description: "Perfectly still alpine lake reflecting snow-capped mountains, mirror-like water surface, early morning calm.",
    modifiers: "mirror reflections, cool blue and warm alpine glow, panoramic landscape, crystal clear water, majestic scale",
  },
  {
    name: "Warm Kitchen Scene",
    description: "Rustic farmhouse kitchen table with fresh bread, honey jar, and wildflowers in a mason jar. Morning sunlight streaming through the window. No people.",
    modifiers: "warm morning sunlight, rustic wood tones, cozy domestic warmth, food photography style, inviting atmosphere",
  },
];

// Negative prompt for Pollinations
const NEGATIVE_PROMPT = "human, face, person, portrait, hands, body, figure, skull, skeleton, ghost, mannequin, doll, statue of a person, text, watermark, letters, words, logo, signature, blurry, low quality, distorted";

export class DirectorLifeQuotesEngine {
  constructor(apiKeysString) {
    this.rotator = new GeminiRotator(apiKeysString);
  }

  /**
   * Select a category using shuffle-bag logic: avoids last N used categories.
   */
  _selectCategory(state) {
    const history = state.ig_history_life_quotes || [];
    const recentCount = Math.min(Math.floor(CATEGORIES.length / 2), history.length);
    const recentCategoryNames = history
      .slice(0, recentCount)
      .map(h => h.category)
      .filter(Boolean);

    let available = CATEGORIES.filter(c => !recentCategoryNames.includes(c.name));
    if (available.length === 0) available = CATEGORIES;

    const idx = Math.floor(Math.random() * available.length);
    return available[idx];
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

    const category = this._selectCategory(state);
    this._lastCategory = category.name;

    console.log(`[Director] 🎨 Selected category: "${category.name}"`);

    const directorPrompt = `
You are a world-class creative director building beautiful, uplifting, and scenic Instagram content for @life.quotes__98.
Create a 4K 3840x4800 Instagram quote image. Select a completely new, meaningful quote from a different author than previously used. The quote should be relatable, uplifting, motivational, or focused on daily life, growth, and resilience.

CRITICAL: DO NOT use quotes from any of these previously used authors: ${usedAuthors || 'None yet'}.

MANDATORY AESTHETIC THEME FOR THIS POST:
You MUST design the scene entirely around this specific visual category: "${category.name}".
Scene guidance: ${category.description}

ABSOLUTE PROHIBITION: The image must contain ZERO humans, faces, bodies, hands, silhouettes of people, or any human-like figures. Focus ONLY on landscapes, objects, textures, and nature.

CRITICAL SUBJECT RULE: Invent a wildly unique, highly specific composition within the category. Never describe the exact same scene twice. Keep subjects logical and visually clear.

COMPOSITION RULE:
The quote MUST be extremely short and punchy. Maximum 200 characters total.
Leave some breathing room in the center of the image — avoid placing the main subject dead-center. The center area should be relatively calm so overlaid text remains readable.

OUTPUT FORMAT:
You MUST output ONLY a valid JSON object with exactly three keys. Do NOT wrap it in markdown backticks.
{
  "quote_text": "The exact quote text (without quotes).",
  "author": "Author Name",
  "imagen_prompt": "The highly detailed, cinematic prompt for the image. Minimum 80 words. Focus on the specific scene, objects, lighting, colors, and composition. Do NOT mention humans or people."
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
      
      // Inject the per-category modifiers
      parsed._categoryModifiers = category.modifiers;
      parsed._categoryName = category.name;
      
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
   * Phase 3-6: Generate Image via Pollinations AI or Fallback
   */
  async generateImage(prompt, categoryModifiers = "") {
    console.log("[Director] 📸 Phase 3-6: Requesting AI render via Pollinations...");

    const maxAttempts = 2;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const randomSeed = Math.floor(Math.random() * 999999999);
        
        const qualityModifiers = "no text, no watermarks, no letters, no humans, no faces, no people, ultra high quality, 8k resolution, masterpiece, professional photography";
        const fullPrompt = `${prompt}, ${categoryModifiers}, ${qualityModifiers}`;
        const encodedPrompt = encodeURIComponent(fullPrompt);
        const encodedNegative = encodeURIComponent(NEGATIVE_PROMPT);
        
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1350&nologo=true&seed=${randomSeed}&negative=${encodedNegative}`;
        
        console.log(`[Director] 🌱 Seed: ${randomSeed} (attempt ${attempt}/${maxAttempts})`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Pollinations API failed: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Basic brightness validation
        const avgBrightness = this._estimateJpegBrightness(buffer);
        console.log(`[Director] 💡 Estimated image brightness: ${avgBrightness.toFixed(1)}/255`);
        
        if (avgBrightness < 30 && attempt < maxAttempts) {
          console.log(`[Director] ⚠️ Image too dark (${avgBrightness.toFixed(1)}), retrying with new seed...`);
          continue;
        }
        
        console.log("[Director] ✅ Image rendered successfully!");
        return buffer.toString("base64");
      } catch (error) {
        console.error(`[Director] ⚠️ Pollinations attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxAttempts) break;
      }
    }

    console.log("[Director] 🔄 Engaging Secondary Fallback API (Hugging Face)...");
    
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
        body: JSON.stringify({ 
          inputs: prompt,
          parameters: {
            negative_prompt: NEGATIVE_PROMPT,
          }
        }),
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

  /**
   * Quick brightness estimation by sampling raw JPEG bytes.
   */
  _estimateJpegBrightness(buffer) {
    const start = Math.floor(buffer.length * 0.25);
    const end = Math.floor(buffer.length * 0.75);
    const step = Math.max(1, Math.floor((end - start) / 1000));
    let sum = 0;
    let count = 0;
    for (let i = start; i < end; i += step) {
      sum += buffer[i];
      count++;
    }
    return count > 0 ? sum / count : 128;
  }
}
