import { readState, writeState, hasPostedToday, recordSuccessfulPost, recordError, commitAndPush } from "./state.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DirectorLifeQuotesEngine } from "./director_life_quotes.js";
import { overlayTypography } from "./typography_life_quotes.js";
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
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN_LIFE_QUOTES;
  const threadsToken = process.env.THREADS_ACCESS_TOKEN; // Wait, maybe they don't have a threads account for life quotes, but I'll leave it
  const igUserId = process.env.INSTAGRAM_USER_ID_LIFE_QUOTES;
  const threadsUserId = process.env.THREADS_USER_ID;

  if (!apiKeys || !igToken || !threadsToken || !igUserId || !threadsUserId) {
    console.error("❌ Missing environment variables. Please configure GitHub Secrets (GEMINI_API_KEYS, INSTAGRAM_ACCESS_TOKEN, THREADS_ACCESS_TOKEN, INSTAGRAM_USER_ID, THREADS_USER_ID).");
    process.exit(1);
  }

  const state = readState();
  
  const stateTarget = target === "ig" ? "life_quotes" : target;
  if (hasPostedToday(state, stateTarget)) {
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
      const director = new DirectorLifeQuotesEngine(apiKeys);
      
      const data = await director.generateQuoteAndScene();
      console.log(`\n💭 IG Quotes: ${JSON.stringify(data.quotes)}`);
      console.log(`✍️  Author: ${data.author}\n`);
      finalTopic = "LifeQuotes: " + data.author;
      
      const styles = ['notes', 'dark', 'twitter'];
      let lastStyle = null;
      
      const buffers = [];
      const imagePaths = [];
      
      await fs.mkdir("outputs", { recursive: true });
      
      for (let i = 0; i < data.quotes.length; i++) {
        // Pick a random style different from the last one
        let availableStyles = styles.filter(s => s !== lastStyle);
        let selectedStyle = availableStyles[Math.floor(Math.random() * availableStyles.length)];
        lastStyle = selectedStyle;
        
        const buffer = await overlayTypography(data.quotes[i], data.author, selectedStyle);
        buffers.push(buffer);
        
        const path = `outputs/today_post_${i + 1}.jpg`;
        imagePaths.push(path);
        await fs.writeFile(path, buffer);
      }
      
      // CTA Slide
      const ctaBuffer = await overlayTypography("send this to someone who needs a reminder", "", 'cta');
      buffers.push(ctaBuffer);
      const ctaPath = `outputs/today_post_${data.quotes.length + 1}.jpg`;
      imagePaths.push(ctaPath);
      await fs.writeFile(ctaPath, ctaBuffer);
      
      console.log("   📤 Uploading carousel images securely to AWS S3...");
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      });
      const bucketName = process.env.AWS_BUCKET_NAME;
      
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const publicUrls = [];

      for (const [index, buffer] of buffers.entries()) {
        const objectKey = `ig-posts/post-${Date.now()}-${index}.jpg`;
        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: buffer,
          ContentType: 'image/jpeg'
        });
        await s3Client.send(putCommand);
        
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: objectKey
        });
        const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
        publicUrls.push(url);
      }

      console.log("   🔗 Generated secure pre-signed URLs for carousel items.");

      const publisher = new InstagramPublisher(igUserId, igToken);
      const caption = data.caption;

      await publisher.publishCarousel(publicUrls, caption);
      
    } catch (error) {
      console.error(`\n❌ IG PIPELINE ERROR: ${error.message}`);
      recordError(state, "IG Life Quotes: " + error.message, "Instagram");
      hasError = true;
    }
  }

  // ==========================================
  // PIPELINE: THREADS (TEXT ONLY)
  // ==========================================
  if (target === "threads") {
    try {
      console.log("\\n═══ [PIPELINE] Threads Generation & Publishing ════════════\\n");
      
      const { content, topic } = await generateContent(apiKeys);
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
      target: stateTarget
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
      
      // Milestone 2: Silent Failure Notification System
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        console.log("   🔔 Dispatching Discord failure notification...");
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🚨 **AutoThreads-AI Pipeline Error** 🚨\nTarget: **${target.toUpperCase()}**\nThe pipeline just crashed. Check the GitHub Actions logs immediately.\nError recorded in state: \`${state.last_error}\``
          })
        });
      }
    } catch (e) {
      console.error("   ⚠️ Failed to dispatch error notifications:", e.message);
    }
    process.exit(1);
  }
}

main();
