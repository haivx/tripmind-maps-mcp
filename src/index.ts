#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { toolName, toolConfig, handler } from "./tools/geocode.js";

const server = new McpServer({ name: "tripmind-maps", version: "0.1.0" });

server.registerTool(toolName, toolConfig, handler);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[tripmind-maps] MCP server started");
