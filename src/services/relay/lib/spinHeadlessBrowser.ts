# Sidekick-Relay

## Overview

This document outlines the end-to-end architecture of an AI-powered meeting bot that automatically joins scheduled Google Meet calls, records audio, generates transcripts, and processes them into actionable insights. This is the same general approach used by products like Fireflies.ai, Otter.ai, and similar meeting intelligence platforms.

---

## Architecture Flow

```
Calendar Sync (OAuth)
       ↓
Scheduler picks up meeting
       ↓
Spins up headless browser (Puppeteer/Playwright)
       ↓
Joins Google Meet → captures audio via WebRTC/tab audio
       ↓
Audio stream → ASR engine (real-time or batch)
       ↓
Raw transcript → LLM pipeline (summarization, action items)
       ↓
Store in DB + push to integrations
```

---

## Stage 1: Calendar Sync (OAuth)

### Purpose

Connect to the user's Google Calendar to detect upcoming meetings with Google Meet links.

### How It Works

- The user grants calendar access via Google OAuth 2.0 (`calendar.readonly` or `calendar.events.readonly` scope).
- The backend sets up a webhook listener using the Google Calendar Push Notifications API to receive real-time updates when events are created, updated, or deleted.
- Alternatively, the backend polls the Calendar API at regular intervals (e.g., every 5 minutes) to fetch upcoming events.
- Events containing a `conferenceData.entryPoints` field with a Google Meet URL are flagged for bot scheduling.

### Key Considerations

- OAuth refresh tokens must be stored securely and rotated as needed.
- Handle edge cases like recurring meetings, rescheduled events, and cancelled events.
- Multi-account support requires mapping each user's OAuth tokens to their meeting schedules.

---

## Stage 2: Scheduler Picks Up Meeting

### Purpose

Queue and schedule bot instances to join meetings at the correct time.

### How It Works

- A job scheduler (e.g., BullMQ with Redis, or a cron-based scheduler) picks up detected meetings and creates a scheduled job for each.
- The job is set to trigger 1–2 minutes before the meeting start time to allow for browser spin-up and join latency.
- The scheduler tracks job state: `pending → joining → recording → processing → complete`.

### Key Considerations

- Deduplicate jobs for the same meeting (e.g., if multiple users in the same org have the same event).
- Handle timezone normalization — all times should be stored and processed in UTC.
- Implement retry logic for failed joins (e.g., meeting hasn't started yet, waiting room is enabled).
- Scale-aware: the scheduler must manage concurrency limits based on available infrastructure.

---

## Stage 3: Spin Up Headless Browser

### Purpose

Launch a browser instance that will act as the meeting bot participant.

### How It Works

- A headless Chromium instance is spun up using Puppeteer or Playwright.
- The browser is configured with:
  - A pre-authenticated Google account (the bot account, e.g., `notetaker@yourdomain.com`).
  - Flags to allow audio capture: `--autoplay-policy=no-user-gesture-required`, `--use-fake-ui-for-media-stream`.
  - Virtual audio/video devices or PulseAudio sinks for capturing output audio on the server.
- Each meeting gets its own isolated browser context or container to prevent cross-session leakage.

### Infrastructure

- In production, each browser instance typically runs inside a Docker container orchestrated by Kubernetes.
- Resource allocation: ~1–2 vCPU and 1–2 GB RAM per instance.
- Containers are spun up on demand and torn down after the meeting ends.
- Cloud providers like AWS (ECS/EKS), GCP (GKE), or specialized platforms (Browserless.io) can be used.

### Key Considerations

- Chrome's memory consumption can spike, so set hard resource limits.
- Use a browser pool with warm instances to reduce cold-start latency.
- Handle Chromium crashes gracefully with restart logic.

---

## Stage 4: Join Google Meet & Capture Audio

### Purpose

Navigate the bot to the meeting URL, join as a participant, and capture the meeting audio.

### Joining the Meeting

- The headless browser navigates to the Google Meet URL.
- Puppeteer/Playwright automates the join flow:
  1. Dismiss any pre-join prompts (camera/mic permission dialogs).
  2. Mute the bot's microphone and turn off camera.
  3. Set the bot's display name (e.g., "Meeting Notetaker").
  4. Click the "Join now" / "Ask to join" button.
- If a waiting room is enabled, the bot waits until admitted by a host.

### Capturing Audio

There are multiple approaches to capture audio from the meeting:

**Approach A: Chrome Tab Audio Capture**
- Use Chrome's `chrome.tabCapture` or `navigator.mediaDevices.getDisplayMedia({ audio: true })` within the browser context.
- The captured `MediaStream` is fed into a `MediaRecorder` or streamed via WebSocket to the backend.

**Approach B: Virtual Audio Sink (Server-Side)**
- Configure PulseAudio on the Linux server to create a virtual audio sink.
- Route Chrome's audio output to this virtual sink.
- A separate process (e.g., FFmpeg or GStreamer) captures audio from the sink and writes it to a file or streams it to the transcription engine.

**Approach C: WebRTC Interception**
- Intercept the WebRTC peer connections that Google Meet creates.
- Extract audio tracks directly from the `RTCPeerConnection`.
- This provides the cleanest per-participant audio streams for better diarization.

### Audio Format

- Capture in a lossless or high-quality format: WAV (16-bit, 16kHz mono) or FLAC.
- For real-time streaming to ASR: use PCM or Opus-encoded WebSocket streams.

### Key Considerations

- Google Meet's UI changes frequently — selectors and DOM structure can break automation. Maintain a selector update pipeline.
- Handle network interruptions, participant limits, and meeting ejection gracefully.
- Detect meeting end (all participants leave, or host ends for all) to trigger the next stage.
- Comply with recording consent laws (the bot's visible name should indicate recording).

---

## Stage 5: ASR Engine (Transcription)

### Purpose

Convert captured audio into text with speaker attribution.

### Processing Modes

**Real-Time (Streaming)**
- Audio chunks are streamed to the ASR engine as the meeting progresses.
- Provides live captions or near-real-time transcription during the meeting.
- Lower accuracy; often used as a preliminary pass.
- Services: Deepgram (streaming API), Google Speech-to-Text (streaming), AssemblyAI (real-time).

**Batch (Post-Meeting)**
- The complete audio file is processed after the meeting ends.
- Significantly higher accuracy, especially for speaker diarization.
- This is the primary transcription pass whose output is stored and presented to users.
- Services: OpenAI Whisper, AssemblyAI, Deepgram, AWS Transcribe.

### Speaker Diarization

- Determines "who said what" by segmenting audio by speaker.
- ASR services like AssemblyAI and Deepgram provide diarization as a built-in feature.
- Speaker labels (Speaker 1, Speaker 2, etc.) can be mapped to participant names using:
  - Google Meet participant list (extracted from the DOM during the meeting).
  - Voice enrollment / speaker profiles (if the platform supports it).
  - LLM-based name inference from conversational context (e.g., "Thanks, Rahul" → maps Speaker 2 to Rahul).

### Output Format

```json
{
  "transcript": [
    {
      "speaker": "Speaker 1",
      "text": "Let's discuss the Q4 roadmap.",
      "start_time": 12.5,
      "end_time": 15.3,
      "confidence": 0.96
    },
    {
      "speaker": "Speaker 2",
      "text": "Sure, I have the updated timeline ready.",
      "start_time": 15.8,
      "end_time": 18.1,
      "confidence": 0.93
    }
  ]
}
```

---

## Stage 6: LLM Pipeline (Post-Processing)

### Purpose

Transform raw transcripts into structured, actionable outputs using large language models.

### Processing Steps

1. **Transcript Cleanup**: Fix ASR errors, normalize formatting, merge fragmented sentences.
2. **Summarization**: Generate a concise meeting summary covering key discussion points.
3. **Action Items Extraction**: Identify tasks, owners, and deadlines mentioned in the conversation.
4. **Key Topics & Decisions**: Tag major themes and decisions made during the meeting.
5. **Sentiment Analysis** (optional): Gauge the tone of the discussion (agreement, disagreement, urgency).
6. **Q&A Extraction** (optional): Identify questions asked and answers provided.

### Implementation

- Use an LLM API (GPT-4, Claude, or a fine-tuned open-source model) with structured prompts.
- For long meetings, chunk the transcript into segments that fit within the model's context window.
- Use a map-reduce pattern: summarize each chunk independently, then merge chunk summaries into a final summary.
- Define output schemas (JSON) so the LLM returns structured data that can be stored and queried.

### Example Prompt Structure

```
Given the following meeting transcript, extract:
1. A 3-5 sentence summary
2. Action items (task, owner, deadline if mentioned)
3. Key decisions made
4. Open questions or unresolved topics

Transcript:
{transcript_text}

Respond in JSON format.
```

---

## Stage 7: Storage & Integrations

### Purpose

Persist all meeting data and push insights to the user's tools.

### Database Storage (MongoDB)

```
meetings collection:
{
  _id: ObjectId,
  title: "Q4 Roadmap Review",
  meetLink: "https://meet.google.com/abc-defg-hij",
  scheduledAt: ISODate,
  startedAt: ISODate,
  endedAt: ISODate,
  duration: 3600,
  participants: ["Rahul", "Priya", "Amit"],
  audioFileUrl: "s3://bucket/meetings/abc123.wav",
  transcript: [...],
  summary: "...",
  actionItems: [...],
  keyDecisions: [...],
  status: "processed",
  userId: ObjectId,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### File Storage

- Raw audio and video files are uploaded to object storage (AWS S3, GCS, or MinIO).
- Files are retained based on the user's plan/policy and purged after the retention period.

### Integration Push

After processing is complete, results are pushed to connected integrations:

- **Slack**: Post meeting summary and action items to a designated channel.
- **Notion / Confluence**: Create a new page with the full transcript and summary.
- **CRM (Salesforce, HubSpot)**: Log meeting notes against the relevant deal or contact.
- **Email**: Send a recap email to all participants.
- **Webhooks**: Generic webhook support for custom integrations.
- **Project Management (Jira, Asana, Linear)**: Auto-create tasks from action items.

---

## Infrastructure & Scaling

### Container Orchestration

Each meeting bot runs as an isolated container. At scale:

- Use Kubernetes with Horizontal Pod Autoscaler (HPA) to scale based on the number of concurrent meetings.
- Pre-warm a pool of containers to reduce join latency during peak hours (e.g., top-of-the-hour meetings).
- Target: support thousands of concurrent meetings.

### Resource Estimates (Per Bot Instance)

| Resource | Allocation |
|----------|-----------|
| CPU | 1–2 vCPU |
| Memory | 1–2 GB RAM |
| Storage | 500 MB (temp audio buffer) |
| Network | ~500 Kbps (audio stream) |

### Monitoring & Observability

- Track bot join success rate, recording quality, transcription accuracy.
- Alert on failed joins, crashes, or audio capture failures.
- Log structured events at each pipeline stage for debugging.
- Dashboard metrics: active bots, meetings processed, average processing time, error rates.

---

## Tech Stack (Reference Implementation)

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js / TypeScript |
| Browser Automation | Puppeteer or Playwright |
| Job Scheduler | BullMQ (Redis-backed) |
| Audio Capture | PulseAudio + FFmpeg |
| ASR / Transcription | Deepgram, AssemblyAI, or Whisper |
| LLM Processing | GPT-4 / Claude API |
| Database | MongoDB |
| File Storage | AWS S3 |
| Container Orchestration | Kubernetes (EKS / GKE) |
| Integrations | Slack API, Notion API, Webhooks |

---

## Security & Compliance

- All audio and transcript data must be encrypted at rest (AES-256) and in transit (TLS 1.3).
- Bot accounts should use dedicated Google Workspace accounts with minimal permissions.
- Comply with recording consent laws: the bot's display name must clearly indicate recording is in progress.
- Implement data retention policies with automatic purging.
- SOC 2 and GDPR compliance if handling enterprise or international user data.
- Users must have the ability to delete their meeting data on demand.

---

## Limitations & Edge Cases

- **Waiting rooms**: The bot may need to wait indefinitely until admitted. Implement a timeout and notify the user.
- **CAPTCHA / bot detection**: Google may challenge suspicious logins. Use established accounts with consistent login patterns.
- **Breakout rooms**: Google Meet breakout rooms are not easily accessible via browser automation.
- **UI changes**: Google Meet updates its frontend frequently, which can break selectors and automation flows.
- **Large meetings**: Meetings with 50+ participants may have different audio mixing behavior, affecting diarization accuracy.
- **Network quality**: Poor server-side network can degrade audio capture quality.