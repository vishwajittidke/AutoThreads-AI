/**
 * AutoThreads-AI: Asynchronous Meta Threads Publishing Engine
 * Handles container creation, deterministic polling, and final publication.
 */

import axios from "axios";
import { CONSTANTS } from "./config.js";
import { execSync } from "child_process";

/**
 * Creates a media container on Meta Threads with the given text content.
 * (Phase 4 - Staging Phase)
 *
 * @param {string} userId - Threads user ID
 * @param {string} accessToken - Meta access token
 * @param {string} text - The sanitized post content
 * @returns {Promise<string>} The container creation ID
 */
async function createContainer(userId, accessToken, text, replyToId = null) {
  const url = `${CONSTANTS.META_BASE_URL}/me/threads`;

  const params = new URLSearchParams({
    media_type: "TEXT",
    text: text,
    access_token: accessToken,
  });

  if (replyToId) {
    params.append("reply_to_id", replyToId);
  }

  const response = await fetchWithRetry(url, {
    method: "POST",
    body: params,
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
  const url = `${CONSTANTS.META_BASE_URL}/me/threads_publish`;

  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const response = await fetchWithRetry(url, {
    method: "POST",
    body: params,
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
export async function publishToThreads(userId, accessToken, text, replyToId = null) {
  console.log(`\n🚀 [Threads] Starting publication pipeline...`);
  console.log(`   📝 Content preview: "${text.slice(0, 80)}..." (${text.length} chars)`);
  if (replyToId) console.log(`   ↪️ Replying to comment ID: ${replyToId}`);

  // Stage 1: Create container
  console.log(`\n   ── Stage 1: Container Creation ──`);
  const containerId = await createContainer(userId, accessToken, text, replyToId);

  // Stage 2: Poll for completion
  console.log(`\n   ── Stage 2: Processing Verification ──`);
  await pollContainerStatus(containerId, accessToken);

  // Stage 3: Publish live
  console.log(`\n   ── Stage 3: Live Publication ──`);
  const postId = await publishContainer(userId, accessToken, containerId);
  console.log(`   🎉 Post published successfully! Post ID: ${postId}`);

  return { postId, containerId };
}

/**
 * Fetches the most recent threads published by the user.
 */
export async function fetchRecentThreads(userId, accessToken, limit = 5) {
  const url = `${CONSTANTS.META_BASE_URL}/me/threads`;
  const params = new URLSearchParams({
    fields: "id,text",
    limit: limit.toString(),
    access_token: accessToken,
  });

  const response = await fetchWithRetry(`${url}?${params.toString()}`, { method: "GET" });
  const data = await response.json();
  return data.data || [];
}

/**
 * Fetches replies to a specific thread post.
 */
export async function fetchReplies(mediaId, accessToken) {
  const url = `${CONSTANTS.META_BASE_URL}/${mediaId}/replies`;
  const params = new URLSearchParams({
    fields: "id,text,timestamp",
    access_token: accessToken,
  });

  const response = await fetchWithRetry(`${url}?${params.toString()}`, { method: "GET" });
  const data = await response.json();
  return data.data || [];
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrapper for API calls with automatic retry and exponential backoff
 */
async function fetchWithRetry(url, options = {}, retries = CONSTANTS.RETRY_DELAYS_MS.length + 1) {
  for (let i = 0; i < retries; i++) {
    // Implement random jitter
    if (i > 0) {
      const baseDelay = CONSTANTS.RETRY_DELAYS_MS[Math.min(i - 1, CONSTANTS.RETRY_DELAYS_MS.length - 1)];
      const jitter = Math.floor(Math.random() * 1000); // 0-1s jitter
      const delay = baseDelay + jitter;
      console.log(`   ⏳ Retrying Meta API in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }

    try {
      const safeUrl = url.replace(/access_token=[^&]+/, "access_token=***");
      let safeBody = "";
      if (options && options.body) {
        safeBody = options.body.toString().replace(/access_token=[^&]+/, "access_token=***");
      }
      console.log(`   🌐 Fetching: ${safeUrl} | Body: ${safeBody}`);
      
      let responseData;
      
      if (options.method === "POST") {
        // Use native curl to bypass any NodeJS/Axios HTTP client quirks
        console.log(`   🚀 Executing native cURL fallback...`);
        const curlCmd = `curl -s -X POST "https://graph.threads.net/v1.0/me/threads" -d "${options.body.toString()}"`;
        const stdout = execSync(curlCmd, { encoding: 'utf-8' });
        responseData = JSON.parse(stdout);
        
        if (responseData.error) {
          const err = new Error("Meta API error");
          err.response = { status: 500, data: responseData };
          throw err;
        }
      } else {
        const axiosOptions = {
          url: url,
          method: options.method || 'GET',
          headers: options.headers || {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          },
          data: options.body ? options.body.toString() : undefined
        };
        const response = await axios(axiosOptions);
        responseData = response.data;
      }

      return {
        ok: true,
        json: async () => responseData
      };
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        console.log(`   ❌ Meta API returned ${status} on attempt ${i + 1}`);
        if (status === 400 || status === 401 || status === 403) {
          throw new Error(`Meta API error (${status}): ${JSON.stringify(error.response.data)}`);
        }
      } else {
        console.log(`   ❌ Network/Timeout error on attempt ${i + 1}: ${error.message}`);
      }
      
      if (i === retries - 1) {
        if (error.response) {
          throw new Error(`Meta API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
        }
        throw error;
      }
    }
  }
}
