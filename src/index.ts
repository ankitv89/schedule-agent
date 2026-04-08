import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { mcpRouter } from "./mcp/server";
import { MCPClientManager } from "./mcp/client";
import { Orchestrator } from "./agents/Orchestrator";

const app = express();

const PORT = process.env.PORT || 8080;

// Serve static UI frontend
app.use(express.static(path.join(__dirname, "../public")));

// Swagger UI Documentation
const swaggerDocument = JSON.parse(fs.readFileSync(path.join(__dirname, "../swagger.json"), "utf8"));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Key Security Middleware for /api routes
app.use("/api", (req, res, next) => {
  const apiKey = req.header("x-api-key");
  if (process.env.APP_API_KEY && apiKey !== process.env.APP_API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid x-api-key header" });
  }
  next();
});

// Mount the MCP SSE Server
app.use("/mcp", mcpRouter);

let orchestrator: Orchestrator;

async function initSystem() {
  const serverUrl = `http://localhost:${PORT}/mcp/sse`;
  const mcpClient = new MCPClientManager(serverUrl);
  
  console.log("Connecting MCP Client to MCP Server at", serverUrl);
  // Wait a small bit for express to be listening
  setTimeout(async () => {
    try {
      await mcpClient.connect();
      orchestrator = new Orchestrator(mcpClient.getLangchainTools());
      console.log("Multi-Agent system ready.");
    } catch (e) {
      console.error("Failed to connect MCP client", e);
    }
  }, 1000);
}

app.post("/api/chat", express.json(), async (req, res) => {
  const { message, sessionId = "default-session", refreshToken } = req.body;
  
  if (!orchestrator) {
    return res.status(503).json({ error: "Agent system not ready yet" });
  }
  
  if (!message) {
    return res.status(400).json({ error: "Missing message body" });
  }
  
  const response = await orchestrator.handleUserMessage(message, sessionId, refreshToken);
  res.json({ response });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  initSystem();
});
