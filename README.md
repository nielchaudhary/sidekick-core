# sidekick-core

API gateway and web-facing service for the Sidekick reasoning partner platform, handling chat streaming, waitlist management, authentication scaffolding, and third-party integration orchestration.

---

# Overview

sidekick-core is the primary entry point for all external requests to the Sidekick platform. It provides a stateless Node.js/Express API layer that routes LLM-powered chat requests to Anthropic Claude or OpenAI, manages a pre-launch waitlist, and defines the data models for user accounts, subscriptions, and third-party integrations (Notion, Google, Slack).

The service handles all web-facing concerns — request validation, rate limiting, streaming responses, caching, and database writes — while keeping intelligence logic encapsulated in the provider layer. It is designed to be horizontally scalable with stateless request handling and an external Redis cache via Upstash.

---

# Architecture / How It Works

- **Entry point:** `src/app.ts` initializes MongoDB and Redis, registers Express middleware, mounts routers, and starts the HTTP server
- **Config layer** (`src/config/`): Infrastructure singletons — database, cache, logger, rate limiter, environment variables, and error handling
- **Providers layer** (`src/providers/`): LLM-specific streaming implementations for Anthropic (Claude) and OpenAI (GPT)
- **Services layer** (`src/services/`): Route handlers grouped by domain — chat, waitlist, auth types
- **Prompts layer** (`src/prompts/`): System prompt definition for Sidekick's reasoning persona
- **Request flow:**
  1. Request hits Express router
  2. Middleware applies rate limiting
  3. Handler validates input with Zod
  4. Business logic runs (DB read/write, cache lookup, LLM call)
  5. Response is returned — either JSON or an SSE stream

---

# Key Components

## SidekickPlatformError (`src/config/exceptions.ts`)

Centralized error class with automatic classification, severity mapping, and HTTP status resolution.

**Responsibilities**

- Categorizes errors into: NETWORK, DATABASE, CACHE, VALIDATION, AUTHENTICATION, AUTHORIZATION, EXTERNAL_SERVICE, INTERNAL, UNKNOWN
- Maps categories to HTTP status codes and severity levels
- Hides stack traces in production
- Detects retryability

**Factory Methods**

- `SidekickPlatformError.network(msg)` — network-level failures
- `SidekickPlatformError.database(msg)` — MongoDB errors
- `SidekickPlatformError.validation(msg)` — schema/input errors
- `SidekickPlatformError.authentication(msg)` — auth failures
- `SidekickPlatformError.internal(msg)` — unclassified server errors

---

## DB (`src/config/database.ts`)

MongoDB singleton with typed collection access.

**Responsibilities**

- Initializes a TLS-enabled MongoDB Atlas connection on startup
- Exposes typed collections: `users`, `waitlist`
- Provides `getDBColl<T>(name)` for generic collection access

**Important Methods**

- `initDB()` — connects to Atlas, called once at startup
- `DB.collections.users` — typed `Collection<ISidekickUser>`
- `DB.collections.waitlist` — typed `Collection<IWaitlistDetails>`

---

## Cache (`src/config/redis.ts`)

Stateless Upstash Redis client with typed key patterns.

**Responsibilities**

- Provides get/set/del/expire/incr and hash/list operations over the Upstash REST API
- Defines namespaced cache key helpers

**Cache Key Patterns**

- `CacheKeys.userSession(userId)` → `session:${userId}`
- `CacheKeys.userRateLimit(userId)` → `ratelimit:${userId}`
- `CacheKeys.integrationToken(userId, provider)` → `integration:${userId}:${provider}`
- `CacheKeys.syncLock(userId, provider)` → `synclock:${userId}:${provider}`
- `CacheKeys.queryCache(hash)` → `query:${hash}`

---

## Anthropic Provider (`src/providers/anthropic.ts`)

Claude streaming handler with web search tool support.

**Responsibilities**

- Streams responses from `claude-sonnet-4-5-20250929` via SSE
- Enables the built-in web search tool (max 1 use per request)
- Applies ephemeral cache control to system prompts
- Emits `web_search_active` status events when web search activates

**Important Methods**

- `streamAnthropicResponse(prompt, systemPrompt, handlers)` — initiates a streaming chat request

---

## OpenAI Provider (`src/providers/openai.ts`)

GPT streaming handler using the Responses API.

**Responsibilities**

- Streams responses from `gpt-5` via the OpenAI Responses API
- Supports optional system prompt injection

**Important Methods**

- `streamOpenAIResponse(prompt, systemPrompt, handlers)` — initiates a streaming chat request

---

## streamTextPostHandler (`src/services/chat/api/streamTextPostHandler.ts`)

Main chat endpoint handler. Selects provider based on query parameter and writes an SSE stream to the response.

**Responsibilities**

- Validates `llmProvider` query param and `prompt` body field
- Routes to Anthropic or OpenAI provider
- Streams chunks as `data: {"text":"..."}` events
- Emits status events (e.g., web search activation)
- Closes stream with `data: [DONE]`

---

## addUserToWaitlistPostHandler (`src/services/waitlist/api/addUserToWaitlistPostHandler.ts`)

Waitlist signup handler with duplicate prevention.

**Responsibilities**

- Validates email and occupation with Zod
- Checks for existing email in MongoDB before inserting
- Inserts new record with UUID and timestamp
- Returns 200 on success or duplicate

---

## Ratelimiter (`src/config/ratelimiter.ts`)

In-memory token bucket rate limiter.

**Responsibilities**

- Capacity: 60 tokens, refill rate: 60 tokens/second
- Exposes `allowRequest()` boolean check
- Applied globally via Express middleware (returns 429 on limit exceeded)

---

## SidekickCoreLogger (`src/config/logger.ts`)

Context-scoped debug logger.

**Responsibilities**

- Wraps the `debug` library with INFO / ERROR / DEBUG levels
- Format: `sidekick-core::{context}::[LEVEL]`
- One logger instance per module context

---

# API / Interface

### `POST /v1/chat`

Streams an LLM response as Server-Sent Events.

**Query Parameters**

- `llmProvider` (`'openai' | 'claude'`): Required. Selects the LLM backend.

**Request Body**

- `prompt` (string): Required. The user message.
- `systemPrompt` (string, optional): Custom system prompt to prepend.

**Response** — `text/event-stream`

```
data: {"text":"token chunk"}

data: {"type":"status","status":"web_search_active"}

data: [DONE]
```

---

### `POST /waitlist/add`

Adds a user to the pre-launch waitlist.

**Request Body**

- `email` (string): Valid email address.
- `occupation` (string): One of the `Occupation` enum values.

**Response**

- `200` — `{ message: "success" }` on new signup
- `200` — `{ message: "already signed up" }` on duplicate email
- `400` — Zod validation error details

---

### `GET /health`

Returns server health status.

**Response**

```json
{ "status": "ok", "timestamp": "..." }
```

---

# Configuration

**Environment Variables**

| Variable              | Required | Description                        |
| --------------------- | -------- | ---------------------------------- |
| `mongoURI`            | Yes      | MongoDB Atlas connection string    |
| `UPSTASH_REDIS_URL`   | Yes      | Upstash Redis REST endpoint        |
| `UPSTASH_REDIS_TOKEN` | Yes      | Upstash Redis authentication token |
| `ANTHROPIC_API_KEY`   | Yes      | Anthropic Claude API key           |
| `OPENAI_API_KEY`      | Yes      | OpenAI API key                     |
| `GROQ_API_KEY`        | Yes      | Groq API key (audio transcription) |
| `MEM0_API_KEY`        | Yes      | Mem0 memory service API key        |
| `SARVAM_API_KEY`      | No       | Sarvam AI provider key             |
| `PORT`                | No       | HTTP listen port (default: `8090`) |

The service validates `mongoURI` at startup and throws a `SidekickPlatformError.validation` if it is missing.

---

# Example Flow

**Chat request (Claude with web search):**

1. Client sends `POST /v1/chat?llmProvider=claude` with `{ "prompt": "..." }`
2. Rate limiter checks token bucket; returns 429 if exhausted
3. Handler validates body with Zod
4. `streamAnthropicResponse()` opens a streaming request to Anthropic API
5. If web search tool activates, a `web_search_active` status event is emitted via SSE
6. Text chunks are forwarded as `data: {"text":"..."}` events
7. Stream closes with `data: [DONE]`

**Waitlist signup:**

1. Client sends `POST /waitlist/add` with `{ "email": "...", "occupation": "..." }`
2. Handler validates schema with Zod
3. MongoDB `waitlist` collection is queried for existing email
4. If found: return `already signed up`
5. If not found: insert document with UUID and timestamp, return `success`

---

# Development

**Install dependencies**

```bash
pnpm install
```

**Start development server** (hot reload, port 8090)

```bash
pnpm run dev
```

**Type check**

```bash
pnpm run typecheck
```

**Full build pipeline** (format → lint → circular deps → typecheck)

```bash
pnpm run build
```

**Required services**

- MongoDB Atlas instance (connection string in `mongoURI`)
- Upstash Redis account (`UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN`)
- At least one LLM API key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`)

---

# Notes

- **Streaming:** Chat responses use SSE (`text/event-stream`). Clients must handle `data: [DONE]` as the stream termination signal.
- **Rate limiting:** The current token bucket is in-process (not distributed). For multi-instance deployments, replace with a Redis-backed rate limiter using the existing `CacheKeys.userRateLimit` pattern.
- **Error handling:** All errors are wrapped in `SidekickPlatformError` before logging. Stack traces are suppressed in production. Clients receive generic error SSE events, not raw error details.
- **LLM model references:** The OpenAI provider references `gpt-5`. The Anthropic provider uses `claude-sonnet-4-5-20250929`.
- **Incomplete features:** The `src/integrations/` and `src/services/transcription/` directories are scaffolded but empty. Auth service types (`src/services/auth/types.ts`) define the full user/subscription/integration model but no endpoints are implemented yet.
- **Logging:** Enable debug output with `DEBUG=sidekick-core*` in the environment.
- **Graceful shutdown:** The server handles `SIGINT`, `SIGTERM`, and `uncaughtException` — closing DB and cache connections before exit.
