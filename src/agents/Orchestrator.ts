import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const memory = new MemorySaver();

export class Orchestrator {
  private agent: any;
  
  constructor(tools: any[]) {
    // Using generative AI model
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash-latest",
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

  async handleUserMessage(message: string, sessionId: string) {
    try {
      await prisma.agentLog.create({
        data: {
          agentName: "Orchestrator",
          action: "handleUserMessage",
          details: `User said: ${message}`
        }
      });

      const result = await this.agent.invoke(
        { messages: [["user", message]] },
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
