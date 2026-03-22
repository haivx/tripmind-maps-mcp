# Debug

Systematic 5-phase debugging for MCP tool issues.

## Phase 1: Reproduce
- What tool is failing? What input triggers the bug?
- Run the tool via MCP Inspector with the exact input
- Capture the full error output

## Phase 2: Isolate
- Is it a Google API error? Check the HTTP status code
- Is it a Zod validation error? Check the input schema
- Is it a cache issue? Try with cache disabled
- Is it a transport issue? Test in both stdio and HTTP modes
- Check: `npm run typecheck` — are there type errors?

## Phase 3: Diagnose
- Read the Google Maps API error documentation for the specific error code
- Check rate limits — are we hitting Google's QPM limits?
- Check API key permissions — is the required API enabled in Google Cloud Console?
- Check the cache TTL — is stale data being returned?

## Phase 4: Fix
- Make the minimal change that fixes the root cause
- Add a test case that would have caught this bug
- Run `npm run test` to verify fix doesn't break anything

## Phase 5: Verify
- Run the original failing input through MCP Inspector
- Run the full test suite
- Run typecheck
- Confirm the fix, then commit with `fix: <description>`

IMPORTANT: Complete all 5 phases. Do not skip Phase 5.
