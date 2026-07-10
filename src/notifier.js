/**
 * AutoThreads-AI: Webhook Notification Engine
 * Dispatches alerts for token expiration warnings, errors, and system events.
 */

import { CONSTANTS } from "./config.js";

/**
 * Sends a notification payload to the configured webhook URL.
 * Supports Discord, Telegram, and Slack webhook formats.
 *
 * @param {string} webhookUrl - The webhook endpoint URL
 * @param {string} title - Alert title
 * @param {string} message - Alert message body
 * @param {"info"|"warning"|"error"} severity - Alert severity level
 * @returns {Promise<boolean>} True if notification was sent successfully
 */
export async function notify(webhookUrl, title, message, severity = "info") {
  if (!webhookUrl) {
    console.log(`⚠️  [Notifier] No webhook URL configured. Skipping notification: ${title}`);
    return false;
  }

  const emoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "🚨",
  }[severity] || "ℹ️";

  const timestamp = new Date().toISOString();

  // Build a payload compatible with Discord, Slack, and generic webhooks
  const payload = buildPayload(webhookUrl, emoji, title, message, timestamp, severity);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`❌ [Notifier] Webhook returned ${response.status}: ${await response.text()}`);
      return false;
    }

    console.log(`✅ [Notifier] Alert sent: "${title}" (${severity})`);
    return true;
  } catch (error) {
    console.error(`❌ [Notifier] Failed to send webhook: ${error.message}`);
    return false;
  }
}

/**
 * Sends a token expiration warning notification.
 *
 * @param {string} webhookUrl - The webhook endpoint URL
 * @param {number} tokenAgeDays - Current age of the token in days
 * @returns {Promise<boolean>}
 */
export async function notifyTokenExpiring(webhookUrl, tokenAgeDays) {
  const daysRemaining = CONSTANTS.TOKEN_LIFESPAN_DAYS - tokenAgeDays;
  return notify(
    webhookUrl,
    "🔑 Meta Token Expiration Warning",
    `Your Meta access token is ${tokenAgeDays} days old.\n` +
    `It will expire in approximately ${daysRemaining} days.\n\n` +
    `Action Required: Generate a new long-lived token from the Meta Developer Portal ` +
    `and update the META_ACCESS_TOKEN secret in your GitHub repository settings.`,
    "warning"
  );
}

/**
 * Sends an error notification for critical failures.
 *
 * @param {string} webhookUrl - The webhook endpoint URL
 * @param {string} errorMessage - Description of the error
 * @param {string} [phase] - The phase where the error occurred
 * @returns {Promise<boolean>}
 */
export async function notifyError(webhookUrl, errorMessage, phase = "Unknown") {
  return notify(
    webhookUrl,
    `AutoThreads-AI Failure: Phase ${phase}`,
    `The daily posting workflow encountered a critical error.\n\n` +
    `Phase: ${phase}\nError: ${errorMessage}\n\n` +
    `The error has been logged to state.json. Check the GitHub Actions run for details.`,
    "error"
  );
}

/**
 * Sends a success notification after a post is published.
 *
 * @param {string} webhookUrl - The webhook endpoint URL
 * @param {string} postPreview - A preview of the posted content
 * @returns {Promise<boolean>}
 */
export async function notifySuccess(webhookUrl, postPreview) {
  const preview = postPreview.length > 120 ? postPreview.slice(0, 120) + "..." : postPreview;
  return notify(
    webhookUrl,
    "✅ AutoThreads-AI Post Published",
    `A new post was successfully published to Threads.\n\nPreview: "${preview}"`,
    "info"
  );
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Builds a webhook payload compatible with Discord, Slack, or generic webhook.
 */
function buildPayload(webhookUrl, emoji, title, message, timestamp, severity) {
  const lowerUrl = webhookUrl.toLowerCase();

  // Discord webhook format
  if (lowerUrl.includes("discord.com/api/webhooks") || lowerUrl.includes("discordapp.com/api/webhooks")) {
    const colorMap = { info: 3447003, warning: 16776960, error: 15158332 };
    return {
      embeds: [{
        title: `${emoji} ${title}`,
        description: message,
        color: colorMap[severity] || 3447003,
        timestamp,
        footer: { text: "AutoThreads-AI v3.0" },
      }],
    };
  }

  // Slack webhook format
  if (lowerUrl.includes("hooks.slack.com")) {
    return {
      text: `${emoji} *${title}*\n${message}`,
    };
  }

  // Telegram Bot API format
  if (lowerUrl.includes("api.telegram.org")) {
    return {
      text: `${emoji} <b>${title}</b>\n\n${message}`,
      parse_mode: "HTML",
    };
  }

  // Generic webhook payload
  return {
    title: `${emoji} ${title}`,
    message,
    severity,
    timestamp,
    source: "AutoThreads-AI v3.0",
  };
}
