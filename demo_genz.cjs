const { createCanvas } = require('canvas');
const fs = require('fs');

async function createGenZDemo() {
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
  const boxH = 400;

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

  const text = "not to be dramatic but\ni think about this literally\nevery single day.";
  const lines = text.split('\n');
  
  let startY = boxY + 100;
  lines.forEach(line => {
    ctx.fillText(line, boxX + 80, startY);
    startY += 70;
  });

  // Draw Handle/Time
  ctx.fillStyle = '#8e8e93';
  ctx.font = '30px "Arial", sans-serif';
  ctx.fillText("Oct 24 at 2:00 AM", boxX + 80, startY + 40);

  // Save Image
  const buffer = canvas.toBuffer('image/png');
  const path = 'C:\\Users\\Vishwajit\\.gemini\\antigravity-ide\\brain\\a96fc3db-87c2-495e-b871-24ce6ccf783d\\genz_demo.png';
  fs.writeFileSync(path, buffer);
  console.log('Saved demo to', path);
}

createGenZDemo();
