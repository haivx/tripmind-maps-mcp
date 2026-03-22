# tripmind-maps-mcp

A custom MCP (Model Context Protocol) server wrapping Google Maps API for TripMind — an AI-powered travel planning app. This server provides travel-focused location tools (geocoding, place search, directions, etc.) that Claude can call during both development and runtime.

## Tech Stack

- **Language:** TypeScript (ES2022, Node16 modules, strict mode)
- **MCP SDK:** `@modelcontextprotocol/sdk` (latest, uses Zod v4)
- **Google Maps:** `@googlemaps/google-maps-services-js`
- **Validation:** Zod for all tool input schemas
- **Testing:** Vitest + MCP Inspector
- **Transports:** stdio (Claude Code/Desktop) + Streamable HTTP (production)

## Project Structure

```
src/
  index.ts              # Server entry point, tool registration, transport setup
  tools/                # One file per MCP tool
    geocode.ts          # Forward & reverse geocoding
    search-places.ts    # Text & nearby place search
    place-details.ts    # Rich place info by place_id
    directions.ts       # Route calculation A → B
    distance-matrix.ts  # Multi-origin/dest distances
    timezone.ts         # Timezone lookup by coords
  utils/
    cache.ts            # In-memory cache with TTL
    rate-limiter.ts     # Per-key rate limiting
    google-client.ts    # Google Maps API client wrapper
  types.ts              # Shared TypeScript types
tests/
  tools.test.ts         # Tool integration tests (mocked Google API)
```

## Commands

```bash
npm run build          # Compile TypeScript → build/
npm run dev            # Watch mode with ts-node
npm run start          # Run compiled server (stdio)
npm run start:http     # Run HTTP transport on port 3000
npm run test           # Run vitest
npm run inspect        # Open MCP Inspector for debugging
npm run lint           # ESLint check
npm run typecheck      # tsc --noEmit
```

## Code Standards

- Use ES modules (`import/export`), never CommonJS
- All tool inputs validated with Zod schemas — no exceptions
- Every tool handler wrapped in try/catch; return MCP error codes on failure
- Never use `console.log` in stdio mode (corrupts JSON-RPC). Use `console.error` for debug logging
- Keep tool descriptions concise but precise — they consume LLM context tokens
- All Google API calls go through `utils/google-client.ts`, never called directly from tools
- Cache geocode results (30-day TTL), place search (24h), directions (1h), timezone (90d)
- Add `annotations: { readOnlyHint: true, destructiveHint: false }` to every tool

## Tool Design Principles

- Each tool solves one specific TripMind use case — no generic "do everything" tools
- Tool names prefixed with `maps_` for namespace clarity
- Return structured JSON content, not prose — let the LLM format for the user
- Use Google Maps field masks to control costs (especially Places API)
- Prefer Routes API over legacy Directions API

## Workflow

- Always run `npm run typecheck` after editing .ts files
- Test tools with MCP Inspector before integration testing
- Run `npm run test` before committing
- Commit messages follow conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- NEVER commit .env or API keys. Use .env.example for templates

## Related Context

- Parent project: TripMind (Next.js 14 + Supabase + Claude AI)
- This server replaces TripMind's current Nominatim geocoding dependency
- See `docs/IMPLEMENTATION_PLAN.md` for full architecture and phased plan
