---
name: engineering-planner
description: >
  Acts as a Senior Software Architect to transform a Product Requirements Document (PRD)
  into a complete, implementation-ready Engineering Specification Document. Use this skill
  whenever a user provides a PRD, product brief, feature request document, project description,
  or any requirements document and wants it turned into a technical engineering spec.
  Also trigger when the user says things like "write an engineering spec", "create a technical
  spec from this PRD", "turn this into an engineering document", "I need an engineering spec
  before we start building", "generate a spec from my requirements", or "what do we need to
  build this". Always use this skill before any implementation begins — the output is the
  foundation that an AI coding agent or developer will use to build the application without
  needing to re-read the PRD.
---

**Frontend:** Next.js (fixed — do not ask about frontend framework).

---

## Input

A PRD (Product Requirements Document) provided by the user — pasted text, a file path, or an uploaded document.

---

## Clarification

Before generating anything, use `AskUserQuestion` to resolve any of the following that are missing or ambiguous in the PRD:

| Topic | Example question |
|---|---|
| Authentication strategy | "Should users log in via email/password, OAuth, or SSO?" |
| Database technology | "Which database — PostgreSQL, MySQL, MongoDB, or other?" |
| Storage provider | "Is file storage needed? If so, S3, GCS, or other?" |
| LLM provider | "Which AI provider — Anthropic, OpenAI, or other?" |
| User roles | "What user roles exist and what can each role do?" |
| Third-party integrations | "Are any external services required (payments, email, etc.)?" |

Only proceed once all critical decisions are answered.

---

## Steps

1. **Analyze** the PRD — extract functional requirements, non-functional requirements, and gaps.
2. **Clarify** — use `AskUserQuestion` for anything missing (see table above).
3. **Generate** `docs/engineering/engineering-doc.md` (high-level architecture doc).
4. **Generate** `docs/engineering/implementation-specs.md` (per-feature implementation specs).

---

## Output 1: `docs/engineering/engineering-doc.md`

Write this file with these sections in order:

1. **Executive Summary** — project name, business goal, problem statement, target users, success criteria
2. **Product Scope** — in scope / out of scope / future enhancements
3. **User Personas** — user types, responsibilities, permissions, primary workflows
4. **User Flows** — every major journey (signup, login, dashboard, AI chat, file upload, search, payments, admin) using the format:
   ```
   User Action → Frontend Behavior → Backend Processing → Database Interaction → System Response
   ```
5. **Frontend Architecture** — Next.js stack (UI lib, state management, routing strategy), UX states (loading/empty/error/responsive/a11y), page and component hierarchy
6. **Backend Architecture** — stack, core systems (auth, authz, business logic, validation, middleware, error handling), service interaction diagram
7. **Database Design** — per table: purpose, columns + types, relationships, constraints, indexes
8. **AI Architecture** *(only if AI features exist)* — LLM provider, model, prompt strategy, context/memory, token limits, rate limiting, cost controls, fallback
9. **API Specification** — per endpoint: method, path, purpose, auth required, request schema, response schema, validation rules, error responses
10. **Feature Breakdown** — Phase 1 (MVP), Phase 2, Phase 3 — each with: feature description, acceptance criteria, dependencies
11. **Folder Structure** — production-ready directory layout with purpose annotations
12. **Naming Conventions** — files, folders, components, hooks, services, APIs, DB tables, env vars, config files — with examples
13. **Testing Strategy** — unit, integration, and E2E with recommended frameworks and coverage targets
14. **Specs to Implementation Mapping** — for each spec, list the corresponding implementation files and the full flow from spec to code

---

## Output 2: `docs/engineering/implementation-specs.md`

Write one spec block per feature. Every feature from the PRD gets its own block using the template below. Do not skip any feature. Do not use placeholder text — every field must contain real, concrete content derived from the PRD and the answers to clarification questions.

---

### Template (repeat for each feature)

```
---

## Feature: [Feature Name]

### Description
- What users are interacting with (a specific response, a session, a product, a dashboard widget, etc.)
- When this UI appears (after an event, always visible, on demand, on page load)
- What the feature consists of (form, table, modal, panel, inline component, etc.)
- Where data is stored and how it is linked to related records

---

### User Flow
Document every step:
- What event triggers this feature to appear or activate
- Where on screen it appears (floating, inline, modal, page)
- What the user can do (inputs, actions, selections)
- What happens on submit or completion (confirmation, redirect, update)
- How the user can cancel or dismiss
- What automatically closes or resets the feature (navigation, timeout, new action)

---

### Placement
- Position type (fixed, absolute, inline, full page)
- Location on screen (bottom-right, below content, centered, sidebar)
- Z-index if floating
- Dimensions (width, max-height if relevant)
- Card/container style (border radius, shadow, background, border)

---

### DB Schema
Document every table this feature reads from or writes to:

For each table:
- Table name and purpose
- Every column: name, type, nullable, default, constraints
- Primary key: type and generation method
- Foreign keys: which table/column they reference and ON DELETE behavior
- Any UNIQUE constraint or combined unique index
- Any CHECK constraints
- Whether cascade deletes apply when a parent record is removed

---

### DB Tasks
List every database operation that must be completed before this feature works:
- The exact SQL CREATE TABLE statement (with all constraints)
- Any indexes to create for query performance
- Any unique constraints
- Where to run these (Supabase SQL editor)

---

### DB Helper Functions
For each function needed:
- Function name
- Parameters it accepts (name and type)
- What it returns
- Which table(s) it queries or writes to
- Any conflict or duplicate check it performs before inserting

---

### API Routes
For each endpoint:
- Method and path
- Auth required: yes/no
- Every field in the request body (name, type, required)
- Success response (status code + body shape)
- Error responses (status code + message for each failure case)
- Any conflict handling (duplicate, not found, permission denied)

---

### State Management
- Which component owns the local state for this feature
- What state variables exist (name, type, initial value)
- When state is set and when it is cleared
- How the feature component is conditionally rendered
- What callbacks the parent passes down (onDismiss, onSuccess, etc.)

---

### Component
- Component name and file path
- Every prop it receives (name, type, required/optional)
- Behavior on successful submit (confirmation display, auto-dismiss, redirect)
- Submit button enabled vs. disabled states
- What the parent does NOT need to manage (keep encapsulated inside the component)

---

### Design
- Header content and layout
- Primary control appearance (button states, input style, active vs inactive)
- Confirmation or success message appearance
- Loading state appearance
- Empty state appearance

---

### Edge Cases
Cover every failure or unexpected state:
- User dismisses or navigates away without completing
- Duplicate submission for the same item
- Required field left empty
- Network error on submit
- Permission denied (user lacks access)
- Data not found (item was deleted)
- Any other state specific to this feature
```

---

## Requirements

- No vague statements — every field in every spec must be concrete and actionable
- Include Mermaid or ASCII diagrams in `engineering-doc.md` where architecture benefits from visual representation
- `implementation-specs.md` must be complete enough that a developer can build each feature by reading only its spec block — no need to re-read the PRD
- Both files are authoritative references; no implementation begins until both are approved

---

## Next Step

After both files are approved, run `/implementation-specs` to generate the Supabase SQL schema and `.env.example`.
