---
name: mcp-tool-dev
description: Best practices for developing MCP tools with @modelcontextprotocol/sdk TypeScript SDK
---

# MCP Tool Development Patterns

## Tool Registration (SDK v1.27+)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "server-name", version: "1.0.0" });

server.registerTool("tool_name", {
  title: "Human-Readable Title",
  description: "Concise description for LLM tool selection (< 100 words)",
  inputSchema: {
    param: z.string().describe("What this param is for"),
    optional: z.number().optional().describe("Optional with default behavior"),
  },
  annotations: {
    readOnlyHint: true,      // Tool doesn't modify state
    destructiveHint: false,  // Safe to auto-approve
    openWorldHint: true,     // Interacts with external API
  },
}, async ({ param, optional }) => {
  // Handler implementation
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
});
```

## Error Handling Pattern

```typescript
async function handler(input) {
  try {
    const result = await googleApiCall(input);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [{ type: "text", text: JSON.stringify({ error: message }) }],
      isError: true,
    };
  }
}
```

## Transport Setup

```typescript
// stdio (Claude Code, Claude Desktop)
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const transport = new StdioServerTransport();
await server.connect(transport);

// NEVER use console.log with stdio — it corrupts JSON-RPC
// Use console.error for debug output
```

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## Key Rules

- Tool names: `snake_case` with namespace prefix (`maps_geocode`)
- Input schemas: Always add `.describe()` to every Zod field
- Descriptions: Help the LLM pick the right tool — be specific about WHEN to use it
- Return JSON in content text, not prose — let LLM format
- One tool = one Google API endpoint (mostly)
