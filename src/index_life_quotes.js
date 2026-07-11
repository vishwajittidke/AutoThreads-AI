import { readState, writeState, hasPostedToday, recordSuccessfulPost, recordError, commitAndPush } from "./state.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DirectorLifeQuotesEngine } from "./director_life_quotes.js";
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
      console.log(`\n💭 IG Quote: "${data.quote_text}"`);
      console.log(`✍️  Author: ${data.author}\n`);
      finalTopic = "LifeQuotes: " + data.author;
      
      const base64Image = await director.generateImage(data.imagen_prompt);
      const finalBuffer = await overlayTypography(base64Image, data.quote_text, data.author);

      const imagePath = "outputs/today_post.jpg";
      await fs.mkdir("outputs", { recursive: true });
      await fs.writeFile(imagePath, finalBuffer);
      
      console.log("   📤 Uploading image securely to AWS S3...");
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      });
      const bucketName = process.env.AWS_BUCKET_NAME;
      const objectKey = `ig-posts/post-${Date.now()}.jpg`;

      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: finalBuffer,
        ContentType: 'image/jpeg'
      });
      await s3Client.send(putCommand);

      console.log("   🔗 Generating 1-hour secure pre-signed URL...");
      // Generate a presigned URL that expires in 1 hour (3600 seconds)
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey
      });
      const publicImageUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

      const publisher = new InstagramPublisher(igUserId, igToken);
      // Clean quote to lowercase for caption
      const lowerQuote = data.quote_text.toLowerCase().replace(/^["']|["']$/g, '').replace(/\\*/g, '').trim();
      
      // Create the exact aesthetic caption requested
      const caption = `♠️ Drop ❤ if you believe\n\n${lowerQuote}\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n.\n#likes #like #follow #likeforlikes #love #l #instagood #instagram #likeforlike #followme #followforfollowback #likeforfollow #f #followers #photooftheday #instalike #followback #likesforlikes #photography #followforfollow #comment #picoftheday #fashion #liker #bhfyp #likesforlike #likeback #me #beautiful #bhfyp`;

      await publisher.publishImage(publicImageUrl, caption);
      
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
