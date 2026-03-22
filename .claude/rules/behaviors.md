# Core Behaviors

## Plan Before Code
Always start in plan mode for tasks touching more than one file. Write the plan, get confirmation, then implement.

## Verify Before Claiming Done
After any implementation:
1. Run `npm run typecheck` — confirm zero errors
2. Run `npm run test` — confirm all pass
3. Test with MCP Inspector if tool behavior changed
4. Only THEN say the task is complete

## Fail Loudly
- Every Google API call must have error handling
- Never swallow errors silently — log to stderr, return MCP error content
- If a cache miss leads to API failure, the tool must still return a meaningful error

## Small, Focused Changes
- One tool per file, one concern per function
- If a file exceeds 150 lines, split it
- Each PR should be reviewable in under 10 minutes

## Cost Awareness
- Always use field masks on Places API calls
- Never request all fields when only name + location is needed
- Log which Google API SKU each tool triggers (in comments)
- Cache aggressively within Google ToS limits
