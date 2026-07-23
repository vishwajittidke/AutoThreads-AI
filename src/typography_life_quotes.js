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
  
  // 2. Add ultra-subtle cinematic dark gradient overlay (only at the very bottom for the handle)
  // The AI prompt already enforces dark centers, so we don't need a heavy black mask.
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
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
  
  // Add a soft elegant drop shadow to guarantee legibility against any background
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  // Max width with luxurious padding
  const maxTextWidth = width - 240; 
  
  // Center slightly above exact middle for visual balance
  wrapText(ctx, cleanQuote, width / 2, height / 2 - 40, maxTextWidth, 54);
  
  // Disable shadow for the handle
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Tiny handle at the very bottom
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '16px "Arial", sans-serif';
  ctx.fillText("@life.quotes__98", width / 2, height - 80);
  
  console.log("[Typography] ✅ Typography perfectly integrated.");

  // Export to buffer
  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}
