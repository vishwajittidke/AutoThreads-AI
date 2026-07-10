import { readState, writeState, hasPostedToday, recordSuccessfulPost, recordError, commitAndPush } from "./state.js";
import { DirectorEngine } from "./director.js";
import { overlayTypography } from "./typography.js";
import { InstagramPublisher } from "./instagram.js";
import { generateContent } from "./gemini.js";
import { publishToThreads } from "./threads.js";
import fs from "fs/promises";
import { execSync } from "child_process";

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              AutoThreads-AI: Dual Engine (IG + Threads)      ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`   🕐 Execution started: ${new Date().toISOString()}\n`);

  const apiKeys = process.env.GEMINI_API_KEYS;
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const threadsToken = process.env.THREADS_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_USER_ID;
  const threadsUserId = process.env.THREADS_USER_ID;

  if (!apiKeys || !igToken || !threadsToken || !igUserId || !threadsUserId) {
    console.error("❌ Missing environment variables. Please configure GitHub Secrets (GEMINI_API_KEYS, INSTAGRAM_ACCESS_TOKEN, THREADS_ACCESS_TOKEN, INSTAGRAM_USER_ID, THREADS_USER_ID).");
    process.exit(1);
  }

  const state = readState();
  
  if (hasPostedToday(state)) {
    console.log("   ✅ A post has already been published today (IST). Idempotency lock active.");
    console.log("   🛑 Terminating safely to prevent duplicate posts.");
    process.exit(0);
  }

  let finalIgTopic = "Unknown";
  let finalThreadsTopic = "Unknown";
  let hasError = false;

  // ==========================================
  // PIPELINE 1: INSTAGRAM (IMAGE + TYPOGRAPHY)
  // ==========================================
  try {
    console.log("\\n═══ [PIPELINE 1] Instagram Generation & Publishing ══════════\\n");
    const director = new DirectorEngine(apiKeys);
    
    const data = await director.generateQuoteAndScene();
    console.log(`\n💭 IG Quote: "${data.quote_text}"`);
    console.log(`✍️  Author: ${data.author}\n`);
    finalIgTopic = data.author;
    
    const base64Image = await director.generateImage(data.imagen_prompt);
    const finalBuffer = await overlayTypography(base64Image, data.quote_text, data.author);

    const imagePath = "outputs/today_post.jpg";
    await fs.mkdir("outputs", { recursive: true });
    await fs.writeFile(imagePath, finalBuffer);
    
    console.log("   📤 Staging image to GitHub...");
    execSync('git config user.name "AutoThreads-AI Bot"');
    execSync('git config user.email "autothreads-bot@automated.dev"');
    execSync(`git add ${imagePath}`);
    execSync(`git commit -m "chore(assets): staging image for Instagram"`);
    execSync(`git push`);
    
    const commitHash = execSync("git rev-parse HEAD").toString().trim();
    const publicImageUrl = `https://raw.githubusercontent.com/vishwajittidke/AutoThreads-AI/${commitHash}/${imagePath}`;

    const publisher = new InstagramPublisher(igUserId, igToken);
    const caption = `"${data.quote_text}"\n\n— ${data.author}\n\n#quotes #motivation #aesthetic #philosophy`;
    await publisher.publishImage(publicImageUrl, caption);
    
  } catch (error) {
    console.error(`\n❌ IG PIPELINE ERROR: ${error.message}`);
    recordError(state, "IG: " + error.message, "Instagram");
    hasError = true;
  }

  // ==========================================
  // PIPELINE 2: THREADS (TEXT ONLY)
  // ==========================================
  try {
    console.log("\\n═══ [PIPELINE 2] Threads Generation & Publishing ════════════\\n");
    // We use the first key in the comma-separated list for the old Gemini system
    const singleApiKey = apiKeys.split(",")[0].trim();
    
    const { content, topic } = await generateContent(singleApiKey);
    finalThreadsTopic = topic;
    
    await publishToThreads(threadsUserId, threadsToken, content);
  } catch (error) {
    console.error(`\n❌ THREADS PIPELINE ERROR: ${error.message}`);
    recordError(state, "Threads: " + error.message, "Threads");
    hasError = true;
  }

  // ==========================================
  // FINAL STATE COMMIT
  // ==========================================
  if (!hasError) {
    recordSuccessfulPost(state, {
      postId: "dual-publish-success",
      topic: `IG: ${finalIgTopic} | Threads: ${finalThreadsTopic}`,
      content: "Published to both platforms"
    });
    
    
    try {
      writeState(state);
      commitAndPush(`chore(state): daily posts published successfully`);
      console.log("\\n   ✅ Daily run completed successfully for BOTH platforms!");
    } catch (e) {
      console.log("\\n   ⚠️ Error committing state to GitHub:", e.message);
    }
  } else {
    try {
      writeState(state);
      commitAndPush(`fix(state): record pipeline errors`);
    } catch (e) {}
    process.exit(1);
  }
}

main();
