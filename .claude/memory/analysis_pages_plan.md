---
name: Analysis Pages Implementation Plan
description: Full step-by-step plan for Cash Summary, ISBE Report, Reconciliation tabs — branch feature/analysis-pages
type: project
---

# Analysis Pages — Implementation Plan

Branch: `feature/analysis-pages` (create before starting)

---

## Step 0: Create feature branch + install xlsx

```bash
git checkout -b feature/analysis-pages
npm install xlsx
```

---

## Step 1: Fix budget parser (`src/lib/budget-parser.ts`)

**Problem:** Current parser reads wrong columns. ISBE Frizz Excel actual structure:
- Col A (0): status text — ignore
- Col B (1): account description — ignore (use col E instead)
- Col C (2): object description with code in parens e.g. "Salaries (100)"
- Col D (3): amount
- Col E (4): accountCode clean number e.g. "1000", "2110"
- Col F (5): objectCode clean number e.g. "100", "200"
- Col G (6): combined "1000-100" — ignore

**New `BudgetLine` type:**
```typescript
type BudgetLine = {
  accountCode: string   // col E
  objectCode: string    // col F
  description: string   // col C stripped of "(NNN)"
  amount: number        // col D
}
```

**Fix CSV parser:** read index 4 = accountCode, 5 = objectCode, 3 = amount, 2 = description (strip parens). Skip rows where col[4] is not numeric.

**Implement Excel parser** using `xlsx` package:
```typescript
import * as XLSX from "xlsx"
// wb = XLSX.read(buffer, { type: "buffer" })
// rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
// same column index logic as CSV
```

---

## Step 2: Fix FSG parser (`src/lib/fsg-parser.ts`)

**Problem:** Current extraction prompt asks for single "4-digit object code" like "1100". Reconciliation needs separate accountCode (function) and objectCode (expenditure type).

**New `FsgLine` type:**
```typescript
type FsgLine = {
  accountCode: string   // function/program code: "1000", "2110", "2540"
  objectCode: string    // expenditure type: "100", "200", "300", "400", "500", "600"
  description: string
  currentPeriod: number
  inceptionToDate: number
}
```

**Update EXTRACTION_PROMPT** to ask for both:
```
"accountCode": "4-digit function/program code (e.g. '1000', '2110', '2540')",
"objectCode": "3-digit expenditure type (100=Salaries, 200=Benefits, 300=Services, 400=Supplies, 500=Capital, 600=Other)",
```

Note: This is a breaking change. Existing FSG records with old `parsedData` format will need to be re-uploaded to show data in analysis tabs. Budget/FSG display tabs should handle both formats gracefully.

---

## Step 3: Add CashEntry model (`prisma/schema.prisma`)

Add to Contract model: `cashEntries CashEntry[]`

New model:
```prisma
model CashEntry {
  id                   String    @id @default(cuid())
  contractId           String
  fiscalYear           Int
  invoiceNo            String?
  claimPeriod          String?       // free text: "7/1/24-9/30/24"
  accountingPeriodDate DateTime?
  claimedAmount        Decimal?  @db.Decimal(14, 2)
  cashReceipts         Decimal?  @db.Decimal(14, 2)
  advanceOffset        Decimal?  @db.Decimal(14, 2)
  comments             String?
  createdById          String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  contract   Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
  createdBy  User?    @relation("CashEntryCreatedBy", fields: [createdById], references: [id])

  @@map("cash_entries")
}
```

Then:
```bash
npx prisma migrate dev --name add-cash-entries
npx prisma generate
```

---

## Step 4: API routes

**`src/app/api/grants-isbe/[contractId]/cash/route.ts`**
- `GET`: return entries ordered by createdAt. Auth: view permission + assignment or director.
- `POST`: create entry. Auth: editor assignment or director. Serialize Decimal fields with `String()`.

**`src/app/api/grants-isbe/[contractId]/cash/[entryId]/route.ts`**
- `PATCH`: update entry
- `DELETE`: delete entry
- Auth: editor or director only. Director = `isSuperAdmin || grants_isbe:manage` (NEVER grants_isbe:edit).

Reuse `resolveAccess()` pattern from `src/app/api/grants-isbe/[contractId]/route.ts`.

---

## Step 5: Three new tab components

### Design principles (ALL three tabs)
Modern CPS-branded UI — NOT Excel replicas:
- **Stat cards** at top for key figures (same style as rest of app, cobalt-accented)
- **Striped, hover-highlighted tables** with sticky headers
- **Color-coded values**: overrun = red/amber, on-track = cobalt/green, zero = muted gray
- **Section labels**: small uppercase tracking text, not Excel-style cell headers
- **Empty state**: friendly message when no data uploaded yet
- Standard CPS tokens: `bg-cobalt`, `text-charcoal`, `text-charcoal-muted`, `border-border`, `rounded-xl`, `shadow-sm`

---

### `src/components/grants-isbe/GrantCashSummaryTab.tsx`

**Stat cards (top):** Budget Amount, Total Claimed, Total Received, Current A/R Balance

**Contract info strip** (compact labeled field pairs, not a table):
Agency Contact, Location, CPS Contact, Budget Person, Contract No, Grant/Fund/Unit/Revenue/ALN, Program Period, Completion Report, Final Report

**Transactions table columns:**
Invoice/Receipt #, Claim Period, Acctg Period Booked, Claimed Amount, Cash Receipts, A/R Balance (running total — calculated client-side as cumulative sum), Comments, Advance/Offset

A/R Balance color: positive = cobalt (outstanding), zero = muted (settled), negative = amber (overpaid)

**Footer:** "FY {year} Total" subtotal rows per fiscal year, then "Grant Total" — visually distinct, bold

**Add Entry button** (directors + editors): opens modal form with fields: Invoice #, Claim Period, Acctg Period Date, Fiscal Year, Claimed Amount, Cash Receipts, Comments, Advance/Offset

Per-row: pencil (edit) + trash (delete with confirm) icons — directors + editors only

Fetch: `GET /api/grants-isbe/[contractId]/cash`

---

### `src/components/grants-isbe/GrantIsbeReportTab.tsx`

**Stat cards:** Total Expenditures (FSG ITD), Vouchered to Date (sum cash receipts), Outstanding Obligations, A/R Balance

**Report metadata strip:** Contract No, Grant code, Submission Date (today), Cumulative Through Date (FSG reportDate), Contact Person, Phone

**Expenditure table:**
- Rows: derived from union of accountCodes in FSG data, sorted numerically — NOT hardcoded
- Columns: derived from union of objectCodes in FSG data, sorted numerically — NOT hardcoded
- Column headers: objectCode + description from data
- Cell values: FSG inception-to-date for that accountCode+objectCode pair
- Zero cells: shown as "—" in muted gray
- Sticky first column (account code) on horizontal scroll
- Totals column (right) + totals row (bottom)
- Rows with all zeros: muted gray, not hidden
- Data source: current-period FSG ITD; fall back to next-period FSG if current missing

**Cash summary section** (below table, visually separated):
Vouchered to Date, Cumulative Expenditures, Outstanding Obligations, Balance — compact 4-row summary block

---

### `src/components/grants-isbe/GrantReconciliationTab.tsx`

**Stat cards:** Total Budget, Total Spent (current + next FSG ITD), Variance, % Utilized (with progress bar)

**Sanity check banner** (amber, shown only if Budget total ≠ Recon total): "Budget and reconciliation totals do not match"

**Reconciliation table columns:**
Acct, Object, Description, Budget (upload date), FSG Current (report date), FSG Next (report date), Total Program Cost, Budget Line Overrun

- Rows: union of accountCode+objectCode from budget + current FSG + next FSG, sorted
- Account group header rows (spanning, cobalt-tinted bg): "1000 — Instruction" with group subtotals
- Detail rows: white bg, object code + description
- Budget Line Overrun = Budget − Total Program Cost
  - Under budget: green chip
  - Over budget: red chip with amount
  - No budget line: "—"
- Rows with no data on either side: omitted
- Sticky column headers
- Grand total footer row

Data: `budget.parsedData.lines`, `currentFsg.parsedData.lines`, `nextFsg.parsedData.lines`

---

## Step 6: Wire into GrantDetailClient

**`src/components/grants-isbe/GrantDetailClient.tsx`**

Add to tab list: `["Info", "Budget", "FSG", "Cash Summary", "ISBE Report", "Reconciliation"]`

Fetch cash entries from `GET /api/grants-isbe/[contractId]/cash` (alongside existing budget/FSG).

Pass `isDirector`, `isEditor`, `currentUserId` to `GrantCashSummaryTab`.

---

## Step 7: Update server page

**`src/app/(app)/grants-isbe/[contractId]/page.tsx`**

Add cash entries fetch alongside existing budget/FSG fetches. Pass to `GrantDetailClient`.

---

## Step 8: Minor updates to existing tabs

**`src/components/grants-isbe/GrantBudgetTab.tsx`** — add Acct Code column if `accountCode` present (backwards compatible with old parsedData format).

**`src/components/grants-isbe/GrantFsgTab.tsx`** — same.

---

## Critical gotchas for this work

- `await params` — Next.js 16 dynamic route params are a Promise
- `String(v)` — Prisma 7 Decimal serialization for client components
- Director check = `isSuperAdmin || grants_isbe:manage` ONLY — never `grants_isbe:edit`
- After `npm install`, run `npx prisma generate` before building
- Node: nvm is active, no PATH prefix needed
