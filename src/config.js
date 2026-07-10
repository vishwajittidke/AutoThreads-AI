/**
 * AutoThreads-AI Configuration
 * Central configuration for topic rotation, prompts, and system constants.
 */

// ─── Technology Topic Array ──────────────────────────────────────────────────
// Used for algorithmic topic rotation via day-of-year modulo indexing.
export const TOPICS = [
  "Large Language Models and Transformer Architectures",
  "AI Agents and Autonomous Systems",
  "Retrieval-Augmented Generation (RAG)",
  "Edge AI and On-Device Machine Learning",
  "Computer Vision Breakthroughs",
  "Natural Language Processing Advances",
  "AI in Healthcare and Drug Discovery",
  "Generative AI for Code and Software Engineering",
  "Reinforcement Learning and Robotics",
  "AI Ethics, Bias, and Alignment Research",
  "Federated Learning and Privacy-Preserving AI",
  "Neural Architecture Search and AutoML",
  "AI-Powered Cybersecurity",
  "Quantum Computing and Quantum Machine Learning",
  "Multimodal AI and Vision-Language Models",
  "AI Infrastructure and MLOps",
  "Speech Recognition and Audio AI",
  "Diffusion Models and Image Generation",
  "Knowledge Graphs and Semantic AI",
  "AI in Climate Science and Sustainability",
  "Synthetic Data Generation",
  "AI Chip Design and Hardware Acceleration",
  "Autonomous Vehicles and Self-Driving AI",
  "AI in Finance and Algorithmic Trading",
  "Digital Twins and Simulation AI",
  "Brain-Computer Interfaces and Neurotech",
  "AI-Powered Search and Recommendation Systems",
  "Prompt Engineering and LLM Optimization",
  "Open-Source AI Models and Democratization",
  "AI Regulation and Global Governance Frameworks",
  "Small Language Models and Efficient AI",
  "AI in Education and Personalized Learning",
  "Zero-Shot and Few-Shot Learning",
  "AI for Scientific Discovery",
  "Embodied AI and Physical Intelligence",
  "AI Video Generation and Understanding",
  "Agentic Workflows and Tool-Using AI",
];

// ─── Gemini System Prompt ────────────────────────────────────────────────────
export const SYSTEM_PROMPT = `You are a world-class AI and technology thought leader writing for Instagram Threads.

Your mandate:
- Write a single punchy, high-density technical insight or value-bomb.
- The post MUST be under 480 characters (hard limit).
- Write in a direct, confident voice. No fluff. No filler.
- Use short, impactful sentences. Break lines for readability.
- Include 1-2 relevant emojis maximum, placed naturally.
- Do NOT use markdown formatting (no **, #, \`, or > symbols).
- Do NOT wrap the text in quotation marks.
- Do NOT include hashtags.
- Do NOT start with "Did you know" or similar clichés.
- Focus on delivering genuine technical insight that makes engineers stop scrolling.
- Be specific. Name real technologies, architectures, or research when possible.`;

// ─── Generation Prompt Template ──────────────────────────────────────────────
export const GENERATION_PROMPT = (topic) =>
  `Write a single Threads post about: ${topic}. Remember: under 480 characters, no markdown, no hashtags, no quotation marks. Pure technical value.`;

// ─── Emergency Reduction Prompt ──────────────────────────────────────────────
export const REDUCTION_PROMPT = (text) =>
  `This text is too long for Threads (max 500 characters). Rewrite it as a single punchy sentence or two that captures the core insight. Keep it under 400 characters. No markdown, no hashtags, no quotes. Original text: "${text}"`;

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
