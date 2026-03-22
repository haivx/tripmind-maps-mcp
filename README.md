# tripmind-maps-mcp

A travel-focused MCP (Model Context Protocol) server wrapping Google Maps API. Built for [TripMind](https://github.com/haivx/tripmind) — an AI-powered travel planning app.

This server provides 6 curated location tools that Claude can call for geocoding, place search, directions, and more. It works with Claude Code, Claude Desktop, and any MCP-compatible client.

## Why Custom Instead of Existing Packages?

There are generic Google Maps MCP servers available (like `@cablate/mcp-google-map` with 17 tools). This custom server is purpose-built for travel planning:

- **Lean tool set** — 6 tools instead of 17, saving LLM context tokens
- **Built-in caching** — geocode results cached 30 days, reducing API costs
- **Rate limiting** — per-key throttling prevents credit burn
- **Travel-optimized** — tool descriptions tuned for trip planning queries
- **Cost-aware** — field masks on all Places API calls, Routes API over legacy

## Tools

| Tool | Description | Google API | Cache TTL |
|------|-------------|------------|-----------|
| `maps_geocode` | Address ↔ coordinates conversion | Geocoding | 30 days |
| `maps_search_places` | Text search & nearby discovery | Places (New) | 24 hours |
| `maps_place_details` | Rich info: hours, reviews, photos | Place Details | 7 days |
| `maps_directions` | Route with time, distance, steps | Routes API | 1 hour |
| `maps_distance_matrix` | Multi-point distance/time grid | Distance Matrix | 1 hour |
| `maps_timezone` | Timezone by coordinates | Timezone | 90 days |

## Quick Start

### Prerequisites

- Node.js 20+ 
- Google Maps API key with these APIs enabled:
  - Geocoding API
  - Places API (New)
  - Routes API
  - Distance Matrix API
  - Timezone API

### Installation

**Via npm (recommended):**

```bash
npm install -g @haivx/tripmind-maps-mcp
# or use directly with npx (no install needed)
```

**From source:**

```bash
git clone https://github.com/haivx/tripmind-maps-mcp.git
cd tripmind-maps-mcp
npm install
cp .env.example .env
# Edit .env and add your GOOGLE_MAPS_API_KEY
npm run build
```

### Use with Claude Code

```bash
claude mcp add tripmind-maps -- npx -y @haivx/tripmind-maps-mcp
```

Or manually add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "tripmind-maps": {
      "command": "npx",
      "args": ["-y", "@haivx/tripmind-maps-mcp"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "${env:GOOGLE_MAPS_API_KEY}"
      }
    }
  }
}
```

### Use with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tripmind-maps": {
      "command": "node",
      "args": ["/absolute/path/to/tripmind-maps-mcp/build/index.js"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### HTTP Mode (Remote Deployment)

```bash
npm run start:http
# Server runs on http://localhost:3000/mcp
```

Connect from any MCP client:

```json
{
  "tripmind-maps": {
    "transport": "streamableHttp",
    "url": "http://localhost:3000/mcp"
  }
}
```

## Development

```bash
npm run dev            # Watch mode
npm run test           # Run tests
npm run typecheck      # Type check
npm run inspect        # MCP Inspector UI
npm run lint           # ESLint
```

### Adding a New Tool

Use the Claude Code command: `/new-tool`

Or follow these steps:

1. Create `src/tools/<name>.ts` with Zod schema + handler
2. Register in `src/index.ts` via `server.registerTool()`
3. Add tests to `tests/tools.test.ts`
4. Update this README's tool table
5. Run `npm run typecheck && npm run test`

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

This opens a web UI where you can call each tool with test inputs and see responses.

## Cost Estimation

For personal/MVP usage (< 1,000 calls/month per API), all usage falls within Google's free tiers:

| API | Free Tier | Price After |
|-----|-----------|-------------|
| Geocoding | 10,000/month | $5/1,000 |
| Places Text Search | 10,000/month | $32/1,000 |
| Place Details (Basic) | 10,000/month | $0 (basic fields) |
| Routes (Basic) | 10,000/month | $5/1,000 |
| Distance Matrix | 10,000/month | $5/1,000 elements |
| Timezone | 10,000/month | $5/1,000 |

**Estimated monthly cost for TripMind MVP: $0**

## Project Structure

```
tripmind-maps-mcp/
├── .claude/                  # Claude Code workflow
│   ├── settings.json         # Hooks, permissions
│   ├── commands/             # Slash commands (/new-tool, /review, /ship, /debug)
│   ├── agents/               # Subagent definitions (code-reviewer)
│   ├── skills/               # Domain knowledge (mcp-tool-dev)
│   ├── rules/                # Behavior rules (behaviors, content-safety)
│   └── memory/               # Session continuity (today.md)
├── docs/
│   └── IMPLEMENTATION_PLAN.md
├── src/
│   ├── index.ts
│   ├── tools/
│   ├── utils/
│   └── types.ts
├── tests/
├── CLAUDE.md                 # Project context for Claude Code
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Claude Code Workflow

This project includes a complete Claude Code workflow:

| Component | Purpose |
|-----------|---------|
| `CLAUDE.md` | Project context, tech stack, commands, standards |
| `.claude/rules/behaviors.md` | Development behavior rules (plan first, verify, cost awareness) |
| `.claude/rules/content-safety.md` | Travel data accuracy rules (never fabricate locations) |
| `.claude/commands/new-tool.md` | Step-by-step guide for adding MCP tools |
| `.claude/commands/review.md` | Code review checklist with severity levels |
| `.claude/commands/ship.md` | Pre-publish verification checklist |
| `.claude/commands/debug.md` | 5-phase systematic debugging guide |
| `.claude/agents/code-reviewer.md` | Sonnet-powered code review subagent |
| `.claude/skills/mcp-tool-dev/` | MCP SDK patterns and best practices |
| `.claude/hooks` | Auto typecheck on .ts writes, block .env writes, session reminders |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_MAPS_API_KEY` | Yes | Google Maps Platform API key |
| `PORT` | No | HTTP server port (default: 3000) |
| `CACHE_ENABLED` | No | Enable/disable caching (default: true) |
| `RATE_LIMIT_RPM` | No | Requests per minute limit (default: 100) |
| `LOG_LEVEL` | No | debug, info, warn, error (default: info) |

## Related

- [TripMind](https://github.com/haivx/tripmind) — The parent AI travel planning app
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Official SDK
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) — Testing tool
- [Google Maps Services JS](https://github.com/googlemaps/google-maps-services-js) — Google Maps client

## License

MIT
