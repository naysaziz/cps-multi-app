---
name: ISBE Grants permission bug pattern
description: grants_isbe:edit is a coordinator permission, not director — never use it as a director-level gate
type: feedback
---

Never use `grants_isbe:edit` as a director-level check. It is a coordinator permission and will let coordinators bypass restrictions.

**Why:** Original code used `grants_isbe:edit || grants_isbe:manage` for `isDirector` checks in 7 places (API routes + page components). This allowed coordinators to assign/reassign contracts to themselves and others.

**How to apply:**
- Director check = `isSuperAdmin || permissions.includes("grants_isbe:manage")` only
- Coordinator check = `permissions.includes("grants_isbe:edit")` — grants upload/edit on assigned contracts
- When writing any new grants_isbe route or component, use `grants_isbe:manage` for director gates — never `grants_isbe:edit`
- The same `isDirector` logic must be consistent across: page server components, API route handlers, and UI component props. Check all three when changing access rules.
