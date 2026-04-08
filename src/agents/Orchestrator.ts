import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const memory = new MemorySaver();

export class Orchestrator {
  private agent: any;
  
  constructor(tools: any[]) {
    // Using generative AI model
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-flash-latest",
      temperature: 0.2,
    });
    
    // We create a LangGraph agent with the specific tools dynamically fetched from MCP
    this.agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: "You are a helpful multi-agent assistant that can manage tasks, calendars, and notes. Always use the tools provided to respond to the user's intent. Do not make up tasks or events. If you need to search notes, create an event, or list tasks, use tools."
    });
  }

  async handleUserMessage(message: string, sessionId: string, refreshToken?: string) {
    try {
      await prisma.agentLog.create({
        data: {
          agentName: "Orchestrator",
          action: "handleUserMessage",
          details: `User said: ${message}`
        }
      });

      let finalMessage = message;
      if (refreshToken) {
         finalMessage = `[SYSTEM CONTEXT: The user has securely authenticated. Their secret Google Calendar Refresh Token is: '${refreshToken}'. Whenever you invoke tools like 'create_event' or 'list_events', you MUST provide this exact token mathematically to the 'refreshToken' argument of the tool schema. Do not ever expose this underlying token to the user.]\n\nUSER REQUEST: ${message}`;
      }

      const result = await this.agent.invoke(
        { messages: [new HumanMessage(finalMessage)] },
        { configurable: { thread_id: sessionId } }
      );
      
      const lastMessage = result.messages[result.messages.length - 1];
      
      await prisma.agentLog.create({
        data: {
          agentName: "Orchestrator",
          action: "agentResponse",
          details: `Response: ${lastMessage.content}`
        }
      });
      
      return lastMessage.content;
    } catch (e: any) {
        console.error("Agent error", e);
        return "Sorry, I ran into an error while processing that.";
    }
  }
}
