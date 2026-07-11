import { createCanvas, loadImage } from "canvas";

/**
 * AutoThreads-AI: Phase 7 - Typography Integration
 * Overlays high-end editorial canvas typography matching @the.ace___ aesthetic.
 */
export async function overlayTypography(imageBase64, quoteText, authorName) {
  console.log("[Typography] 🔠 Phase 7: Overlaying high-end canvas typography...");
  
  // Clean quote: Strip surrounding quotes, markdown asterisks, and convert to lowercase
  const cleanQuote = quoteText.replace(/^["']|["']$/g, '').replace(/\*/g, '').toLowerCase().trim();
  
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const img = await loadImage(imageBuffer);
  
  const width = img.width;
  const height = img.height;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // 1. Draw base image
  ctx.drawImage(img, 0, 0, width, height);
  
  // 2. Add subtle cinematic dark gradient overlay for text legibility
  // Darker at center and bottom where text is
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(0,0,0,0.1)');
  gradient.addColorStop(0.4, 'rgba(0,0,0,0.5)');
  gradient.addColorStop(0.6, 'rgba(0,0,0,0.6)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // 3. Configure typography context
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Utility to wrap text beautifully
  const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    
    // Draw lines centered vertically
    const totalHeight = lines.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2);
    
    for(let i = 0; i < lines.length; i++) {
      context.fillText(lines[i], x, startY + (i * lineHeight));
    }
  };

  // 4. Draw Quote (Elegant Lowercase Upright Serif)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  // The grid uses a classic, upright serif (like Times New Roman or Garamond), NOT italic.
  ctx.font = '34px "Times New Roman", "Garamond", "Georgia", serif';
  
  // Max width with luxurious padding
  const maxTextWidth = width - 240; 
  
  // Center slightly above exact middle for visual balance
  wrapText(ctx, cleanQuote, width / 2, height / 2 - 40, maxTextWidth, 54);
  
  // 5. Draw Signature Logo
  try {
    // Attempt to load the user's custom transparent logo.png
    // The user should place 'logo.png' in the root directory
    const logoImg = await loadImage("./logo.png");
    
    // Scale logo dynamically (assuming we want it to be ~60px tall)
    const logoHeight = 60;
    const scale = logoHeight / logoImg.height;
    const logoWidth = logoImg.width * scale;
    
    // Draw centered at the bottom
    ctx.drawImage(logoImg, (width / 2) - (logoWidth / 2), height - 160, logoWidth, logoHeight);
    console.log("[Typography] ♠️ Custom Ace logo successfully blended.");
    
  } catch (err) {
    // Fallback if logo.png is not found
    console.warn("[Typography] ⚠️ 'logo.png' not found in root directory! Falling back to cursive font.");
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'italic 42px "Brush Script MT", "Great Vibes", "Snell Roundhand", cursive';
    ctx.fillText("Ace", width / 2, height - 160);
  }
  
  console.log("[Typography] ✅ Typography perfectly integrated.");

  // Export to buffer
  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}
