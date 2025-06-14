
// /src/app/api/dispatch-instruction/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import type { LogEntry } from '@/context/LogContext'; // For type reference if needed, though internal log is simpler

type AgentResponseType = {
  reply?: string;
  error?: string;
};

type AgentRole = 'developer' | 'qa' | 'user' | 'system';

type ChatMessage = {
  from: AgentRole;
  content: string;
  timestamp: number;
  // id is not strictly needed by current frontend chat display from backend, but good for consistency
  // id: string; 
};


// Helper for agent calls
async function callAgent(agentFullUrl: string, prompt: string, context?: string): Promise<AgentResponseType> {
  try {
    const agentResp = await fetch(agentFullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context }) // Agents expect 'prompt' and 'context'
    });

    const data = await agentResp.json();
    if (!agentResp.ok) {
      // Try to get error from data.error or data.reply or data.details
      const errorDetail = data.error || data.reply || data.details || `Agent call failed with status ${agentResp.status}`;
      console.error(`[DispatchInstruction-CallAgent] Error from ${agentFullUrl}:`, errorDetail);
      return { error: String(errorDetail).slice(0, 500) };
    }
    // Individual agent routes already return { reply: "..." }
    return { reply: data.reply || "Agent responded with empty content." };
  } catch (error: any) {
    console.error(`[DispatchInstruction-CallAgent] Network or parsing error calling ${agentFullUrl}:`, error);
    return { error: `Failed to communicate with agent: ${error.message}` };
  }
}

export async function POST(req: NextRequest) {
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (error) {
    console.error('[DispatchInstruction] Invalid JSON body:', error);
    const systemErrorLog: ChatMessage[] = [{ 
        from: 'system', 
        content: 'Error: Invalid JSON body provided to dispatcher.', 
        timestamp: Date.now(),
    }];
    return NextResponse.json({ result: { chatLog: systemErrorLog }}, { status: 400 });
  }

  // 'instruction' from frontend is the 'prompt' for agents.
  // 'files' from frontend is the 'context' for agents.
  const { agentType: initialAgentRole, instruction, files, chatLog: incomingChatLog = [] } = requestBody;
  const userPrompt = instruction;
  const projectContext = files ? JSON.stringify(files).slice(0, 5000) : undefined;


  if (!initialAgentRole || !userPrompt) {
    console.error('[DispatchInstruction] Missing initialAgentRole or instruction (userPrompt)');
    const systemErrorLog: ChatMessage[] = [{ 
        from: 'system', 
        content: 'Error: Missing agentType or instruction in dispatch request.', 
        timestamp: Date.now(),
    }];
    return NextResponse.json({ result: { chatLog: systemErrorLog }}, { status: 400 });
  }

  let primaryAgentEndpointPath = '';
  let secondaryAgentEndpointPath = '';
  let primaryAgentRole: AgentRole = 'developer'; // Default
  let secondaryAgentRole: AgentRole = 'qa'; // Default

  if (initialAgentRole === 'developer') {
    primaryAgentEndpointPath = '/api/developer-agent';
    secondaryAgentEndpointPath = '/api/qa-agent';
    primaryAgentRole = 'developer';
    secondaryAgentRole = 'qa';
  } else if (initialAgentRole === 'qa') {
    primaryAgentEndpointPath = '/api/qa-agent';
    secondaryAgentEndpointPath = '/api/developer-agent';
    primaryAgentRole = 'qa';
    secondaryAgentRole = 'developer';
  } else {
    console.error(`[DispatchInstruction] Invalid agent type: ${initialAgentRole}`);
    const systemErrorLog: ChatMessage[] = [{ 
        from: 'system', 
        content: `Error: Invalid agent type '${initialAgentRole}'.`, 
        timestamp: Date.now(),
    }];
    return NextResponse.json({ result: { chatLog: systemErrorLog }}, { status: 400 });
  }
  
  const currentUrl = new URL(req.url); // Base URL of the current request

  // Initialize chat log with any previous messages and the user's new message
  let conversationLog: ChatMessage[] = [
    ...incomingChatLog, // Spread previous log entries if any were passed
    { 
      from: "user", 
      content: userPrompt, 
      timestamp: Date.now(),
    }
  ];
  
  console.log(`[DispatchInstruction] Starting turn 1: User to ${primaryAgentRole}`);
  // 1st Turn: User's prompt to the primary agent
  const primaryAgentFullUrl = new URL(primaryAgentEndpointPath, currentUrl).toString();
  const primaryAgentResponse = await callAgent(primaryAgentFullUrl, userPrompt, projectContext);

  if (primaryAgentResponse.error) {
    conversationLog.push({ from: primaryAgentRole, content: `Error: ${primaryAgentResponse.error}`, timestamp: Date.now() });
    // Return immediately on error from the first agent call
    return NextResponse.json({ result: { chatLog: conversationLog } }, { status: 500 });
  }
  conversationLog.push({ from: primaryAgentRole, content: primaryAgentResponse.reply!, timestamp: Date.now() });

  // Check for clarification request after 1st agent response
  if (primaryAgentResponse.reply && primaryAgentResponse.reply.toLowerCase().includes("clarify")) {
    console.log(`[DispatchInstruction] ${primaryAgentRole} requested clarification. Ending negotiation.`);
    return NextResponse.json({ result: { chatLog: conversationLog } });
  }

  let currentNegotiationPrompt = primaryAgentResponse.reply!;
  const MAX_NEGOTIATION_ROUNDS = 2; // Results in up to 3 agent turns total (Primary -> Secondary -> Primary)

  for (let round = 1; round <= MAX_NEGOTIATION_ROUNDS; round++) {
    const isSecondaryAgentTurn = round % 2 === 1;
    const currentResponderEndpointPath = isSecondaryAgentTurn ? secondaryAgentEndpointPath : primaryAgentEndpointPath;
    const currentResponderRole = isSecondaryAgentTurn ? secondaryAgentRole : primaryAgentRole;
    const nextTurnNumber = round + 1; // User is turn 0 effectively, Primary agent turn 1.

    console.log(`[DispatchInstruction] Starting negotiation round ${round} (Agent Turn ${nextTurnNumber}): ${currentResponderRole} responds`);
    const responderFullUrl = new URL(currentResponderEndpointPath, currentUrl).toString();
    const negotiationResponse = await callAgent(responderFullUrl, currentNegotiationPrompt, projectContext);

    if (negotiationResponse.error) {
      conversationLog.push({ from: currentResponderRole, content: `Error: ${negotiationResponse.error}`, timestamp: Date.now() });
      console.error(`[DispatchInstruction] Error in negotiation round ${round} from ${currentResponderRole}. Ending negotiation.`);
      break; // Exit loop on error
    }
    conversationLog.push({ from: currentResponderRole, content: negotiationResponse.reply!, timestamp: Date.now() });

    if (negotiationResponse.reply && negotiationResponse.reply.toLowerCase().includes("clarify")) {
      console.log(`[DispatchInstruction] ${currentResponderRole} requested clarification in round ${round}. Ending negotiation.`);
      break; // Exit loop if clarification is requested
    }
    currentNegotiationPrompt = negotiationResponse.reply!; // Update prompt for the next agent
    
    if (round === MAX_NEGOTIATION_ROUNDS) {
        console.log(`[DispatchInstruction] Max negotiation rounds (${MAX_NEGOTIATION_ROUNDS}) reached.`);
    }
  }

  console.log(`[DispatchInstruction] Negotiation complete. Total log entries: ${conversationLog.length}`);
  return NextResponse.json({ result: { chatLog: conversationLog } });
}

