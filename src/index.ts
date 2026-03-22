#!/usr/bin/env node
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { toolName as geocodeName, toolConfig as geocodeConfig, handler as geocodeHandler } from "./tools/geocode.js";
import { toolName as searchPlacesName, toolConfig as searchPlacesConfig, handler as searchPlacesHandler } from "./tools/search-places.js";
import { toolName as placeDetailsName, toolConfig as placeDetailsConfig, handler as placeDetailsHandler } from "./tools/place-details.js";
import { toolName as directionsName, toolConfig as directionsConfig, handler as directionsHandler } from "./tools/directions.js";
import { toolName as distanceMatrixName, toolConfig as distanceMatrixConfig, handler as distanceMatrixHandler } from "./tools/distance-matrix.js";
import { toolName as timezoneName, toolConfig as timezoneConfig, handler as timezoneHandler } from "./tools/timezone.js";
import { assertRateLimit } from "./utils/rate-limiter.js";

/** Create and register all tools on a new McpServer instance. */
function createMcpServer(): McpServer {
  const server = new McpServer({ name: "tripmind-maps", version: "0.1.0" });
  server.registerTool(geocodeName, geocodeConfig, geocodeHandler);
  server.registerTool(searchPlacesName, searchPlacesConfig, searchPlacesHandler);
  server.registerTool(placeDetailsName, placeDetailsConfig, placeDetailsHandler);
  server.registerTool(directionsName, directionsConfig, directionsHandler);
  server.registerTool(distanceMatrixName, distanceMatrixConfig, distanceMatrixHandler);
  server.registerTool(timezoneName, timezoneConfig, timezoneHandler);
  return server;
}

const useHttp = process.argv.includes("--http") || process.env["HTTP_MODE"] === "true";

if (useHttp) {
  // ---------------------------------------------------------------------------
  // HTTP transport (production / remote clients)
  // ---------------------------------------------------------------------------
  const port = parseInt(process.env["PORT"] ?? "3000", 10);
  const app = express();

  app.use(express.json());

  // CORS — allow all origins for local development
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
    next();
  });

  app.options("/mcp", (_req: Request, res: Response) => {
    res.sendStatus(204);
  });

  // Rate limit per IP before reaching MCP handler
  app.use("/mcp", (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    try {
      assertRateLimit(ip);
      next();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Rate limit exceeded";
      res.status(429).json({ error: message });
    }
  });

  // Stateless: create a fresh server + transport per request
  app.post("/mcp", async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const server = createMcpServer();
    await server.connect(transport);
    try {
      await transport.handleRequest(req, res, req.body);
    } finally {
      await server.close();
    }
  });

  app.listen(port, () => {
    console.error(`[tripmind-maps] HTTP server on port ${port}`);
  });
} else {
  // ---------------------------------------------------------------------------
  // Stdio transport (Claude Code / Desktop — default)
  // ---------------------------------------------------------------------------
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[tripmind-maps] MCP server started");
}
