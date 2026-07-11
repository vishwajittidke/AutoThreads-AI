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
  console.log("║              AutoThreads-AI: Decoupled Engine                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`   🕐 Execution started: ${new Date().toISOString()}\n`);

  // Parse Command Line Arguments for Target
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf("--target");
  let target = "all";
  if (targetIndex !== -1 && args[targetIndex + 1]) {
    target = args[targetIndex + 1].toLowerCase();
  }
  
  if (target !== "ig" && target !== "threads") {
    console.error("❌ Invalid or missing target. You must specify --target ig OR --target threads.");
    process.exit(1);
  }

  console.log(`   🎯 Target Platform: ${target.toUpperCase()}\n`);

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
  
  if (hasPostedToday(state, target)) {
    console.log(`   ✅ Limit reached for ${target.toUpperCase()} today. Idempotency lock active.`);
    console.log("   🛑 Terminating safely to prevent duplicate posts.");
    process.exit(0);
  }

  let finalTopic = "Unknown";
  let hasError = false;

  // ==========================================
  // PIPELINE: INSTAGRAM (IMAGE + TYPOGRAPHY)
  // ==========================================
  if (target === "ig") {
    try {
      console.log("\\n═══ [PIPELINE] Instagram Generation & Publishing ══════════\\n");
      const director = new DirectorEngine(apiKeys);
      
      const data = await director.generateQuoteAndScene();
      console.log(`\n💭 IG Quote: "${data.quote_text}"`);
      console.log(`✍️  Author: ${data.author}\n`);
      finalTopic = data.author;
      
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
      // Clean quote to lowercase for caption
      const lowerQuote = data.quote_text.toLowerCase().replace(/^["']|["']$/g, '').replace(/\\*/g, '').trim();
      
      // Create the exact aesthetic caption requested
      const caption = `♠️ Drop ❤ if you believe\n\n${lowerQuote}\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n#likes #like #follow #likeforlikes #love #l #instagood #instagram #likeforlike #followme #followforfollowback #likeforfollow #f #followers #photooftheday #instalike #followback #likesforlikes #photography #followforfollow #comment #picoftheday #fashion #liker #bhfyp #likesforlike #likeback #me #beautiful #bhfyp`;

      await publisher.publishImage(publicImageUrl, caption);
      
    } catch (error) {
      console.error(`\n❌ IG PIPELINE ERROR: ${error.message}`);
      recordError(state, "IG: " + error.message, "Instagram");
      hasError = true;
    }
  }

  // ==========================================
  // PIPELINE: THREADS (TEXT ONLY)
  // ==========================================
  if (target === "threads") {
    try {
      console.log("\\n═══ [PIPELINE] Threads Generation & Publishing ════════════\\n");
      // We use the first key in the comma-separated list for the old Gemini system
      const singleApiKey = apiKeys.split(",")[0].trim();
      
      const { content, topic } = await generateContent(singleApiKey);
      finalTopic = topic;
      
      await publishToThreads(threadsUserId, threadsToken, content);
    } catch (error) {
      console.error(`\n❌ THREADS PIPELINE ERROR: ${error.message}`);
      recordError(state, "Threads: " + error.message, "Threads");
      hasError = true;
    }
  }

  // ==========================================
  // FINAL STATE COMMIT
  // ==========================================
  if (!hasError) {
    recordSuccessfulPost(state, {
      postId: `${target}-publish-success`,
      topic: finalTopic,
      content: "Published to platform",
      target: target
    });
    
    try {
      writeState(state);
      commitAndPush(`chore(state): ${target.toUpperCase()} post published successfully`);
      console.log(`\\n   ✅ Daily run completed successfully for ${target.toUpperCase()}!`);
    } catch (e) {
      console.log("\\n   ⚠️ Error committing state to GitHub:", e.message);
    }
  } else {
    try {
      writeState(state);
      commitAndPush(`fix(state): record pipeline errors for ${target.toUpperCase()}`);
    } catch (e) {}
    process.exit(1);
  }
}

main();
