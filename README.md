# sidekick-platform

Stateless gateway layer for Sidekick. Owns web-facing concerns like auth, billing, webhooks, OAuth flows, and integration syncs. Delegates all retrieval, memory, and reasoning operations to the Python intelligence service.

---

## Overview

This service is the entry point for all external requests to Sidekick. It handles everything _except_ intelligence—retrieval, memory, reasoning, and LLM orchestration live in the separate Python service (`sidekick-core`).

**This service owns:**

- Authentication and session management
- Billing and subscription logic
- Third-party integrations (Notion, Google, Slack, etc.)
- OAuth flows and token management
- Webhook ingestion and processing
- API routing and request validation

**This service does NOT own:**

- Embedding or vector search
- Memory storage or retrieval
- LLM calls or reasoning chains
- Semantic processing of any kind

---

## Snake Mini-Game

- Start the server: `pnpm install` then `pnpm run dev` (listens on port 8090 by default).
- Visit `http://localhost:8090/snake` to play the classic Snake loop (keyboard or on-screen controls).
- Game logic is deterministic and covered by `node --test src/snake/logic.test.js`.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Validation:** Zod

---
