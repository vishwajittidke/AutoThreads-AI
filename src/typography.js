import { createCanvas, loadImage } from "canvas";

/**
 * AutoThreads-AI: Typography Integration
 * Randomly generates one of three Gen Z viral aesthetics:
 * 1. Notes App
 * 2. Dark Mode / Neon
 * 3. Fake Twitter Screenshot
 */
export async function overlayTypography(quoteText, authorName, forcedStyle = null) {
  const styles = ['notes', 'dark', 'twitter'];
  const style = forcedStyle || styles[Math.floor(Math.random() * styles.length)];
  console.log(`[Typography] 🔠 Selected Aesthetic: ${style}`);
  
  const cleanQuote = quoteText.replace(/^["']|["']$/g, '').toLowerCase().trim();
  const width = 1080;
  const height = 1350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  function addNoise(opacity) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const val = (Math.random() - 0.5) * opacity;
      data[i] += val;
      data[i + 1] += val;
      data[i + 2] += val;
    }
    ctx.putImageData(imgData, 0, 0);
  }
  
  if (style === 'notes') {
    // 1. Notes App Style
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#e0e5ec');
    gradient.addColorStop(1, '#f7f9fc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const padding = 80;
    const boxX = padding;
    const boxY = height / 3;
    const boxW = width - (padding * 2);
    const linesCount = cleanQuote.split('\n').length + (cleanQuote.length / 30);
    const boxH = Math.max(400, linesCount * 60 + 150);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 40);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#1c1c1e';
    ctx.font = '42px "Arial", sans-serif'; // Removed bold, slightly smaller
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const endY = wrapText(ctx, cleanQuote, boxX + 80, boxY + 80, boxW - 160, 65);

    ctx.fillStyle = '#8e8e93';
    ctx.font = '28px "Arial", sans-serif';
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " at " + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    ctx.fillText(timeStr, boxX + 80, endY + 30);
    
    drawHandle(ctx, width, height, "@the.ace___", '#8e8e93');
    addNoise(12);

  } else if (style === 'dark') {
    // 2. Dark Mode Style
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Add subtle noise/grain or glow
    const cx = width/2;
    const cy = height/2;
    const radGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 700);
    radGrd.addColorStop(0, 'rgba(40, 40, 50, 1)');
    radGrd.addColorStop(1, 'rgba(10, 10, 10, 1)');
    ctx.fillStyle = radGrd;
    ctx.fillRect(0, 0, width, height);
    
    addNoise(15);

    ctx.fillStyle = '#f5f5f5';
    ctx.font = '40px "Arial", sans-serif'; // smaller font, more negative space
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    wrapTextCentered(ctx, cleanQuote, width/2, height/2 - 50, width - 200, 60);
    
    drawHandle(ctx, width, height, "@the.ace___", '#555555');

  } else if (style === 'twitter') {
    // 3. Twitter Screenshot Style
    ctx.fillStyle = '#15202b'; // Twitter dark mode background
    ctx.fillRect(0, 0, width, height);

    const boxX = 80;
    const boxY = height / 3;
    const boxW = width - 160;
    const linesCount = cleanQuote.split('\n').length + (cleanQuote.length / 30);
    const boxH = Math.max(350, linesCount * 60 + 200);

    ctx.fillStyle = '#192734'; // Tweet card background
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 30);
    ctx.fill();

    // Fake Avatar
    ctx.fillStyle = '#8899a6';
    ctx.beginPath();
    ctx.arc(boxX + 80, boxY + 80, 40, 0, Math.PI * 2);
    ctx.fill();

    // Fake Name & Handle
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Arial", sans-serif';
    ctx.fillText("ace", boxX + 140, boxY + 50);
    ctx.fillStyle = '#8899a6';
    ctx.font = '32px "Arial", sans-serif';
    ctx.fillText("@the.ace___", boxX + 140, boxY + 95);

    // Tweet Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '42px "Arial", sans-serif';
    wrapText(ctx, cleanQuote, boxX + 50, boxY + 180, boxW - 100, 55);
    
    drawHandle(ctx, width, height, "@the.ace___", '#8899a6');
    addNoise(8);
  }

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  
  for (let n = 0; n < words.length; n++) {
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
    if (context.measureText(testLine).width > maxWidth && line !== '') {
      context.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
}

function wrapTextCentered(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lines = [];
  
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (context.measureText(testLine).width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  
  let currentY = y - ((lines.length * lineHeight) / 2);
  for (let i = 0; i < lines.length; i++) {
    context.fillText(lines[i], x, currentY);
    currentY += lineHeight;
  }
}

function drawHandle(ctx, width, height, handle, color) {
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.font = '30px "Arial", sans-serif';
  ctx.fillText(handle, width / 2, height - 100);
}
