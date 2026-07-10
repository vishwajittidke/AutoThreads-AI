/**
 * AutoThreads-AI: Self-Writing State Persistence Engine
 * Handles state tracking, idempotency locks, token monitoring, and keep-alive logic.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { CONSTANTS } from "./config.js";

// ─── Default State Schema ────────────────────────────────────────────────────
const DEFAULT_STATE = {
  last_post_date: null,
  last_post_id: null,
  last_topic: null,
  last_content_preview: null,
  total_posts: 0,
  last_error: null,
  last_error_date: null,
  token_created_at: null,
  last_manual_commit: null,
  keep_alive_counter: 0,
  history: [],
};

/**
 * Reads the state tracking file. Creates it with defaults if it doesn't exist.
 *
 * @returns {object} The current state object
 */
export function readState() {
  try {
    if (!existsSync(CONSTANTS.STATE_FILE)) {
      console.log("   📄 state.json not found. Initializing with defaults...");
      writeState(DEFAULT_STATE);
      return { ...DEFAULT_STATE };
    }

    const raw = readFileSync(CONSTANTS.STATE_FILE, "utf-8");
    const state = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...state };
  } catch (error) {
    console.error(`   ❌ Failed to read state.json: ${error.message}`);
    return { ...DEFAULT_STATE };
  }
}

/**
 * Writes the state object to the tracking file.
 *
 * @param {object} state - The state object to persist
 */
export function writeState(state) {
  writeFileSync(CONSTANTS.STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

/**
 * Checks if a post has already been published today (idempotency lock).
 *
 * @param {object} state - The current state object
 * @returns {boolean} True if today's post already exists
 */
export function hasPostedToday(state) {
  const today = getDateString();
  return state.last_post_date === today;
}

/**
 * Updates state after a successful post.
 *
 * @param {object} state - The current state object
 * @param {object} postData - Data about the published post
 * @param {string} postData.postId - The Meta post ID
 * @param {string} postData.topic - The topic used
 * @param {string} postData.content - The published content
 * @returns {object} Updated state object
 */
export function recordSuccessfulPost(state, { postId, topic, content }) {
  const now = new Date().toISOString();
  const today = getDateString();

  state.last_post_date = today;
  state.last_post_id = postId;
  state.last_topic = topic;
  state.last_content_preview = content.slice(0, 100);
  state.total_posts = (state.total_posts || 0) + 1;
  state.last_error = null;
  state.last_error_date = null;

  // Append to history (keep last 30 entries)
  state.history = state.history || [];
  state.history.unshift({
    date: today,
    postId,
    topic,
    contentPreview: content.slice(0, 80),
    timestamp: now,
  });
  state.history = state.history.slice(0, 30);

  return state;
}

/**
 * Records an error in the state file.
 *
 * @param {object} state - The current state object
 * @param {string} errorMessage - The error message
 * @param {string} phase - The phase where the error occurred
 * @returns {object} Updated state object
 */
export function recordError(state, errorMessage, phase) {
  state.last_error = `[${phase}] ${errorMessage}`;
  state.last_error_date = new Date().toISOString();
  return state;
}

/**
 * Calculates the age of the Meta access token in days.
 * Returns -1 if token_created_at is not set.
 *
 * @param {object} state - The current state object
 * @returns {number} Token age in days, or -1 if unknown
 */
export function getTokenAgeDays(state) {
  if (!state.token_created_at) {
    return -1;
  }

  const created = new Date(state.token_created_at);
  const now = new Date();
  const diffMs = now - created;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if the token is approaching expiration.
 *
 * @param {object} state - The current state object
 * @returns {{ expiring: boolean, ageDays: number }}
 */
export function checkTokenHealth(state) {
  const ageDays = getTokenAgeDays(state);

  if (ageDays === -1) {
    console.log("   ⚠️  Token creation date not set in state.json. Cannot track expiration.");
    return { expiring: false, ageDays: -1 };
  }

  console.log(`   🔑 Token age: ${ageDays} days / ${CONSTANTS.TOKEN_LIFESPAN_DAYS} days`);

  if (ageDays >= CONSTANTS.TOKEN_WARNING_THRESHOLD_DAYS) {
    console.log(`   🚨 Token expiration warning! ${CONSTANTS.TOKEN_LIFESPAN_DAYS - ageDays} days remaining.`);
    return { expiring: true, ageDays };
  }

  return { expiring: false, ageDays };
}

/**
 * Checks if a keep-alive commit is needed to prevent GitHub from
 * disabling the scheduled workflow after 60 days of inactivity.
 *
 * @param {object} state - The current state object
 * @returns {boolean} True if keep-alive action is needed
 */
export function needsKeepAlive(state) {
  if (!state.last_manual_commit) {
    return false;
  }

  const lastCommit = new Date(state.last_manual_commit);
  const now = new Date();
  const daysSinceCommit = Math.floor((now - lastCommit) / (1000 * 60 * 60 * 24));

  console.log(`   🕐 Days since last manual commit: ${daysSinceCommit}`);

  if (daysSinceCommit >= CONSTANTS.KEEP_ALIVE_THRESHOLD_DAYS) {
    console.log(`   🔄 Keep-alive threshold reached (${CONSTANTS.KEEP_ALIVE_THRESHOLD_DAYS} days).`);
    return true;
  }

  return false;
}

/**
 * Performs the keep-alive state update.
 *
 * @param {object} state - The current state object
 * @returns {object} Updated state object
 */
export function performKeepAlive(state) {
  state.keep_alive_counter = (state.keep_alive_counter || 0) + 1;
  state._keep_alive_timestamp = new Date().toISOString();
  console.log(`   ✅ Keep-alive counter incremented to ${state.keep_alive_counter}`);
  return state;
}

/**
 * Commits and pushes the updated state.json back to the repository.
 * This is the self-writing persistence mechanism.
 *
 * @param {string} commitMessage - The commit message
 */
export function commitAndPush(commitMessage) {
  try {
    console.log(`\n📤 [Git] Committing state changes...`);

    // Configure git user for automated commits
    execSync('git config user.name "AutoThreads-AI Bot"', { stdio: "pipe" });
    execSync('git config user.email "autothreads-bot@automated.dev"', { stdio: "pipe" });

    // Stage, commit, and push
    execSync(`git add ${CONSTANTS.STATE_FILE}`, { stdio: "pipe" });
    execSync(`git commit -m "${commitMessage}"`, { stdio: "pipe" });
    execSync("git push", { stdio: "pipe" });

    console.log(`   ✅ State committed and pushed: "${commitMessage}"`);
  } catch (error) {
    // If there's nothing to commit, that's fine
    if (error.message.includes("nothing to commit")) {
      console.log("   ℹ️  No state changes to commit.");
      return;
    }
    console.error(`   ❌ Git commit/push failed: ${error.message}`);
    throw error;
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Returns today's date as a YYYY-MM-DD string.
 */
function getDateString() {
  return new Date().toISOString().split("T")[0];
}
