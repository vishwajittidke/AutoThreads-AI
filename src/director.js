import { GeminiRotator } from "./gemini_rotator.js";
import { readState } from "./state.js";

/**
 * AutoThreads-AI: The Director Engine
 * Executes the 8-Phase Quote & Image Generation Pipeline for Instagram.
 */

// ─── Diverse Visual Categories with Per-Category Modifiers ──────────────────
// Each category carries its own lighting/color profile to prevent monotony.
const CATEGORIES = [
  {
    name: "Golden Hour Landscapes",
    description: "Sweeping golden hour landscape, warm amber sunlight flooding rolling hills or open plains, long dramatic shadows, glowing horizon",
    modifiers: "warm golden light, rich amber tones, soft shadows, cinematic wide shot, vibrant sunset colors",
  },
  {
    name: "Northern Lights & Aurora",
    description: "Vibrant aurora borealis dancing across a clear night sky, green and purple ribbons of light over a snowy landscape or frozen lake",
    modifiers: "vivid green and purple aurora, starry sky, cool blue tones, high contrast, long exposure photography style",
  },
  {
    name: "Minimalist Botanicals",
    description: "Single flower or botanical element, extreme close-up macro photography, soft bokeh background, dewdrops on petals",
    modifiers: "macro photography, shallow depth of field, soft natural lighting, vivid botanical colors, clean composition",
  },
  {
    name: "Vibrant Sunset Cloudscapes",
    description: "Dramatic sky at sunset with vibrant orange, pink, and purple clouds, vast open sky dominating the frame",
    modifiers: "vivid sunset palette, warm oranges and pinks, dramatic cloud formations, wide angle, rich saturated colors",
  },
  {
    name: "Misty Forest Mornings",
    description: "Dense forest with morning mist weaving through tall trees, soft diffused light filtering through the canopy, lush green foliage",
    modifiers: "soft diffused morning light, misty atmosphere, deep greens, ethereal glow, peaceful mood",
  },
  {
    name: "Ocean & Coastal",
    description: "Dramatic ocean scene, turquoise waves crashing on rocky coastline, sea spray catching sunlight, wide coastal panorama",
    modifiers: "vivid ocean blues and teals, dynamic water motion, bright natural light, coastal atmosphere, wide shot",
  },
  {
    name: "Clean White Minimalism",
    description: "Ultra-clean white marble surface or white architectural space, single carefully placed object casting soft shadow, bright airy feel",
    modifiers: "bright high-key lighting, clean whites, minimal soft shadows, airy and spacious, modern minimalist",
  },
  {
    name: "Warm Autumn Palette",
    description: "Autumn forest floor covered in fallen leaves, warm reds oranges and yellows, single path or stream winding through the trees",
    modifiers: "warm autumn colors, rich reds and oranges, soft dappled light, cozy natural atmosphere",
  },
  {
    name: "Neon Cityscape at Night",
    description: "Rain-slicked city street reflecting neon signs, vibrant pink blue and purple neon glow on wet pavement, cyberpunk urban atmosphere",
    modifiers: "vibrant neon colors, wet reflections, pink and blue lighting, urban night photography, cinematic",
  },
  {
    name: "Desert & Sand Dunes",
    description: "Sweeping sand dunes with dramatic light and shadow patterns, warm golden sand stretching to the horizon, pristine wind-carved ridges",
    modifiers: "warm golden sand tones, dramatic directional light, sweeping curves, vast scale, clean composition",
  },
  {
    name: "Underwater Serenity",
    description: "Crystal clear underwater scene, sunlight rays penetrating deep blue water, coral formations or gentle sea life",
    modifiers: "deep aqua and turquoise tones, volumetric light rays, underwater photography, serene and calm",
  },
  {
    name: "Mountain Peaks & Valleys",
    description: "Majestic snow-capped mountain peaks bathed in warm alpenglow, dramatic elevation and scale, clear sky above",
    modifiers: "alpine glow, warm light on snow, dramatic scale, panoramic composition, vivid sky colors",
  },
  {
    name: "Soft Pastel Gradients",
    description: "Abstract soft pastel gradient sky, blending lavender pink peach and soft blue, minimal clouds, dreamy ethereal quality",
    modifiers: "soft pastel colors, gentle gradients, dreamy atmosphere, high-key lighting, ethereal and airy",
  },
  {
    name: "Rustic & Textured Still Life",
    description: "Weathered wooden table with a single artisan object like an old compass, leather journal, or ceramic bowl, warm side lighting",
    modifiers: "warm side lighting, rich textures, earthy brown tones, shallow depth of field, cozy artisan feel",
  },
  {
    name: "Lavender & Wildflower Fields",
    description: "Vast field of lavender or wildflowers stretching to the horizon, soft warm light, gentle breeze visible in the flowers",
    modifiers: "soft warm lighting, vibrant purples and greens, wide scenic view, peaceful and dreamy",
  },
  {
    name: "Moody Architecture",
    description: "Grand architectural interior with dramatic light beams, cathedral arches or modern geometric structures, strong perspective lines",
    modifiers: "dramatic light beams, strong architectural lines, warm and cool contrast, cinematic perspective",
  },
  {
    name: "Starry Night Sky",
    description: "Brilliant milky way arching across a clear dark sky over a silhouetted landscape, thousands of visible stars",
    modifiers: "astrophotography style, vivid milky way, deep blues and purples, star-filled sky, long exposure",
  },
  {
    name: "Tropical Paradise",
    description: "Pristine tropical beach with crystal turquoise water, white sand, palm trees swaying, golden hour warm light",
    modifiers: "tropical warm tones, vivid turquoise water, golden sunlight, lush green palms, paradise atmosphere",
  },
];

// Negative prompt for Pollinations — subjects we never want
const NEGATIVE_PROMPT = "human, face, person, portrait, hands, body, figure, skull, skeleton, ghost, mannequin, doll, statue of a person, text, watermark, letters, words, logo, signature, blurry, low quality, distorted";

export class DirectorEngine {
  constructor(apiKeysString) {
    this.rotator = new GeminiRotator(apiKeysString);
  }

  /**
   * Select a category using shuffle-bag logic: avoids last N used categories.
   */
  _selectCategory(state) {
    const history = state.ig_history || [];
    // Track which category indices were recently used (last N = categories.length / 2)
    const recentCount = Math.min(Math.floor(CATEGORIES.length / 2), history.length);
    const recentCategoryNames = history
      .slice(0, recentCount)
      .map(h => h.category)
      .filter(Boolean);

    // Filter out recently used
    let available = CATEGORIES.filter(c => !recentCategoryNames.includes(c.name));
    if (available.length === 0) available = CATEGORIES;

    // Pick randomly from available
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
      .filter(t => t && t.startsWith("IG:"))
      .map(t => t.split("|")[0].replace("IG:", "").trim())
      .filter(a => a)
      .join(", ");

    const category = this._selectCategory(state);
    // Store selected category name so we can record it in state later
    this._lastCategory = category.name;

    console.log(`[Director] 🎨 Selected category: "${category.name}"`);

    const directorPrompt = `
You are a world-class creative director building high-end Instagram content for @life.quotes__98.
Create a 4K 3840x4800 minimalist editorial Instagram quote image. Select a completely new, meaningful quote from a different author than previously used. 

CRITICAL: DO NOT use quotes from any of these previously used authors: ${usedAuthors || 'None yet'}.

MANDATORY AESTHETIC THEME FOR THIS POST:
You MUST design the scene entirely around this specific visual category: "${category.name}".
Scene guidance: ${category.description}

ABSOLUTE PROHIBITION: The image must contain ZERO humans, faces, bodies, hands, silhouettes of people, or any human-like figures. Focus ONLY on landscapes, objects, textures, and nature.

COMPOSITION RULE:
The quote MUST be extremely short and punchy. Maximum 200 characters total.
Leave some breathing room in the center of the image — avoid placing the main subject dead-center. The center area should be relatively calm so overlaid text remains readable.

Ensure the quote is philosophically substantial, properly attributed, and not overused.

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
      
      // Inject the per-category modifiers into the image prompt
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
   * Now uses per-category modifiers and negative prompts.
   */
  async generateImage(prompt, categoryModifiers = "") {
    console.log("[Director] 📸 Phase 3-6: Requesting AI render via Pollinations...");

    const maxAttempts = 2; // Retry once if brightness check fails
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const randomSeed = Math.floor(Math.random() * 999999999);
        
        // Build prompt: scene prompt + category-specific modifiers + universal quality modifiers
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
        
        // Basic brightness validation: check that the image isn't uniformly dark
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
        if (attempt === maxAttempts) {
          // Fall through to fallback
          break;
        }
      }
    }

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
   * Not pixel-accurate but good enough to catch all-black images.
   */
  _estimateJpegBrightness(buffer) {
    // Sample every Nth byte from the middle 50% of the file (skip headers/footers)
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
