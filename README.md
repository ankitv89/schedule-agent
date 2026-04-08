# Schedule Agent MCP System

A multi-agent system demonstrating integration between an Orchestrator agent and multiple toolset using the Model Context Protocol (MCP). The agent has an SQLite database for keeping track of Calendar Events, Tasks, and Notes.

## Quickstart

1. Add your API Key in `.env`:
   ```bash
   GOOGLE_API_KEY="your-gemini-api-key"
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Start the server (which includes the MCP server and API endpoints):
   ```bash
   npm start
   ```

## Architecture

- **MCP Server**: Located at `src/mcp/server.ts`, serving SSE connections. It exposes `create_task`, `create_event`, `search_notes`, etc.
- **MCP Client**: Located at `src/mcp/client.ts`, pulls definitions from the Server and constructs LangChain Tools.
- **Orchestrator**: `src/agents/Orchestrator.ts` uses LangChain's `createReactAgent` with a `gemini-1.5-pro` model to handle the task delegation.

## Usage

Use a REST client (like curl or Postman) to interact with the conversational agent:

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{ "message": "I have a flight to SF next week, create a task to pack my bags." }'
```

## Deployment

The provided `Dockerfile` allows this system to be deployed on Google Cloud Run. Make sure to provide `GOOGLE_API_KEY` via Cloud Run Secret Manager or Environment Variables during deployment.
