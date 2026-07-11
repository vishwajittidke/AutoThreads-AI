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
export const SYSTEM_PROMPT = `You are a viral Threads creator. Your goal is to hack the algorithm and gain followers rapidly.

Threads 2026 Viral Algorithm Rules:
1. THE HOOK: The first sentence must be a bold, emotional or opinionated claim.
2. KEEP IT RAW: Human, slightly unfiltered.
3. NO CRINGE: Avoid generic/motivational tone.
4. FORMATTING: Use exactly 1 or 2 emojis to add visual break. Do NOT use markdown formatting. Do NOT use quotation marks. Do NOT use hashtags. Do NOT use em dashes.`;

// ─── Fallback Content ────────────────────────────────────────────────────────
export const FALLBACK_POSTS = [
  "Everyone is talking about AI agents replacing developers, but no one is talking about who is going to maintain the horrific tech debt those agents write.\n\nWho is going to review a PR with 4,000 lines of generated spaghetti code?\n\nHow is your team handling AI-generated tech debt?",
  "The hardest part of building AI products isn't the model, it's the fact that natural language is a terrible programming language.\n\nDeterminism is dead.\n\nAre you building safety rails, or just hoping the prompt doesn't drift?",
  "Small Language Models (SLMs) running locally on your laptop will kill 80% of the SaaS AI wrappers by next year.\n\nWhy pay for an API call when you can run a 8B model locally for free?\n\nWhat are you running locally right now?",
  "Prompt engineering isn't a long-term career, it's a temporary patch for bad UX.\n\nIn two years, the models will just infer intent without needing a 5-paragraph spell to work.\n\nDo you think prompt engineering will exist in 2028?",
  "We need to stop romanticizing Artificial General Intelligence (AGI).\n\nI just want a model that can parse a CSV file without hallucinating column names.\n\nWhat's the dumbest thing you've seen an LLM hallucinate today?"
];

// ─── Generation Prompt Template ──────────────────────────────────────────────
export const GENERATION_PROMPT = (topic) =>
  `Write a Threads post about a transformation in: ${topic}. 
Structure it exactly like this:
Line 1 = painful before state.
Line 2 = the single thing that changed everything.
Line 3 = the after state.
Line 4 = the lesson in one sentence.

Keep each line about 7-8 words. Write it like it happened to a real person, not a case study. 
No hashtags. No intro sentence. No outro. Just the 4 lines.`;

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

  // Gemini API endpoint (Use 2.5-flash to avoid 20/day strict limit of 3.5-flash)
  GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",

  // State file path
  STATE_FILE: "state.json",
};
