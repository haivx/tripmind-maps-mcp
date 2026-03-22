# TripMind MCP Server — Google Maps API Implementation Plan

**Prepared:** March 22, 2026  
**Repository:** github.com/haivx/tripmind  
**Status:** Planning

---

## Executive Summary

This document outlines the plan to build a custom MCP (Model Context Protocol) server wrapping Google Maps API, designed specifically for TripMind's travel planning features. The MCP server will replace the current Nominatim geocoding dependency, add rich place search, directions, and distance capabilities, and integrate seamlessly with TripMind's Claude AI chat for location-aware travel assistance.

**The approach:** build a custom TypeScript MCP server using the official `@modelcontextprotocol/sdk`, exposing a curated set of Google Maps tools tailored to TripMind's needs. This server can be used both in Claude Code during development AND integrated into TripMind's runtime for AI-powered features.

---

## 1. Why Build Custom vs Use Existing?

There are several existing Google Maps MCP servers available, including the official reference from `modelcontextprotocol/servers` (now archived) and the community package `@cablate/mcp-google-map` with 17 tools. However, building a custom server for TripMind offers significant advantages:

| Aspect | Use Existing Package | Build Custom |
|--------|---------------------|-------------|
| Tool scope | 17 generic tools, many unused | 5–7 tools, travel-focused |
| Context budget | Large tool descriptions bloat LLM context | Lean, optimized descriptions |
| Integration | Standalone, no TripMind awareness | Can include Supabase trip data in prompts |
| Caching | No caching | Built-in Redis/in-memory cache for geocode |
| Cost control | No rate limiting | Per-user rate limiting built-in |
| Portfolio value | `npm install` | Demonstrates MCP expertise |

**Recommendation:** Build custom. A lean, travel-specific MCP server with 6–7 tools is more efficient, more secure, and demonstrates deeper technical understanding for the portfolio.

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

The MCP server sits between Claude (as MCP client) and Google Maps APIs. It can operate in two modes:

1. **stdio mode** — for local Claude Code/Claude Desktop development
2. **Streamable HTTP mode** — for runtime integration with TripMind's backend

```
[Claude Code / Claude Desktop] ← stdio → [tripmind-maps-mcp] ← HTTPS → [Google Maps APIs]
[TripMind Next.js App]         ← HTTP  → [tripmind-maps-mcp] ← HTTPS → [Google Maps APIs]
```

### 2.2 Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (matches TripMind codebase) |
| MCP SDK | `@modelcontextprotocol/sdk` (latest, Zod v4) |
| Transports | stdio + Streamable HTTP (Express middleware) |
| Google Maps Client | `@googlemaps/google-maps-services-js` |
| Validation | Zod for input schemas (consistent with TripMind) |
| Caching | In-memory Map (MVP) → Redis/Vercel KV (production) |
| Testing | Vitest + MCP Inspector |
| Deployment | npm package (stdio) + Vercel serverless (HTTP) |

### 2.3 Project Structure

```
tripmind-maps-mcp/
  src/
    index.ts              # Entry point, server init
    tools/
      geocode.ts            # Forward & reverse geocoding
      search-places.ts      # Text & nearby place search
      place-details.ts      # Rich place info by place_id
      directions.ts         # Route calculation A → B
      distance-matrix.ts    # Multi-origin/dest distances
      timezone.ts           # Timezone lookup by coords
    utils/
      cache.ts              # In-memory/Redis cache layer
      rate-limiter.ts       # Per-key rate limiting
      google-client.ts      # Google Maps API wrapper
    types.ts                # Shared TypeScript types
  tests/
    tools.test.ts           # Tool unit tests
  package.json
  tsconfig.json
  .env.example
  README.md
```

---

## 3. MCP Tools Specification

Each tool is designed for a specific TripMind use case. Tool descriptions are optimized for LLM understanding — concise but precise, helping Claude pick the right tool.

### 3.1 maps_geocode

**Purpose:** Convert address/landmark to coordinates and vice versa. Replaces current Nominatim dependency.

**TripMind use case:** Place creation (`place-form.tsx`), itinerary map pins

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string (optional) | Address or landmark name to geocode |
| `latitude` | number (optional) | Lat for reverse geocoding |
| `longitude` | number (optional) | Lng for reverse geocoding |
| `language` | string (optional) | Response language (default: `en`) |

**Caching:** Cache geocode results for 30 days (Google ToS max). Key = normalized address string.

**Google API:** Geocoding API — Essentials SKU, 10,000 free/month, then $5/1,000 requests

### 3.2 maps_search_places

**Purpose:** Free-text place search ("ramen restaurants in Shinjuku") and nearby search by type.

**TripMind use case:** AI chat place recommendations, itinerary suggestions, "find nearby" feature

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search text (e.g. "sushi near Tokyo Tower") |
| `location` | object (optional) | `{ lat, lng }` to bias results |
| `radius` | number (optional) | Search radius in meters (max 50000) |
| `type` | string (optional) | Place type filter (restaurant, hotel, etc) |
| `language` | string (optional) | Response language |

**Google API:** Places API (New) — Text Search. Use field masks to control costs. Only request name, address, location, rating, types.

### 3.3 maps_place_details

**Purpose:** Get rich details for a specific place: reviews, hours, phone, website, photos.

**TripMind use case:** Enrich place data after adding to trip, show details in place cards

| Parameter | Type | Description |
|-----------|------|-------------|
| `place_id` | string | Google Place ID from search results |
| `fields` | string[] (optional) | Specific fields to return (cost control) |
| `language` | string (optional) | Response language |

**Cost note:** Place Details pricing depends on fields requested. Basic fields (name, address) = $0. Contact/Atmosphere fields = $17–32/1,000. **Always use field masks!**

### 3.4 maps_directions

**Purpose:** Calculate route between two points with travel time, distance, and step-by-step directions.

**TripMind use case:** Itinerary day planning (travel time between places), AI chat route suggestions

| Parameter | Type | Description |
|-----------|------|-------------|
| `origin` | string | Starting point (address or place_id) |
| `destination` | string | End point (address or place_id) |
| `mode` | enum (optional) | `DRIVING` \| `WALKING` \| `TRANSIT` \| `BICYCLING` |
| `departure_time` | string (optional) | ISO datetime for traffic-aware routing |

**Google API:** Routes API (Compute Routes) — Basic $5/1,000, with traffic-aware $10/1,000. Prefer Routes API over legacy Directions API.

### 3.5 maps_distance_matrix

**Purpose:** Calculate distances/times between multiple origins and destinations simultaneously.

**TripMind use case:** Optimize itinerary order for a day (find shortest route visiting all places)

| Parameter | Type | Description |
|-----------|------|-------------|
| `origins` | string[] | List of origin addresses or place_ids |
| `destinations` | string[] | List of destination addresses or place_ids |
| `mode` | enum (optional) | Travel mode |

### 3.6 maps_timezone

**Purpose:** Get timezone info for coordinates. Useful for displaying local times in itinerary.

**TripMind use case:** Show local time for trip destinations, timezone-aware scheduling

| Parameter | Type | Description |
|-----------|------|-------------|
| `latitude` | number | Latitude |
| `longitude` | number | Longitude |
| `timestamp` | number (optional) | Unix timestamp (default: now) |

---

## 4. Google Maps API Setup & Cost Estimation

### 4.1 Required Google APIs to Enable

In Google Cloud Console, enable:

- **Geocoding API** — address ↔ coordinates conversion
- **Places API (New)** — text search, nearby search, place details
- **Routes API** — directions and route computation (replaces legacy Directions API)
- **Distance Matrix API** — multi-point distance calculations
- **Timezone API** — timezone data by location

### 4.2 Cost Estimation (Personal/MVP Usage)

| API | Free Tier | Price After | Est. Monthly |
|-----|-----------|-------------|-------------|
| Geocoding | 10,000/month | $5/1,000 | ~200 calls = **$0** |
| Places Text Search | 10,000/month | $32/1,000 | ~100 calls = **$0** |
| Place Details (Basic) | 10,000/month | $0 (basic fields) | ~150 calls = **$0** |
| Routes (Basic) | 10,000/month | $5/1,000 | ~100 calls = **$0** |
| Distance Matrix | 10,000/month | $5/1,000 elements | ~50 calls = **$0** |
| Timezone | 10,000/month | $5/1,000 | ~30 calls = **$0** |

**For personal/MVP usage like TripMind (Tokyo trip + testing), estimated monthly cost = $0.** The free tiers are more than sufficient. Always use field masks on Places API to avoid triggering expensive SKUs.

---

## 5. Implementation Phases

### Phase 1: Project Bootstrap (Day 1)

1. Init project: `mkdir tripmind-maps-mcp && npm init -y`
2. Install deps: `@modelcontextprotocol/sdk`, `zod`, `@googlemaps/google-maps-services-js`, `dotenv`
3. Configure TypeScript: target ES2022, module Node16, strict mode (match TripMind config)
4. Create `McpServer` instance with name "tripmind-maps", version "1.0.0"
5. Set up `StdioServerTransport` for local testing
6. Verify with MCP Inspector: `npx @modelcontextprotocol/inspector`

### Phase 2: Core Tools (Day 2–3)

1. Implement `maps_geocode` with Zod input validation and caching layer
2. Implement `maps_search_places` with field masks for cost control
3. Implement `maps_place_details` with configurable field selection
4. Add proper error handling with MCP error codes (wrap Google API errors)
5. Write unit tests for each tool with mocked Google API responses
6. Test with Claude Desktop: add to `claude_desktop_config.json` and verify tools work

### Phase 3: Route & Distance Tools (Day 4)

1. Implement `maps_directions` using Routes API (not legacy Directions API)
2. Implement `maps_distance_matrix` for multi-point optimization
3. Implement `maps_timezone`
4. Add tool annotations: `readOnlyHint: true`, `destructiveHint: false` on all tools
5. End-to-end test: ask Claude to "plan a walking route from Senso-ji to Tokyo Skytree"

### Phase 4: Production Hardening (Day 5)

1. Add rate limiting per API key (configurable, default 100 req/min)
2. Add Streamable HTTP transport for remote deployment
3. Add retry logic with exponential backoff for Google API calls
4. Add structured logging (stderr for stdio mode, console for HTTP)
5. Create `.env.example` with `GOOGLE_MAPS_API_KEY` placeholder
6. Write comprehensive README with setup, Claude Code config, and usage examples

### Phase 5: TripMind Integration (Day 6–7)

1. Replace Nominatim geocoding in `geocode.ts` with MCP server call or direct Google API
2. Update AI chat prompts to leverage place search tools for location-aware responses
3. Add route/distance info to itinerary suggestions (travel time between daily stops)
4. Register MCP server in Claude Code config (`.claude/settings.json`) for dev workflow
5. Publish to npm as `@haivx/tripmind-maps-mcp` for easy sharing

---

## 6. Key Implementation Details

### 6.1 Server Entry Point Pattern

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "tripmind-maps", version: "1.0.0" });

// Register tools (Zod v4 for input schemas)
server.registerTool("maps_geocode", {
  title: "Geocode Address",
  description: "Convert address to coordinates or coordinates to address",
  inputSchema: {
    address: z.string().optional().describe("Address or landmark to geocode"),
    latitude: z.number().optional().describe("Latitude for reverse geocoding"),
    longitude: z.number().optional().describe("Longitude for reverse geocoding"),
  },
  annotations: { readOnlyHint: true, destructiveHint: false },
}, async ({ address, latitude, longitude }) => {
  // Implementation here
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 6.2 Caching Strategy

Caching is critical both for performance and cost control. Google ToS allows caching geocode results for up to 30 days.

| Data Type | Cache TTL | Key Pattern |
|-----------|-----------|-------------|
| Geocode results | 30 days | Normalized lowercase address |
| Place search results | 24 hours | query + location hash |
| Place details | 7 days | place_id + fields hash |
| Directions/Distance | 1 hour | origin + dest + mode hash |
| Timezone | 90 days | lat + lng (rounded to 2 decimals) |

### 6.3 Claude Code Integration

Add to TripMind's Claude Code config:

```json
{
  "mcpServers": {
    "tripmind-maps": {
      "command": "node",
      "args": ["./tripmind-maps-mcp/build/index.js"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "${env:GOOGLE_MAPS_API_KEY}"
      }
    }
  }
}
```

### 6.4 Error Handling Pattern

All tools follow the same error pattern:

```typescript
try {
  const result = await googleClient.geocode(params);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
} catch (error) {
  const message = error instanceof Error ? error.message : "Google Maps API error";
  console.error(`[maps_geocode] Error: ${message}`);
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}
```

---

## 7. Alignment with Code Review Recommendations

This MCP server directly addresses several issues identified in the TripMind Code Review Report:

| Review Finding | How MCP Server Addresses It |
|----------------|---------------------------|
| Nominatim geocoding has no caching | Built-in cache layer with configurable TTL |
| External API dependency with no fallback | Google Maps API is more reliable + retry logic |
| No rate limiting on API routes | Per-key rate limiting built into MCP server |
| AI chat lacks location awareness | Claude can call place search/directions tools directly |
| Claude Code workflow gaps | MCP server enriches Claude Code with real location data |
| Hardcoded exchange rates | Timezone tool enables location-aware features |

---

## 8. Portfolio & Presentation Value

Building a custom MCP server adds significant depth to the TripMind portfolio story:

- **Demonstrates MCP protocol understanding** — one of the most in-demand AI engineering skills in 2025-2026
- **Shows full-stack AI integration** — not just using AI APIs but building the infrastructure that connects AI to real-world data
- **Meta-level thinking** — using AI (Claude Code + MCP) to build an AI app, with a custom MCP server enriching the development workflow itself
- **Open-source contribution potential** — a well-built travel-focused MCP server could be published and used by others

---

## Summary: 7-Day Timeline

| Day | Phase | Deliverable |
|-----|-------|-------------|
| Day 1 | Bootstrap | Working MCP server shell, verified with Inspector |
| Day 2–3 | Core Tools | geocode, search, details tools with tests |
| Day 4 | Route Tools | directions, distance, timezone tools |
| Day 5 | Hardening | Rate limiting, retry, HTTP transport, docs |
| Day 6–7 | Integration | TripMind connected, Nominatim replaced, npm published |

---

After completing this plan, TripMind will have a production-ready, travel-focused MCP server that enhances both the development workflow (via Claude Code) and the runtime AI features (via chat and itinerary suggestions), while demonstrating strong MCP engineering skills for the portfolio.
