import { createCanvas, loadImage } from "canvas";

/**
 * AutoThreads-AI: Phase 7 - Typography Integration
 * Overlays Gen Z "Notes App" style typography matching raw aesthetic.
 */
export async function overlayTypography(quoteText, authorName) {
  console.log("[Typography] 🔠 Phase 7: Generating Notes App style image...");
  
  // Clean quote
  const cleanQuote = quoteText.replace(/^["']|["']$/g, '').toLowerCase().trim();
  
  const width = 1080;
  const height = 1350;
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background: Soft gradient or plain off-white
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#e0e5ec');
  gradient.addColorStop(1, '#f7f9fc');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Draw "Notes App" container
  const padding = 80;
  const boxX = padding;
  const boxY = height / 3;
  const boxW = width - (padding * 2);
  
  // Approximate height based on text length
  const linesCount = cleanQuote.split('\n').length + (cleanQuote.length / 30);
  const boxH = Math.max(400, linesCount * 60 + 150);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 40);
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = 'transparent';

  // Draw Text
  ctx.fillStyle = '#1c1c1e';
  ctx.font = 'bold 50px "Arial", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
      // Handle explicit newlines
      if (words[n].includes('\n')) {
        const parts = words[n].split('\n');
        for (let p = 0; p < parts.length; p++) {
          const testLine = line + parts[p] + ' ';
          if (context.measureText(testLine).width > maxWidth && line !== '') {
            context.fillText(line.trim(), x, currentY);
            line = parts[p] + ' ';
            currentY += lineHeight;
          } else {
            context.fillText(testLine.trim(), x, currentY);
            line = '';
            currentY += lineHeight;
          }
        }
        continue;
      }

      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && line !== '') {
        context.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line.trim(), x, currentY);
    return currentY + lineHeight;
  };

  const endY = wrapText(ctx, cleanQuote, boxX + 80, boxY + 80, boxW - 160, 70);

  // Draw Handle/Time
  ctx.fillStyle = '#8e8e93';
  ctx.font = '30px "Arial", sans-serif';
  
  const now = new Date();
  const timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " at " + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  ctx.fillText(timeStr, boxX + 80, endY + 20);
  
  // Footer handle
  ctx.fillStyle = '#8e8e93';
  ctx.textAlign = 'center';
  ctx.font = '30px "Arial", sans-serif';
  ctx.fillText("@life.quotes__98", width / 2, height - 100);

  console.log("[Typography] ✅ Gen Z Typography perfectly integrated.");
  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}
