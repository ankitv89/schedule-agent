# Schedule Agent (Google Hackathon)

This project is a sophisticated **Multi-Agent Conversational AI** designed to manage your schedule securely. By leveraging the power of **LangGraph**, the Model Context Protocol (**MCP**), and real **Google Calendar Integrations**, this system seamlessly parses natural language into atomic sub-tasks (scheduling events, recording notes, etc.) via independent backend components.

## Architecture Highlights
- **Agent Orchestrator:** Powered by `@langchain/google-genai` and `gemini-flash-latest`, this react agent intelligently plans execution sequences using dynamically injected MCP Tools.
- **Model Context Protocol (MCP):** A loosely coupled Tool Server exposing standard operations (`create_event`, `list_events`, `save_note`). The Agent fetches these tools via a Server-Sent Events (SSE) stream automatically.
- **Data Integrations:** Uses genuine `googleapis` endpoints for live Calendar modifications and a local SQLite database (via Prisma) for persistent task memory.
- **Premium Frontend:** Modern glassmorphism UI deployed out of the box through an Express static pipeline.

---

## 🚀 Setup & Installation

### 1. Environment Configuration
First, prepare your environment values. You can mirror the keys from `sample.env` into a new `.env` file at the root:

```bash
cp sample.env .env
```

### 2. Generate Your API Keys

You must explicitly obtain authorization keys to connect the brain and the calendar:

#### A. Gemini API Key (`GOOGLE_API_KEY`)
- Visit Google AI Studio: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Create an API key or use an existing one tied to your Google Cloud project.

#### B. Google Calendar OAuth2 Tokens
The MCP backend talks directly to your private Google Calendar. You need to obtain OAuth2 credentials.
1. Create an **OAuth Client ID** (Type: Web application) in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add `https://developers.google.com/oauthplayground` as an "Authorized redirect URI".
2. Head to the **[Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground)**.
3. Click the Gear Icon ⚙️ (top right), check "Use your own OAuth credentials", and paste your newly generated **Client ID** and **Client Secret**.
4. In Step 1, scroll down, find "Google Calendar API v3" and authorize the entire scope (`https://www.googleapis.com/auth/calendar`).
5. Complete the login flow and click **Exchange authorization code for tokens** to uncover your **Refresh Token**.
6. Place the Client ID, Client Secret, and Refresh Token in your `.env` file.

#### C. App API Key (`APP_API_KEY`)
You can optionally secure your backend with a master API Key. Just provide a string (e.g., `my-super-secret`) in `.env`. The frontend will intelligently prompt you for this string upon loading!

### 3. Build and Run

```bash
# Install dependencies
npm install

# Push Prisma Database Migrations
npx prisma db push

# Build TS files and Launch
npm run build
npm start
```

## 📚 Interactive API Documentation (Swagger)
For programmatic access constraints and definitions:
- Boot the server.
- Visit **`/api-docs`** in your browser. (e.g., `http://localhost:8080/api-docs`)
- We have fully mapped Swagger specifications exposing payload definitions for the LLM proxy endpoint.

You must pass your `APP_API_KEY` through the `x-api-key` header for direct CURL queries.
