import { readState, hasPostedToday, recordSuccessfulPost, recordError, commitAndPush } from "./state.js";
import { DirectorEngine } from "./director.js";
import { overlayTypography } from "./typography.js";
import { InstagramPublisher } from "./instagram.js";
import fs from "fs/promises";
import { execSync } from "child_process";

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              AutoThreads-AI: The Ace Engine                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(\`   🕐 Execution started: \${new Date().toISOString()}\\n\`);

  console.log("═══ Phase 1: Context & Bootstrap ═══════════════════════════════");
  
  const apiKeys = process.env.GEMINI_API_KEYS;
  const metaToken = process.env.META_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_USER_ID;

  if (!apiKeys || !metaToken || !igUserId) {
    console.error("❌ Missing environment variables. Please configure GitHub Secrets.");
    process.exit(1);
  }

  const state = readState();
  
  if (hasPostedToday(state)) {
    console.log("   ✅ A post has already been published today (IST). Idempotency lock active.");
    console.log("   🛑 Terminating safely to prevent duplicate posts.");
    process.exit(0);
  }

  try {
    // Phase 2 & 3: Generation
    console.log("\\n═══ Phase 2: Generation Engine ═══════════════════════════════\\n");
    const director = new DirectorEngine(apiKeys);
    
    // Generate Quote & Image Prompt
    const data = await director.generateQuoteAndScene();
    console.log(\`\\n💭 Quote: "\${data.quote_text}"\`);
    console.log(\`✍️  Author: \${data.author}\\n\`);
    
    // Generate Raw Image
    const base64Image = await director.generateImage(data.imagen_prompt);

    // Overlay Typography
    const finalBuffer = await overlayTypography(base64Image, data.quote_text, data.author);

    // Save Image Locally
    const imagePath = "outputs/today_post.jpg";
    await fs.mkdir("outputs", { recursive: true });
    await fs.writeFile(imagePath, finalBuffer);
    console.log(\`   ✅ Image saved to \${imagePath}\`);

    // Phase 4: Stage & Push Image to GitHub for Public URL
    console.log("\\n═══ Phase 4: Asset Staging ═══════════════════════════════════\\n");
    console.log("   📤 Pushing image to GitHub to generate public URL...");
    execSync('git config user.name "AutoThreads-AI Bot"');
    execSync('git config user.email "autothreads-bot@automated.dev"');
    execSync(\`git add \${imagePath}\`);
    execSync(\`git commit -m "chore(assets): staging image for Instagram"\`);
    execSync(\`git push\`);
    
    // Get commit hash for cache busting
    const commitHash = execSync("git rev-parse HEAD").toString().trim();
    const publicImageUrl = \`https://raw.githubusercontent.com/vishwajittidke/AutoThreads-AI/\${commitHash}/\${imagePath}\`;
    console.log(\`   🔗 Public Image URL: \${publicImageUrl}\`);

    // Phase 5: Instagram Publishing
    console.log("\\n═══ Phase 5: Instagram Publishing ════════════════════════════\\n");
    const publisher = new InstagramPublisher(igUserId, metaToken);
    
    // Create caption
    const caption = \`"\${data.quote_text}"\\n\\n— \${data.author}\\n\\n#quotes #motivation #aesthetic #philosophy\`;
    const postId = await publisher.publishImage(publicImageUrl, caption);

    // Phase 6: State Persistence
    console.log("\\n═══ Phase 6: State Persistence ═══════════════════════════════\\n");
    recordSuccessfulPost(state, {
      postId: postId,
      topic: data.author,
      content: data.quote_text
    });
    
    commitAndPush(\`chore(state): post published [\${data.author.slice(0, 30)}]\`);
    console.log("\\n   ✅ Daily run completed successfully!");

  } catch (error) {
    console.error(\`\\n❌ FATAL ERROR: \${error.message}\`);
    recordError(state, error.message, "Engine");
    try {
      commitAndPush(\`fix(state): record error log\`);
    } catch (e) {}
    process.exit(1);
  }
}

main();
