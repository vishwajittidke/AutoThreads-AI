/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              AutoThreads-AI v3.0 — Main Orchestrator            ║
 * ║  Zero-Cost Autonomous Content Publisher for Instagram Threads    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Execution Phases:
 *   Phase 1: Context & Bootstrap (read state, validate environment)
 *   Phase 2: Core Content Generation (Gemini API + topic rotation)
 *   Phase 3: Text Sanitization & Checking (regex + bounds)
 *   Phase 4: Asynchronous Publishing Engine (Meta Graph API)
 *   Phase 5: Self-Writing State Persistence (git commit cycle)
 */

import { generateContent } from "./gemini.js";
import { publishToThreads } from "./threads.js";
import {
  readState,
  writeState,
  hasPostedToday,
  recordSuccessfulPost,
  recordError,
  checkTokenHealth,
  needsKeepAlive,
  performKeepAlive,
  commitAndPush,
} from "./state.js";
import { notifyTokenExpiring, notifyError, notifySuccess } from "./notifier.js";

// ─── Environment Variable Extraction ─────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const THREADS_USER_ID = process.env.THREADS_USER_ID;
const NOTIFICATION_WEBHOOK = process.env.NOTIFICATION_WEBHOOK;

// ─── Main Execution ──────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              AutoThreads-AI v3.0 — Daily Run               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`   🕐 Execution started: ${new Date().toISOString()}\n`);

  // ═══ Phase 1: Context & Bootstrap ═══════════════════════════════════════
  console.log("═══ Phase 1: Context & Bootstrap ═══════════════════════════════");

  // Validate required environment variables
  const missingVars = [];
  if (!GEMINI_API_KEY) missingVars.push("GEMINI_API_KEY");
  if (!META_ACCESS_TOKEN) missingVars.push("META_ACCESS_TOKEN");
  if (!THREADS_USER_ID) missingVars.push("THREADS_USER_ID");

  if (missingVars.length > 0) {
    const errorMsg = `Missing required environment variables: ${missingVars.join(", ")}`;
    console.error(`   ❌ ${errorMsg}`);
    await notifyError(NOTIFICATION_WEBHOOK, errorMsg, "Bootstrap");
    process.exit(1);
  }

  console.log("   ✅ Environment variables validated.");

  // Read state tracking file
  const state = readState();
  console.log(`   📊 Total posts to date: ${state.total_posts || 0}`);
  console.log(`   📅 Last post date: ${state.last_post_date || "Never"}`);

  // Idempotency check: prevent duplicate daily posts
  if (hasPostedToday(state)) {
    console.log("\n   🛑 Idempotency lock: Post already published today. Exiting.");

    // Still check token health and keep-alive even if already posted
    await handleTokenAndKeepAlive(state);
    logExecutionTime(startTime);
    return;
  }

  // Token health check
  const tokenHealth = checkTokenHealth(state);
  if (tokenHealth.expiring) {
    console.log("   📢 Dispatching token expiration alert...");
    await notifyTokenExpiring(NOTIFICATION_WEBHOOK, tokenHealth.ageDays);
  }

  // ═══ Phase 2 & 3: Content Generation + Sanitization ════════════════════
  console.log("\n═══ Phase 2 & 3: Content Generation & Sanitization ═════════════");

  let contentResult;
  try {
    contentResult = await generateContent(GEMINI_API_KEY);
  } catch (error) {
    console.error(`\n   ❌ Content generation failed: ${error.message}`);
    recordError(state, error.message, "Content Generation");
    writeState(state);
    commitAndPush("chore(state): log content generation error");
    await notifyError(NOTIFICATION_WEBHOOK, error.message, "Content Generation");
    process.exit(1);
  }

  console.log(`\n   ✅ Content ready: "${contentResult.content.slice(0, 60)}..."`);
  console.log(`   📋 Topic: ${contentResult.topic}`);
  console.log(`   🔄 Generation attempts: ${contentResult.attempts}`);

  // ═══ Phase 4: Asynchronous Publishing Engine ═══════════════════════════
  console.log("\n═══ Phase 4: Asynchronous Publishing Engine ═════════════════════");

  let publishResult;
  try {
    publishResult = await publishToThreads(
      THREADS_USER_ID,
      META_ACCESS_TOKEN,
      contentResult.content
    );
  } catch (error) {
    console.error(`\n   ❌ Publishing failed: ${error.message}`);
    recordError(state, error.message, "Publishing");
    writeState(state);
    commitAndPush("chore(state): log publishing error");
    await notifyError(NOTIFICATION_WEBHOOK, error.message, "Publishing");
    process.exit(1);
  }

  // ═══ Phase 5: Self-Writing State Persistence ═══════════════════════════
  console.log("\n═══ Phase 5: Self-Writing State Persistence ═════════════════════");

  // Record successful post
  recordSuccessfulPost(state, {
    postId: publishResult.postId,
    topic: contentResult.topic,
    content: contentResult.content,
  });

  // Handle keep-alive logic
  if (needsKeepAlive(state)) {
    performKeepAlive(state);
  }

  // Persist state and commit
  writeState(state);
  commitAndPush(`chore(state): post ${state.total_posts} published [${contentResult.topic.slice(0, 40)}]`);

  // Send success notification
  await notifySuccess(NOTIFICATION_WEBHOOK, contentResult.content);

  // ═══ Execution Complete ════════════════════════════════════════════════
  logExecutionTime(startTime);

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║               ✅ Daily run completed successfully            ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Handles token health monitoring and keep-alive independently
 * (runs even when idempotency lock prevents posting).
 */
async function handleTokenAndKeepAlive(state) {
  const tokenHealth = checkTokenHealth(state);
  if (tokenHealth.expiring) {
    await notifyTokenExpiring(NOTIFICATION_WEBHOOK, tokenHealth.ageDays);
  }

  if (needsKeepAlive(state)) {
    performKeepAlive(state);
    writeState(state);
    commitAndPush("chore(state): keep-alive heartbeat");
  }
}

/**
 * Logs total execution time.
 */
function logExecutionTime(startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n   ⏱️  Total execution time: ${elapsed}s`);

  if (elapsed > 90) {
    console.warn(`   ⚠️  Execution exceeded 90s target (${elapsed}s). Review for optimization.`);
  }
}

// ─── Execute ─────────────────────────────────────────────────────────────────
main().catch((error) => {
  console.error(`\n💥 Unhandled fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
