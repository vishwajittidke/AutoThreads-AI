/**
 * AutoThreads-AI Configuration
 * Central configuration for topic rotation, prompts, and system constants.
 */

// ─── Viral Tech/AI Topic Array ────────────────────────────────────────────────
// Shifted from academic topics to opinionated, conversation-starting themes.
export const TOPICS = [
  "Why most AI wrappers will fail in the next 12 months",
  "The uncomfortable truth about Prompt Engineering as a career",
  "Why junior developers shouldn't rely entirely on AI coding assistants",
  "The hidden infrastructure cost of Retrieval-Augmented Generation (RAG)",
  "Why Small Language Models (SLMs) will beat giant models in production",
  "The biggest misconception non-technical founders have about AI",
  "Why we need to stop romanticizing Artificial General Intelligence (AGI)",
  "The harsh reality of scaling AI products to thousands of users",
  "Why open-source AI is terrifying proprietary tech giants",
  "The most overrated AI trend right now",
  "Why vector databases aren't always the answer",
  "The exact reason why your AI agent keeps hallucinating",
  "Why tech debt is accelerating faster than ever with AI tools",
  "The quiet death of the 'traditional' software engineer role",
  "Why fine-tuning is rarely the first step you should take",
  "The real bottleneck in AI development isn't compute, it's data quality",
  "Why multi-agent AI systems are harder to build than you think",
  "The security nightmare of giving AI agents write-access",
  "Why UX is suddenly the most important part of AI development",
  "The truth about how much OpenAI/Anthropic APIs actually cost at scale",
  "Why 'prompt injection' is the biggest unsolved problem in AI",
  "Why everyone is pivoting to AI agents but no one has cracked it",
  "The one skill software engineers need in the age of generative AI",
  "Why local AI running on your laptop is the next big shift",
  "The unspoken challenge of testing and evaluating LLM outputs",
  "Why natural language is actually a terrible programming language",
];

// ─── Gemini System Prompt ────────────────────────────────────────────────────
export const SYSTEM_PROMPT = `You are a highly opinionated, world-class Tech/AI engineering lead writing for Instagram Threads. 
Your goal is to spark engagement, replies, and debate.

Threads 2026 Viral Algorithm Rules:
1. THE HOOK: The first sentence must be a bold, counter-intuitive, or highly opinionated hook. Stop the scroll.
2. THE MEAT: Deliver 1-2 specific, high-value technical insights based on real-world engineering reality (avoid generic "guru" advice).
3. THE ENGAGEMENT TRIGGER: You MUST end the post with a thought-provoking, open-ended question that forces people to reply, debate, or choose a side.

Formatting & Restrictions:
- The post MUST be under 450 characters. Keep it extremely tight.
- Write in a direct, assertive, and slightly conversational tone. 
- Use short, punchy sentences. Break lines for readability.
- Use exactly 1 or 2 emojis to add visual break, no more.
- Do NOT use markdown formatting (no **, #, \`, or > symbols).
- Do NOT use quotation marks.
- Do NOT use hashtags (they look spammy on Threads).
- Do NOT use engagement bait like "Like if you agree".`;

// ─── Generation Prompt Template ──────────────────────────────────────────────
export const GENERATION_PROMPT = (topic) =>
  `Write a highly engaging, controversial, or thought-provoking Threads post about: ${topic}. 
Remember: 
1. Strong bold hook.
2. Real technical insight. 
3. End with an engaging question to drive replies.
4. Under 450 chars.
5. No markdown, no hashtags, no quotes.`;

// ─── Emergency Reduction Prompt ──────────────────────────────────────────────
export const REDUCTION_PROMPT = (text) =>
  `This text is too long for Threads (max 500 characters). Rewrite it to be shorter, keeping the bold hook and the ending question. Keep it under 400 characters. No markdown, no hashtags, no quotes. Original text: "${text}"`;

// ─── System Constants ────────────────────────────────────────────────────────
export const CONSTANTS = {
  // Threads character limit
  MAX_POST_LENGTH: 500,
  // Safety threshold to trigger re-generation
  LENGTH_WARNING_THRESHOLD: 491,

  // Meta API polling configuration
  POLL_INTERVAL_MS: 5000,
  MAX_POLL_ATTEMPTS: 6,

  // Retry configuration for API failures
  RETRY_DELAYS_MS: [10_000, 30_000],

  // Token expiration tracking (in days)
  TOKEN_LIFESPAN_DAYS: 60,
  TOKEN_WARNING_THRESHOLD_DAYS: 50,

  // Keep-alive trigger threshold (in days)
  KEEP_ALIVE_THRESHOLD_DAYS: 45,

  // Meta API endpoints
  META_BASE_URL: "https://graph.threads.net/v1.0",

  // Gemini API endpoint
  GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",

  // State file path
  STATE_FILE: "state.json",
};
