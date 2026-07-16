# Spec 05 — Contract Chat (Q&A)

**Features:** US-007, US-012  
**Routes:** `POST /api/chat/sessions`, `POST /api/chat/message`, `GET /api/chat/[sessionId]/messages`  
**Tables:** `chat_sessions`, `chat_messages`  
**Depends on:** Spec 04 (results page exists, contract_id known), `OPENAI_API_KEY`

---

## User Flow

```
First visit to /contracts/[id] (chat panel):
  1. User clicks "Chat" tab (or chat panel mounts)
  2. POST /api/chat/sessions { contract_id }
     → If session exists → return existing session_id
     → If not → INSERT INTO chat_sessions → return new session_id
  3. GET /api/chat/[sessionId]/messages
     → Returns [] on first visit
  4. Chat interface renders with empty state: "Ask anything about this contract."

Conversation:
  5. User types message → clicks Send (or presses Enter)
  6. User message appended to UI immediately (optimistic)
  7. POST /api/chat/message { contract_id, session_id, content }
  8. AI response appended to UI
  9. [Page X] citation in AI response is a clickable link → scrolls PDF/text viewer

Returning visit:
  Same flow — step 3 returns full chat history, chat hydrates immediately.
```

---

## Files to Create

| File | Purpose |
|---|---|
| `components/chat/ChatInterface.jsx` | Full chat UI: history + input |
| `components/chat/MessageBubble.jsx` | Individual message (user or assistant) |
| `app/api/chat/sessions/route.ts` | POST /api/chat/sessions |
| `app/api/chat/message/route.ts` | POST /api/chat/message |
| `app/api/chat/[sessionId]/messages/route.ts` | GET messages |
| `lib/ai/chat.ts` | Build messages array + call OpenAI |
| `lib/ai/classifier.ts` | Query type classification |
| `lib/ai/prompts/chat-system.ts` | Chat system prompt |
| `lib/validation/chat.schema.ts` | Zod: message request validation |

---

## API: `POST /api/chat/sessions`

```typescript
Request: { "contract_id": "uuid" }

1. Verify session
2. Verify contract ownership
3. INSERT INTO chat_sessions (contract_id, user_id)
   ON CONFLICT (contract_id) DO NOTHING
4. SELECT id FROM chat_sessions WHERE contract_id = contract_id AND user_id = auth.uid()

Response 200:
{ "data": { "session_id": "uuid" }, "error": null }
```

---

## API: `GET /api/chat/[sessionId]/messages`

```typescript
1. Verify session
2. Verify ownership: chat_sessions WHERE id = sessionId AND user_id = auth.uid()
3. SELECT * FROM chat_messages
   WHERE session_id = sessionId AND user_id = auth.uid()
   ORDER BY created_at ASC

Response 200:
{
  "data": {
    "messages": [
      { "id": "uuid", "role": "user",      "content": "...", "created_at": "..." },
      { "id": "uuid", "role": "assistant", "content": "...", "created_at": "..." }
    ]
  },
  "error": null
}
```

---

## API: `POST /api/chat/message`

```typescript
Request:
{
  "contract_id": "uuid",
  "session_id":  "uuid",
  "content":     "What happens if I breach the NDA?"
}
```

**Server steps:**
```typescript
1. Verify session → 401

2. Validate body:
   - contract_id: UUID
   - session_id: UUID
   - content: string, non-empty, max 4000 chars
   If validation fails → 400

3. Check rate limit: 60 chat messages/user/hour
   If exceeded → 429 RATE_LIMIT_EXCEEDED

4. Sanitise content — strip prompt injection patterns:
   content = sanitiseChatInput(content)
   (see sanitisation rules below)
   If content empty after sanitise → 400 INJECTION_DETECTED

5. Verify contract ownership:
   SELECT contract_text FROM contracts WHERE id = contract_id AND user_id = auth.uid()
   If null → 403

6. Verify session ownership:
   SELECT id FROM chat_sessions WHERE id = session_id AND contract_id = contract_id AND user_id = auth.uid()
   If null → 403

7. Fetch history (up to MAX_CHAT_HISTORY = 200 messages, ascending):
   SELECT role, content FROM chat_messages
   WHERE session_id = session_id AND user_id = auth.uid()
   ORDER BY created_at ASC
   LIMIT 200

8. Classify query type:
   const queryType = classifyQuery(content)
   // 'contract' | 'history' | 'both' — inline classification, no OpenAI call

9. Build OpenAI messages:
   const messages = buildChatMessages({
     contractText: contract.contract_text,
     history,
     newUserMessage: content,
   })

10. Call OpenAI GPT-4o (temp 0.4, max 1000 tokens):
    const response = await callChat(messages)

11. INSERT user message:
    INSERT INTO chat_messages (session_id, user_id, role='user', content=content)

12. INSERT assistant response:
    INSERT INTO chat_messages (session_id, user_id, role='assistant', content=response)

13. Return 200:
{
  "data": {
    "message_id": "uuid",
    "content": "Based on the document, breach of confidentiality obligations... [Page 3]",
    "created_at": "2026-07-14T10:05:00Z"
  },
  "error": null
}
```

**Error responses:**

| Status | Code | Message |
|---|---|---|
| 400 | `INVALID_MESSAGE` | "Message cannot be empty." |
| 400 | `MESSAGE_TOO_LONG` | "Message exceeds 4,000 character limit." |
| 400 | `INJECTION_DETECTED` | "Invalid message content." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Session or contract does not belong to this user." |
| 429 | `RATE_LIMIT_EXCEEDED` | "Too many chat messages. Please wait a moment." |
| 504 | `CHAT_TIMEOUT` | "Response timed out. Please try again." |

---

## `lib/ai/chat.ts`

```typescript
import OpenAI from 'openai'
import { getChatSystemPrompt } from './prompts/chat-system'
import { OPENAI_CHAT_TEMP, OPENAI_CHAT_MAX_TOKENS } from '@/lib/constants'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function buildChatMessages(params: {
  contractText: string
  history: ChatMessage[]
  newUserMessage: string
}): OpenAI.ChatCompletionMessageParam[] {
  const { contractText, history, newUserMessage } = params

  return [
    {
      role: 'system',
      content: getChatSystemPrompt(contractText),
    },
    // Conversation history (up to 200 messages)
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
    // New user message
    { role: 'user', content: newUserMessage },
  ]
}

export async function callChat(
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<string> {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: OPENAI_CHAT_TEMP,
    max_tokens: OPENAI_CHAT_MAX_TOKENS,
    messages,
  })
  return response.choices[0]?.message?.content ?? 'I was unable to generate a response. Please try again.'
}
```

---

## `lib/ai/prompts/chat-system.ts`

```typescript
export function getChatSystemPrompt(contractText: string): string {
  return `You are a contract analysis assistant. Your role is to answer questions strictly based on the document text provided below. You must not use any external legal knowledge or make assumptions beyond what is explicitly stated in the document.

RULES:
1. Answer ONLY from the document text below. Do not draw on general legal knowledge.
2. If the answer is not in the document, respond with exactly: "I cannot find this in the document."
3. Every response MUST end with a source citation in the format: [Page X] where X is the page number where the answer was found.
4. Begin every response with: "Based on the document, ..."
5. If multiple pages are relevant, cite the most specific one: [Page X]
6. Keep responses concise and in plain English — avoid legal jargon where possible.

CONTRACT DOCUMENT:
${contractText}`
}
```

---

## `lib/ai/classifier.ts`

```typescript
type QueryType = 'contract' | 'history' | 'both'

const HISTORY_PATTERNS = [
  /what did you (say|mention|tell me) (earlier|before|previously)/i,
  /earlier you (said|mentioned|told me)/i,
  /you (said|mentioned|told me) that/i,
  /in your (previous|last|earlier) (response|answer|message)/i,
  /can you (repeat|summarise|summarize) what you said/i,
]

export function classifyQuery(message: string): QueryType {
  const isHistory = HISTORY_PATTERNS.some(pattern => pattern.test(message))
  if (isHistory) {
    // Check if also asking about the contract
    const contractKeywords = /contract|agreement|clause|term|section|page|document/i
    return contractKeywords.test(message) ? 'both' : 'history'
  }
  return 'contract'
}
```

Classification is informational only at MVP — `buildChatMessages` always includes full history regardless. Used for future analytics.

---

## Input Sanitisation

```typescript
// In route.ts, before processing
export function sanitiseChatInput(content: string): string {
  return content
    .replace(/#{3,}/g, '')           // Strip ### (system prompt injection)
    .replace(/<\|/g, '')             // Strip <| (OpenAI special tokens)
    .replace(/\|>/g, '')             // Strip |>
    .replace(/\[INST\]/gi, '')       // Strip Llama-style markers
    .replace(/<<SYS>>/gi, '')        // Strip Llama-style system markers
    .trim()
}
```

If the sanitised string is empty after stripping → return 400 INJECTION_DETECTED.

---

## `lib/validation/chat.schema.ts`

```typescript
import { z } from 'zod'

export const chatMessageSchema = z.object({
  contract_id: z.string().uuid(),
  session_id:  z.string().uuid(),
  content:     z.string().min(1, 'Message cannot be empty.').max(4000, 'Message exceeds 4,000 character limit.'),
})
```

---

## Component: `components/chat/ChatInterface.jsx`

```
'use client'

Props:
  contractId: string
  initialSessionId: string | null
  onPageClick: (page: number) => void

State:
  sessionId: string | null
  messages: Message[]
  inputValue: string
  isLoading: boolean
  error: string | null

On mount:
  1. If no initialSessionId → POST /api/chat/sessions { contract_id } → setSessionId
  2. GET /api/chat/[sessionId]/messages → setMessages

On send:
  1. Trim inputValue; ignore if empty
  2. Append user message to messages optimistically
  3. Clear inputValue, setIsLoading(true)
  4. POST /api/chat/message { contract_id, session_id, content }
  5. On success → append AI response to messages
  6. On error → show error banner; remove optimistic user message

Auto-scroll:
  useEffect on messages → messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

Empty state (no messages):
  Icon + "Ask anything about this contract." + 3 suggested questions:
    "What are the key obligations of each party?"
    "What happens if either party breaches this agreement?"
    "What are the termination conditions?"
  Clicking a suggestion → fills inputValue

Layout:
┌─────────────────────────────────┐
│  "Chat with this contract"      │ ← header
├─────────────────────────────────┤
│  Messages (scrollable)          │
│  MessageBubble × N              │
│  <div ref={messagesEndRef} />   │
├─────────────────────────────────┤
│  [Input]          [Send button] │
└─────────────────────────────────┘

aria-live="polite" on messages container for screen readers
Input: Enter key to send; Shift+Enter for newline
Send button: disabled while isLoading or inputValue.trim() empty
```

---

## Component: `components/chat/MessageBubble.jsx`

```
Props:
  role: 'user' | 'assistant'
  content: string
  onPageClick: (page: number) => void

User bubble:
  Right-aligned
  bg: blue-500 (#115ACB)
  color: white
  border-radius: 12px 12px 0 12px
  padding: 10px 14px
  max-width: 80%

Assistant bubble:
  Left-aligned
  bg: white, border: 1px solid grey-100
  color: grey-900
  border-radius: 12px 12px 12px 0
  padding: 10px 14px
  max-width: 85%

[Page X] citation rendering:
  Regex: /\[Page (\d+)\]/gi
  Replace with: <button onClick={() => onPageClick(N)}>Page {N}</button>
  Button style: color blue-500, text-decoration underline, cursor pointer, no border
  Renders inline within the text

"I cannot find this in the document." response:
  Style differently: italic, grey-400 text (no page citation expected)
  Do not call onPageClick

Timestamp: show as tooltip on hover (relative: "just now", "2 minutes ago")
           format: HH:MM for messages older than 1 hour
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| AI response missing `[Page X]` citation | UI appends "Source: unknown" in grey-400 at end of message |
| "I cannot find this in the document." | Display as-is, no page link appended |
| 200-message history limit reached | Oldest messages still stored in DB; only the latest 200 are sent to OpenAI. Full history loads in UI |
| User sends empty message | Button disabled; Enter key no-ops if input is empty |
| User sends very long message (> 4000 chars) | Client: disable send and show char counter in red; server: 400 if bypassed |
| OpenAI timeout (> 30s) | 504 returned; show error toast: "Response timed out. Please try again." Do not save the failed messages |
| Session_id mismatch (tampered) | Server checks contract_id + session_id + user_id triple → 403 |
| Prompt injection attempt | sanitiseChatInput() strips patterns; if empty after → 400 INJECTION_DETECTED |
| Page number in citation out of range | onPageClick still fires; PDFViewer silently ignores invalid page |
| Network error mid-stream | Show retry banner; optimistic user message removed |

---

## Acceptance Criteria

- [ ] Chat tab creates or retrieves session on first open
- [ ] First visit: empty state with suggested questions
- [ ] Returning visit: full previous conversation loads from DB
- [ ] Each AI response begins with "Based on the document, ..."
- [ ] Each AI response ends with `[Page X]` citation (or "Source: unknown" if missing)
- [ ] `[Page X]` citations are clickable and scroll the PDF/text viewer
- [ ] "I cannot find this in the document." is returned for questions not in the document
- [ ] Chat responds within 15 seconds P95
- [ ] Rate limit of 60 messages/user/hour enforced
- [ ] Prompt injection patterns are stripped before sending to OpenAI
- [ ] Messages persist and reload on page revisit
- [ ] Enter key sends message; Shift+Enter creates a new line
