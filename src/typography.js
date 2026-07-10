import { Jimp, loadFont } from "jimp";

/**
 * AutoThreads-AI: Phase 7 - Typography Integration
 * Overlays perfectly-kerned text onto the base image.
 */
export async function overlayTypography(imageBase64, quoteText, authorName) {
  console.log("[Typography] 🔠 Phase 7: Overlaying cinematic typography...");
  
  // 1. Decode base64 to buffer and load into Jimp
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const image = await Jimp.read(imageBuffer);

  // 2. Load built-in Jimp fonts (using large white font for quote, smaller for author)
  // In a production setup, we would load custom TTF/BMFont files for ultra-luxury typography
  // For now we use the largest available built-in font
  const fontQuote = await loadFont("FONT_SANS_64_WHITE");
  const fontAuthor = await loadFont("FONT_SANS_32_WHITE");

  // 3. Calculate text placement
  // Instagram 1:1 format is usually 1024x1024 from Imagen 3.
  const maxWidth = image.bitmap.width - 160; // 80px padding on each side
  const startX = 80;
  
  // Add a slight darkening gradient or overlay to ensure text readability?
  // We will trust the Director's image prompt to create "negative space".

  // Print Quote (centered or left aligned)
  image.print(
    fontQuote,
    startX,
    image.bitmap.height / 2 - 100, // Centered vertically roughly
    {
      text: `"${quoteText}"`,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    },
    maxWidth
  );

  // Print Author
  image.print(
    fontAuthor,
    startX,
    image.bitmap.height - 200, 
    {
      text: `— ${authorName}`,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    },
    maxWidth
  );

  console.log("[Typography] ✅ Typography perfectly integrated.");

  // Export back to buffer
  const finalBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  return finalBuffer;
}
