# Spec 07 — Inline Key Term Editing & Feedback

**Features:** US-009, US-010  
**Routes:** `PATCH /api/key-terms/[id]`, `POST /api/feedback`  
**Tables:** `key_terms` (update), `user_feedback` (insert)  
**Depends on:** Spec 04 (results page, key terms displayed)

---

## Part A — Inline Key Term Editing

### User Flow

```
1. User sees a term value in the KeyTermCard (e.g. "Laws of the State of New York")
2. User clicks the value text → inline input field replaces the text
   Input is pre-filled with the current value
3. User edits the value
4. User presses Enter OR clicks "Save" button
5. PATCH /api/key-terms/[id] { value: "New York State" }
6. On success:
   - Input replaced with updated text
   - "Edited" badge appears on the card
   - Original AI value is preserved in ai_value (server-side)
7. User presses Escape → cancel edit; original value restores (no API call)
```

---

### API: `PATCH /api/key-terms/[id]`

```typescript
Request: { "value": "New York State" }

Server steps:
1. Verify session → 401
2. Validate body:
   value: z.string().min(1, 'Value cannot be empty.').max(1000, 'Value too long.')
3. Fetch key term:
   SELECT id, value, ai_value, is_edited, user_id
   FROM key_terms WHERE id = :id
   If null → 404
   If key_term.user_id !== session.user.id → 403

4. If is_edited = false:
   // First edit — preserve original AI value
   UPDATE key_terms
   SET ai_value = value,     ← current value becomes ai_value
       value = :new_value,
       is_edited = true
   WHERE id = :id AND user_id = auth.uid()
5. If is_edited = true:
   // Subsequent edit — ai_value already preserved, just update value
   UPDATE key_terms
   SET value = :new_value
   WHERE id = :id AND user_id = auth.uid()

Response 200:
{
  "data": {
    "id": "uuid",
    "value": "New York State",
    "ai_value": "Laws of the State of New York",
    "is_edited": true
  },
  "error": null
}
```

**Error responses:**

| Status | Code | Message |
|---|---|---|
| 400 | `INVALID_VALUE` | "Value cannot be empty." |
| 400 | `VALUE_TOO_LONG` | "Value exceeds 1,000 character limit." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Key term does not belong to this user." |
| 404 | `NOT_FOUND` | "Key term not found." |

---

### `lib/validation/key-term.schema.ts`

```typescript
import { z } from 'zod'

export const keyTermPatchSchema = z.object({
  value: z
    .string()
    .min(1, 'Value cannot be empty.')
    .max(1000, 'Value exceeds 1,000 character limit.'),
})
```

---

### Inline Edit UX in `KeyTermCard.jsx`

```
State:
  isEditing: boolean
  editValue: string       ← local copy of value while editing
  isSaving: boolean
  saveError: string | null

Click on value text:
  setEditValue(term.value)
  setIsEditing(true)

Input field (when isEditing):
  <input
    type="text"
    value={editValue}
    onChange={e => setEditValue(e.target.value)}
    onKeyDown={e => {
      if (e.key === 'Enter') handleSave()
      if (e.key === 'Escape') handleCancel()
    }}
    autoFocus
    style={{
      width: '100%',
      padding: '4px 8px',
      border: '1px solid #115ACB',
      borderRadius: 4,
      fontSize: 16,
      color: '#070A0E',
    }}
  />

Alongside input:
  "Save" button (btn-primary, small) → handleSave()
  "Cancel" link → handleCancel()

handleSave():
  if editValue.trim() === term.value → handleCancel() (no change)
  setIsSaving(true)
  PATCH /api/key-terms/${term.id} { value: editValue.trim() }
  On success → onUpdate(term.id, response.value); setIsEditing(false)
  On error → setSaveError('Failed to save. Try again.'); setIsSaving(false)

handleCancel():
  setIsEditing(false)
  setEditValue(term.value)
  setSaveError(null)

Optimistic update:
  onUpdate() in parent (KeyTermsPanel) updates the local keyTerms array immediately.
  If API fails: parent reverts the local value.

"Edited" badge:
  Shows when term.is_edited === true
  bg-blue-50, border-blue-200, text-blue-700, border-radius 4px, padding 2px 8px, font-size 12px
  Label: "Edited"

Original AI value (tooltip on "Edited" badge):
  When hovering the "Edited" badge: show Tooltip with "Original: {term.ai_value}"
  This gives the user access to the original AI value without cluttering the card
```

---

## Part B — Feedback Widget

### User Flow

```
1. FeedbackWidget renders at the bottom of the KeyTermsPanel
   Shows: thumbs-up and thumbs-down buttons

2. User clicks 👍 or 👎
   → Selected button highlighted (blue-500 fill)
   → Comment textarea appears below
   → "Submit Feedback" button appears

3. User optionally types a comment

4. User clicks "Submit Feedback"
   POST /api/feedback { contract_id, rating, comment? }

5. On success:
   → Widget replaced with: "Thanks for your feedback! 🙏"
   → Text: 14px, grey-500

6. If user already submitted feedback for this contract:
   → Widget shows: "Feedback received" in grey-400 (no buttons)
```

---

### API: `POST /api/feedback`

```typescript
Request:
{
  "contract_id": "uuid",
  "rating":      "thumbs_up",
  "comment":     "Really helped me spot the auto-renewal clause!"  ← optional
}

Server steps:
1. Verify session → 401
2. Validate body:
   - contract_id: UUID
   - rating: z.enum(['thumbs_up', 'thumbs_down'])
   - comment: z.string().max(2000).optional()
3. Verify contract ownership:
   SELECT id FROM contracts WHERE id = contract_id AND user_id = auth.uid()
   If null → 403
4. Check if feedback already submitted:
   SELECT id FROM user_feedback WHERE contract_id = contract_id AND user_id = auth.uid()
   If exists → 409 ALREADY_SUBMITTED
5. INSERT INTO user_feedback (contract_id, user_id, rating, comment)

Response 201:
{ "data": { "feedback_id": "uuid" }, "error": null }
```

**Error responses:**

| Status | Code | Message |
|---|---|---|
| 400 | `INVALID_RATING` | "Rating must be 'thumbs_up' or 'thumbs_down'." |
| 401 | `UNAUTHORIZED` | "Authentication required." |
| 403 | `FORBIDDEN` | "Contract does not belong to this user." |
| 409 | `ALREADY_SUBMITTED` | "Feedback already submitted for this contract." |

---

### `lib/validation/feedback.schema.ts`

```typescript
import { z } from 'zod'

export const feedbackSchema = z.object({
  contract_id: z.string().uuid(),
  rating:      z.enum(['thumbs_up', 'thumbs_down']),
  comment:     z.string().max(2000).optional(),
})
```

---

### Component: `components/contracts/FeedbackWidget.jsx`

```
'use client'

Props:
  contractId: string
  existingFeedback: { rating: string } | null   ← from GET /api/contracts/[id] (add to response if already submitted)

State:
  selectedRating: 'thumbs_up' | 'thumbs_down' | null
  comment: string
  isSubmitted: boolean
  isSubmitting: boolean

Init:
  If existingFeedback → setIsSubmitted(true)

If isSubmitted:
  Renders: "Thanks for your feedback!" (grey-500, 14px, italic)

If !isSubmitted:
  Header: "Was this review helpful?"  (12px, grey-500)
  Buttons row:
    👍 button: ThumbsUp icon (Lucide, 20px)
    👎 button: ThumbsDown icon (Lucide, 20px)
    Active (selected): bg-blue-500, white icon
    Inactive: bg-transparent, grey-300 icon
    Hover: bg-grey-50

  If selectedRating selected → show:
    <textarea
      placeholder="Optional: share any additional thoughts..."
      value={comment}
      onChange={...}
      rows={3}
      style={{ width: '100%', border: '1px solid grey-100', borderRadius: 6, padding: 8, fontSize: 12, resize: 'vertical' }}
      maxLength={2000}
    />
    Character counter: "{comment.length} / 2000" (right-aligned, grey-400, 12px)
    "Submit Feedback" button (btn-primary, small) → handleSubmit()

handleSubmit():
  setIsSubmitting(true)
  POST /api/feedback { contract_id, rating: selectedRating, comment: comment || undefined }
  On success → setIsSubmitted(true)
  On 409 → setIsSubmitted(true)  ← treat as already submitted
  On error → show inline error "Couldn't submit. Try again."
```

---

## Edge Cases

### Inline Editing

| Scenario | Handling |
|---|---|
| User clears the value entirely and saves | `value.trim().length === 0` → show error "Value cannot be empty." before API call |
| User saves the same value without change | Detect `editValue.trim() === term.value` → handleCancel() silently |
| Rapid double-click on term | `isEditing` check prevents double-mount; autoFocus handles cursor |
| User is editing and clicks another term | Each KeyTermCard manages its own isEditing state independently |
| Concurrent edit (user has two tabs open) | Last write wins; no conflict resolution needed at MVP |

### Feedback

| Scenario | Handling |
|---|---|
| User submits feedback then revisits the page | GET /api/contracts/[id] returns existing feedback; widget shows "Feedback received" |
| Double submission (click twice quickly) | Button disabled while isSubmitting; server returns 409 on second hit |
| Comment with only whitespace | `comment.trim()` before send; if empty, send as undefined |

---

## Acceptance Criteria

### Inline Editing
- [ ] Clicking a term value opens an inline input pre-filled with the current value
- [ ] Pressing Enter saves; pressing Escape cancels
- [ ] Saved value appears immediately (optimistic update)
- [ ] "Edited" badge appears after first successful edit
- [ ] Hovering "Edited" badge shows original AI value in tooltip
- [ ] Empty value shows error and does not call the API
- [ ] Edit persists on page refresh (stored in DB)

### Feedback
- [ ] Thumbs up/down buttons appear on every results page
- [ ] Selecting a rating reveals the comment textarea
- [ ] Feedback submits successfully and replaces widget with "Thanks for your feedback!"
- [ ] Already-submitted state persists on page revisit
- [ ] Comment is optional; widget submits without it
- [ ] Comment over 2000 chars is rejected client-side (char counter + disabled submit)
