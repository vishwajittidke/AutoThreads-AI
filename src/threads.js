/**
 * AutoThreads-AI: Asynchronous Meta Threads Publishing Engine
 * Handles container creation, deterministic polling, and final publication.
 */

import { CONSTANTS } from "./config.js";

/**
 * Creates a media container on Meta Threads with the given text content.
 * (Phase 4 - Staging Phase)
 *
 * @param {string} userId - Threads user ID
 * @param {string} accessToken - Meta access token
 * @param {string} text - The sanitized post content
 * @returns {Promise<string>} The container creation ID
 */
async function createContainer(userId, accessToken, text) {
  const url = `${CONSTANTS.META_BASE_URL}/${userId}/threads`;

  const params = new URLSearchParams({
    media_type: "TEXT",
    text: text,
    access_token: accessToken,
  });

  const response = await fetchWithRetry(`${url}?${params.toString()}`, {
    method: "POST",
  });

  const data = await response.json();

  if (!data.id) {
    throw new Error(`Container creation failed. Response: ${JSON.stringify(data)}`);
  }

  console.log(`   📦 Container created: ${data.id}`);
  return data.id;
}

/**
 * Polls the container status until it reaches FINISHED state.
 * (Phase 4 - Deterministic Polling Loop)
 *
 * Implements a precise validation loop:
 * - Sleeps for 5 seconds between checks
 * - Checks container processing status
 * - Times out after 6 attempts (30 seconds total)
 *
 * @param {string} containerId - The container ID to poll
 * @param {string} accessToken - Meta access token
 * @returns {Promise<void>} Resolves when container is FINISHED
 */
async function pollContainerStatus(containerId, accessToken) {
  const url = `${CONSTANTS.META_BASE_URL}/${containerId}`;
  const params = new URLSearchParams({
    fields: "status",
    access_token: accessToken,
  });

  for (let attempt = 1; attempt <= CONSTANTS.MAX_POLL_ATTEMPTS; attempt++) {
    console.log(`   ⏳ Polling container status (${attempt}/${CONSTANTS.MAX_POLL_ATTEMPTS})...`);

    await sleep(CONSTANTS.POLL_INTERVAL_MS);

    try {
      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      console.log(`   📡 Container status: ${data.status || "UNKNOWN"}`);

      if (data.status === "FINISHED") {
        console.log(`   ✅ Container processing complete.`);
        return;
      }

      if (data.status === "ERROR") {
        throw new Error(`Container processing failed with ERROR status. Details: ${JSON.stringify(data)}`);
      }

      // IN_PROGRESS or other states - continue polling
    } catch (error) {
      if (error.message.includes("Container processing failed")) {
        throw error;
      }
      console.error(`   ❌ Polling error on attempt ${attempt}: ${error.message}`);
    }
  }

  throw new Error(
    `Container polling timed out after ${CONSTANTS.MAX_POLL_ATTEMPTS} attempts ` +
    `(${(CONSTANTS.MAX_POLL_ATTEMPTS * CONSTANTS.POLL_INTERVAL_MS) / 1000}s). ` +
    `Terminating to preserve free runner minutes.`
  );
}

/**
 * Publishes a validated container to the user's Threads profile.
 * (Phase 4 - Finalization Phase)
 *
 * @param {string} userId - Threads user ID
 * @param {string} accessToken - Meta access token
 * @param {string} containerId - The validated container ID
 * @returns {Promise<string>} The published post ID
 */
async function publishContainer(userId, accessToken, containerId) {
  const url = `${CONSTANTS.META_BASE_URL}/${userId}/threads_publish`;

  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const response = await fetchWithRetry(`${url}?${params.toString()}`, {
    method: "POST",
  });

  const data = await response.json();

  if (!data.id) {
    throw new Error(`Publish failed. Response: ${JSON.stringify(data)}`);
  }

  return data.id;
}

/**
 * Full Threads publishing pipeline:
 * 1. Create media container
 * 2. Poll until processing completes
 * 3. Publish to live profile
 *
 * @param {string} userId - Threads user ID
 * @param {string} accessToken - Meta access token
 * @param {string} text - Sanitized post content
 * @returns {Promise<{ postId: string, containerId: string }>}
 */
export async function publishToThreads(userId, accessToken, text) {
  console.log(`\n🚀 [Threads] Starting publication pipeline...`);
  console.log(`   📝 Content preview: "${text.slice(0, 80)}..." (${text.length} chars)`);

  // Stage 1: Create container
  console.log(`\n   ── Stage 1: Container Creation ──`);
  const containerId = await createContainer(userId, accessToken, text);

  // Stage 2: Poll for completion
  console.log(`\n   ── Stage 2: Processing Verification ──`);
  await pollContainerStatus(containerId, accessToken);

  // Stage 3: Publish live
  console.log(`\n   ── Stage 3: Live Publication ──`);
  const postId = await publishContainer(userId, accessToken, containerId);
  console.log(`   🎉 Post published successfully! Post ID: ${postId}`);

  return { postId, containerId };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch wrapper with retry logic for Meta API calls.
 * Retries with exponential backoff on transient failures.
 */
async function fetchWithRetry(url, options) {
  let lastError;
  const delays = [0, ...CONSTANTS.RETRY_DELAYS_MS];

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      console.log(`   ⏳ Retrying Meta API in ${delays[i] / 1000}s...`);
      await sleep(delays[i]);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorBody = await response.text();
        const status = response.status;

        // Fatal errors: don't retry
        if (status === 400 || status === 401 || status === 403) {
          throw new Error(`Meta API fatal error (${status}): ${errorBody}`);
        }

        lastError = new Error(`Meta API error (${status}): ${errorBody}`);
        console.error(`   ❌ Meta API returned ${status} on attempt ${i + 1}`);
        continue;
      }

      return response;
    } catch (error) {
      if (error.message.includes("fatal")) {
        throw error;
      }
      lastError = error;
      console.error(`   ❌ Meta API request failed on attempt ${i + 1}: ${error.message}`);
    }
  }

  throw lastError || new Error("All Meta API attempts exhausted.");
}
