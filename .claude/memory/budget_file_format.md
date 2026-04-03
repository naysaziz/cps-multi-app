---
name: ISBE Frizz budget file format
description: Column structure of the Excel/CSV budget download from ISBE Frizz — required to fix the budget parser correctly
type: project
---

The ISBE Frizz budget download (`docs/Grant Worksheet_Template.xlsx`, "Budget" sheet) has this column structure:

| Col | Index | Header | Content | Example |
|-----|-------|--------|---------|---------|
| A | 0 | Expenditure Accounting | Approval/submit status text (same for all rows) | "Submit: 01/27/2025 Approved: 01/30/2025" |
| B | 1 | Expenditure Accounting1 | Account description (full) | "1000 Instruction" |
| C | 2 | Columns | Object description with code in parens | "Salaries (100)" |
| D | 3 | Sum of Amount | Dollar amount | 98732333.0 |
| E | 4 | Acct | Account/function code (clean number) | "1000", "2110" |
| F | 5 | Obj | Object code (clean number) | "100", "200" |
| G | 6 | Acct-Obj | Combined key | "1000-100" |

**How to apply:** Budget parser must read:
- `accountCode` from col index 4 (E)
- `objectCode` from col index 5 (F)
- `description` from col index 2 (C), strip the `(NNN)` parenthetical → just "Salaries"
- `amount` from col index 3 (D)
- Skip rows where col E is not numeric (header row, etc.)

The current parser (as of Phase 2) reads wrong columns — it assumes objectCode=col[0], description=col[1], amount=last col. This is broken for the actual file format.

**Why:** Account code (function code like 1000, 2110) + object code (like 100, 200) are the join key used across Budget, FSG, ISBE Report, and Reconciliation. Both must be stored in `BudgetParsedData.lines`.
