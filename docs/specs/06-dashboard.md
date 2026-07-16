# Spec 06 — Dashboard & Contract History

**Feature:** US-008  
**Route:** `/dashboard`  
**Tables:** `contracts` (read)  
**Depends on:** Spec 01 (auth), at least one contract processed (Spec 03)

---

## User Flow

```
1. After login or sign-up → redirect to /dashboard

2. Dashboard fetches:
   SELECT id, file_name, contract_type, status, page_count, created_at
   FROM contracts
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC

3. Stats bar renders:
   - Total contracts reviewed
   - NDA count (contracts WHERE contract_type = 'nda')
   - MSA count (contracts WHERE contract_type = 'msa')

4. Contract list renders:
   - Sortable table: file_name | type | date | status
   - Default sort: newest first (created_at DESC)
   - User can toggle sort by column headers

5. Click any row → navigate to /contracts/[id]

6. Empty state (0 contracts):
   - Illustration + "No contracts reviewed yet"
   - "Review a Contract" button → /upload
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/(protected)/dashboard/page.jsx` | Dashboard page (server component) |
| `components/dashboard/StatCard.jsx` | Individual stat display |
| `components/dashboard/ContractTable.jsx` | Sortable contract list |
| `components/dashboard/EmptyState.jsx` | Empty state illustration + CTA |

---

## Page: `app/(protected)/dashboard/page.jsx`

```
Server Component — fetches contracts via Supabase server client.

Data fetching:
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, file_name, contract_type, status, page_count, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

Derived stats:
  total = contracts.length
  ndaCount = contracts.filter(c => c.contract_type === 'nda').length
  msaCount = contracts.filter(c => c.contract_type === 'msa').length

Renders:
  <Nav />
  <main style={{ padding: '40px 112px', backgroundColor: '#FAFAFA', minHeight: '100vh' }}>
    <h1 style={{ fontSize: 30, fontWeight: 600 }}>Dashboard</h1>

    {/* Stats Row */}
    <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
      <StatCard label="Total Contracts" value={total} />
      <StatCard label="NDAs" value={ndaCount} />
      <StatCard label="MSAs" value={msaCount} />
    </div>

    {/* Contracts List */}
    <div style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 500 }}>Your Contracts</h2>
        <Link href="/upload" className="btn-primary">Review a Contract</Link>
      </div>
      {contracts.length === 0
        ? <EmptyState />
        : <ContractTable contracts={contracts} />
      }
    </div>
  </main>
```

---

## Component: `components/dashboard/StatCard.jsx`

```
Props:
  label: string
  value: number

Renders:
┌──────────────────┐
│  42              │  ← value: 36px Bold, grey-900
│  Total Contracts │  ← label: 12px Regular, grey-500
└──────────────────┘

Styling:
  bg-white, border 1px solid grey-100, border-radius 8px
  padding: 24px
  min-width: 160px
  flex: 1 (equal width, max 3 per row)
```

---

## Component: `components/dashboard/ContractTable.jsx`

```
'use client'

Props:
  contracts: Contract[]

State:
  sortKey: 'file_name' | 'contract_type' | 'created_at' | 'status' (default: 'created_at')
  sortDir: 'asc' | 'desc' (default: 'desc')

Sort logic:
  const sorted = [...contracts].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    const dir = sortDir === 'asc' ? 1 : -1
    return aVal < bVal ? -dir : aVal > bVal ? dir : 0
  })

Table columns:
  Contract Name  ← file_name, sortable
  Type           ← contract_type badge (NDA / MSA), sortable
  Date Uploaded  ← created_at, formatted "Jul 14, 2026", sortable
  Status         ← status badge, sortable

Sortable column header:
  Shows ▲/▼ arrow when that column is active sort
  Clicking same column toggles direction

Row click:
  router.push(`/contracts/${contract.id}`)
  Entire row is clickable (role="button", tabIndex=0, onKeyDown handles Enter)

Row hover: bg-grey-25

Status badge colours:
  pending    → grey-500 bg-grey-50 border-grey-200   "Pending"
  processing → yellow-800 bg-yellow-50 border-yellow-200  "Processing"
  completed  → green-700 bg-green-50 border-green-200  "Completed"
  error      → red-700 bg-red-50 border-red-200  "Error"

Badge style: border-radius 4px, padding 2px 8px, font-size 12px, font-weight 500

Table styling:
  width: 100%, border-collapse: collapse
  th: text-align left, font-size 12px, color grey-500, font-weight 500, border-bottom 1px solid grey-100, padding 8px 16px
  td: font-size 16px, color grey-900, padding 12px 16px, border-bottom 1px solid grey-50
  Responsive: on < 768px, hide "Date Uploaded" column
```

---

## Component: `components/dashboard/EmptyState.jsx`

```
Renders:
  Centered within the table area
  Icon: file-text (Lucide, 48px, grey-200)
  Heading: "No contracts reviewed yet" (24px, grey-900, font-weight 500)
  Subtext: "Upload your first contract to get started." (16px, grey-500)
  Button: "Review a Contract" (btn-primary) → /upload

Styling:
  padding: 64px 0
  display: flex, flex-direction: column, align-items: center, gap: 16px
```

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Contract status is `'processing'` in list | Show "Processing" badge; row still clickable → results page shows processing state |
| Contract status is `'error'` | Show "Error" badge with red styling; row clickable → results page shows retry option |
| Very long file names (> 40 chars) | Truncate with ellipsis: `text-overflow: ellipsis; overflow: hidden; max-width: 240px` |
| Dashboard loads slowly | Show skeleton rows (5 rows × 4 columns of Skeleton components) |
| > 100 contracts (unlikely at MVP but possible) | No pagination at MVP — all load; performance acceptable up to ~200 rows |
| User deletes all contracts | Empty state re-renders (no contracts after deletion) |

---

## Acceptance Criteria

- [ ] Dashboard shows correct total, NDA, and MSA counts
- [ ] Contract list is sorted newest-first by default
- [ ] Each column header is clickable to sort ascending/descending
- [ ] Clicking any row navigates to `/contracts/[id]`
- [ ] Status badges use correct colour: grey/yellow/green/red
- [ ] Empty state shown when user has no contracts, with "Review a Contract" CTA
- [ ] Loading skeletons shown while data is fetching
- [ ] "Review a Contract" button in header always visible, regardless of contract count
