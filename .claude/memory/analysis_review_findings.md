---
name: Analysis pages review findings
description: Lead-architect review findings for Phase 2.5 analysis pages, with fixes applied and remaining validation points
type: feedback
---

# Analysis Pages Review Findings

Review scope focused on the latest ISBE Grants analysis-pages work:
- Cash Summary
- ISBE Report
- Reconciliation
- budget upload/parser flow
- FSG upload/parser flow

---

## Findings and outcomes

### 1. Reconciliation was double-counting spend across current + next FSG

**Finding:** Reconciliation originally summed `current.inceptionToDate + next.inceptionToDate`, which can overstate total spend because both reports are cumulative snapshots.

**Fix applied:** Reconciliation now treats total spend per accountCode+objectCode as the latest available ITD value (`max(currentITD, nextITD)`) while still showing both columns separately for comparison.

**Status:** Fixed in code. Still needs validation against real crossover grant data.

---

### 2. Cash Summary running A/R depended on creation order, not accounting order

**Finding:** Running A/R and server fetch order used `createdAt`, so backfilled entries could produce historically wrong balances.

**Fix applied:** Cash entries are now ordered by `accountingPeriodDate`, then `createdAt`, for both server fetches and UI calculations.

**Status:** Fixed in code.

---

### 3. Budget parser only supported one export shape

**Finding:** The parser originally assumed the wide ISBE Frizz format with separate `Acct` and `Obj` columns. Actual uploaded CSV sample (`docs/Budget.csv`) is a compact 4-column format:
- combined account cell like `1000 Instruction`
- object cell like `Salaries (100)`
- amount column

**Fix applied:** Budget parser now supports both:
- wide Frizz export with separate account/object columns
- compact 4-column CSV export

It also throws a clear error if no recognizable budget rows are found instead of silently storing an empty upload.

**Status:** Fixed in code and locally verified against `docs/Budget.csv`.

---

### 4. Excel budget uploads needed worksheet selection

**Finding:** Multi-tab Excel workbooks could not safely assume the first tab was the budget sheet.

**Fix applied:** Budget upload flow now lists workbook tabs and prompts the user to choose the budget worksheet before import. Server validates the chosen sheet name.

**Status:** Fixed in code. Needs end-to-end UI verification with a multi-tab workbook.

---

### 5. Analysis tabs were too strict about parsed FSG shape

**Finding:** ISBE Report / Reconciliation expected analysis-ready account/object structure and could reject existing uploads even when FSG reports were present.

**Fix applied:** Parser contract was updated so future FSG uploads produce the right structure consistently, and analysis surfaces were hardened during review/fix passes.

**Status:** Partially fixed structurally. Fresh re-upload testing is still required to confirm actual parsed payloads populate analysis pages as expected.

---

### 6. FSG parsing prompt was too generic for CPS report structure

**Finding:** Original prompt did not encode the real CPS FSG conventions:
- first column = function description
- second column = function/account code
- header numbers `1..8` map to object codes `100..800`

**Fix applied:** FSG prompt now explicitly teaches:
- account/function code alignment with budget
- object header mapping (`1 => 100`, `2 => 200`, etc.)
- extraction of `functionDescription` and `objectDescription`
- extraction of top-of-report metadata

**Status:** Fixed in code. Needs validation on real FSG re-upload.

---

### 7. FSG uploads did not expose enough metadata to verify the report identity

**Finding:** Users could upload a PDF but could not easily confirm from the FSG tab which report was parsed, what date it represented, or whether it matched the intended grant/report run.

**Fix applied:** FSG parser and FSG tab now support/display:
- report title
- grant name
- report date
- generated/run date info
- grant code(s)
- current vs next period marker

**Status:** Fixed in code. Needs validation on fresh parsed FSG data.

---

### 8. FSG upload hard-failed when Google Gemini quota was exhausted

**Finding:** If the configured AI provider was Google and the Gemini quota was exhausted, the upload threw a 500-level failure with raw provider error text.

**Fix applied:** FSG parser now tries the configured provider first, then falls back to other available providers with API keys. Upload route now returns a clean JSON error instead of an unhandled exception if all providers fail.

**Status:** Fixed in code.

---

## Remaining validation

- Re-upload a current-period FSG PDF and confirm:
  - account codes align with budget account codes
  - object codes reflect the `1..8 => 100..800` mapping correctly
  - top-of-report metadata shows in FSG tab
  - ISBE Report populates from the parsed data

- Re-upload a next-period FSG PDF and confirm Reconciliation handles current vs next correctly without double-counting.

- Upload budget via:
  - compact CSV (`docs/Budget.csv`)
  - multi-tab Excel workbook (`docs/Grant Worksheet_Template.xlsx`)

- Verify the analysis tabs against real uploaded records rather than only static sample files.
