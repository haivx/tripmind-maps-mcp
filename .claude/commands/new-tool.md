# New Tool

Create a new MCP tool for the tripmind-maps server.

## Steps

1. **Plan the tool**: Before writing code, answer:
   - What TripMind use case does this solve?
   - Which Google Maps API endpoint does it call?
   - What's the estimated cost per call (SKU)?
   - What should be cached and for how long?

2. **Create tool file**: `src/tools/<tool-name>.ts`
   - Define Zod input schema with descriptive field docs
   - Implement handler with try/catch wrapping Google API call
   - Use `utils/google-client.ts` for API calls (never direct)
   - Use `utils/cache.ts` for caching
   - Add `readOnlyHint: true` annotation

3. **Register in index.ts**: Import and register with `server.registerTool()`
   - Tool name must be `maps_<name>` (namespaced)
   - Description must be concise (< 100 words) and travel-focused

4. **Write tests**: Add test cases to `tests/tools.test.ts`
   - Mock Google API responses
   - Test happy path, error cases, and cache behavior

5. **Verify**:
   - `npm run typecheck`
   - `npm run test`
   - `npm run inspect` → test tool manually in MCP Inspector

6. **Document**: Update README.md tool table with new tool

Use this template for the tool file:
```typescript
import { z } from "zod";
import { googleClient } from "../utils/google-client.js";
import { cache } from "../utils/cache.js";

export const toolName = "maps_<name>";

export const toolConfig = {
  title: "<Human-readable title>",
  description: "<What it does, when to use it — concise>",
  inputSchema: {
    // Zod schema here
  },
  annotations: { readOnlyHint: true, destructiveHint: false },
};

export async function handler(input: z.infer<typeof toolConfig.inputSchema>) {
  // 1. Check cache
  // 2. Call Google API via googleClient
  // 3. Cache result
  // 4. Return structured JSON
}
```
