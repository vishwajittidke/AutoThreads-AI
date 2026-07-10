# AutoThreads-AI v3.0

> **Zero-Cost Autonomous AI Content Publisher for Instagram Threads**

A fully serverless, self-sustaining content pipeline that generates and publishes daily AI/tech insights to Instagram Threads — completely free, running on GitHub Actions + Google Gemini Free Tier.

---

## 🏗️ Architecture

```
[ GitHub Actions Daily Cron (06:30 UTC) ]
                  │
                  ▼
    [ Phase 1: Bootstrap & State Load ]
    ├─ Validate environment secrets
    ├─ Read state.json (idempotency lock)
    └─ Check token health
                  │
                  ▼
    [ Phase 2: Gemini Content Generation ]
    ├─ Day-of-year modulo topic rotation
    └─ Generate post via Gemini 2.0 Flash
                  │
                  ▼
    [ Phase 3: Sanitization & Validation ]
    ├─ Strip markdown (14 regex rules)
    └─ Enforce <500 char limit
                  │
                  ▼
    [ Phase 4: Threads Publishing ]
    ├─ Create media container (Meta API)
    ├─ Poll status (5s × 6 attempts)
    └─ Publish to live profile
                  │
                  ▼
    [ Phase 5: State Persistence ]
    ├─ Update state.json
    ├─ Token expiration monitoring
    ├─ Keep-alive heartbeat
    └─ Git commit & push
```

---

## 🚀 Setup Guide

### Prerequisites

1. A **GitHub repository** (public or private)
2. A **Google Gemini API key** ([Get one free](https://aistudio.google.com/apikey))
3. A **Meta Threads account** with API access
4. A **Meta long-lived access token** ([Meta Developer Portal](https://developers.facebook.com/))
5. *(Optional)* A webhook URL (Discord/Slack/Telegram) for alerts

### Step 1: Clone & Push

```bash
git clone <your-repo-url>
cd <your-repo>
# Copy all project files into the repo
git add .
git commit -m "feat: initialize AutoThreads-AI v3.0"
git push origin main
```

### Step 2: Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:

| Secret Name | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key | ✅ Yes |
| `META_ACCESS_TOKEN` | Meta Graph API long-lived token (60-day lifespan) | ✅ Yes |
| `THREADS_USER_ID` | Your Threads account user ID | ✅ Yes |
| `NOTIFICATION_WEBHOOK` | Discord/Slack/Telegram webhook URL for alerts | ❌ Optional |

### Step 3: Set Token Creation Date

Edit `state.json` and set the `token_created_at` field to when you generated your Meta token:

```json
{
  "token_created_at": "2026-07-10T00:00:00.000Z",
  "last_manual_commit": "2026-07-10T00:00:00.000Z"
}
```

### Step 4: Test Run

Trigger the workflow manually:
1. Go to **Actions** tab in your repository
2. Select **"AutoThreads-AI: Daily Post"**
3. Click **"Run workflow"**

---

## 🔐 Security

- All secrets are stored in **GitHub Encrypted Secrets** (never in code)
- GitHub Actions are **pinned to SHA hashes** (not mutable tags)
- The workflow has minimal `contents: write` permission only

---

## ⚠️ Token Renewal

Meta's long-lived access tokens expire after **60 days**. The system will:

1. **Warn at 50 days**: Send webhook alert with renewal instructions
2. **You must manually**:
   - Generate a new token from Meta Developer Portal
   - Update the `META_ACCESS_TOKEN` secret in GitHub
   - Update `token_created_at` in `state.json`

---

## 📁 Project Structure

```
├── .github/workflows/
│   └── post-to-threads.yml    # GitHub Actions workflow
├── src/
│   ├── index.js               # Main orchestrator (5 phases)
│   ├── config.js              # Topics, prompts, constants
│   ├── gemini.js              # Gemini API content engine
│   ├── sanitizer.js           # Markdown stripping & validation
│   ├── threads.js             # Meta Threads publishing engine
│   ├── state.js               # Git-backed state persistence
│   └── notifier.js            # Webhook notification engine
├── state.json                 # Self-updating tracking file
├── package.json               # Project metadata
└── README.md                  # This file
```

---

## 📊 State Tracking

The system maintains a `state.json` file that is automatically committed back to the repository after each run:

- **Idempotency lock**: Prevents duplicate posts on the same day
- **Post history**: Rolling 30-entry log of published content
- **Token monitoring**: Tracks Meta token age for expiration alerts
- **Keep-alive counter**: Prevents GitHub from disabling the workflow

---

## 🛡️ Fault Tolerance

- **API retries**: Exponential backoff (10s → 30s) for transient failures
- **Fatal error detection**: Immediately exits on auth/permission errors
- **Error logging**: Failures are recorded in `state.json` and sent via webhook
- **Execution budget**: Entire pipeline completes within 90 seconds
- **Container polling timeout**: Max 30 seconds to prevent runner minute waste

---

## License

MIT
