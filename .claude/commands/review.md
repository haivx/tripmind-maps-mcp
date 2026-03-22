# Review

Perform a thorough code review of the current changes.

## Checklist

Review each area and report findings by severity:

### 🔴 Critical (must fix before merge)
- [ ] API keys or secrets exposed in code
- [ ] Missing error handling on Google API calls
- [ ] `console.log` used in stdio code path (breaks JSON-RPC)
- [ ] Tool returns unvalidated Google API response directly

### 🟡 Warning (should fix soon)
- [ ] Missing Zod validation on tool inputs
- [ ] No cache implementation for cacheable data
- [ ] Missing `readOnlyHint` annotation on tool
- [ ] Tool description exceeds 100 words (wastes LLM context)
- [ ] File exceeds 150 lines

### 🟢 Suggestion (nice to have)
- [ ] Could use more specific Google Maps field masks
- [ ] Missing JSDoc on exported functions
- [ ] Test coverage gaps

## Verification

After reviewing, run:
```bash
npm run typecheck
npm run test
npm run lint
```

Report results with the review.

## Output Format

```
## Code Review: [scope]

### 🔴 Critical
- [description] — [file:line]

### 🟡 Warning
- [description] — [file:line]

### 🟢 Suggestion
- [description] — [file:line]

### Verification
- TypeCheck: ✅/❌
- Tests: ✅/❌ (X passed, Y failed)
- Lint: ✅/❌
```
