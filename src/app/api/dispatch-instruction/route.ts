
// /src/app/api/dispatch-instruction/route.ts

import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (error) {
    console.error('[DispatchInstruction] Invalid JSON body:', error);
    return NextResponse.json({ result: { chatLog: [{ from: 'system', content: 'Error: Invalid JSON body provided to dispatcher.', timestamp: Date.now() }] }}, { status: 400 });
  }

  const { agentType, instruction, files /* language, framework are no longer directly used by new agent handlers */ } = requestBody;

  if (!agentType || !instruction) {
    console.error('[DispatchInstruction] Missing agentType or instruction');
    return NextResponse.json({ result: { chatLog: [{ from: 'system', content: 'Error: Missing agentType or instruction in dispatch request.', timestamp: Date.now() }] }}, { status: 400 });
  }

  let agentUrlPath = '';
  let agentIdentifier: 'developer' | 'qa' | 'system' = 'system';

  if (agentType === 'developer') {
    agentUrlPath = '/api/developer-agent';
    agentIdentifier = 'developer';
  } else if (agentType === 'qa') {
    agentUrlPath = '/api/qa-agent';
    agentIdentifier = 'qa';
  } else {
    console.error(`[DispatchInstruction] Invalid agent type: ${agentType}`);
    return NextResponse.json({ result: { chatLog: [{ from: 'system', content: `Error: Invalid agent type '${agentType}'.`, timestamp: Date.now() }] }}, { status: 400 });
  }

  const currentUrl = new URL(req.url);
  const agentFullUrl = `${currentUrl.origin}${agentUrlPath}`;

  // New agent handlers expect 'prompt' and 'context'
  const agentPayload = {
    prompt: instruction,
    context: files ? JSON.stringify(files).slice(0, 2000) : undefined, // Pass files as stringified context
  };

  try {
    const agentRes = await fetch(agentFullUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentPayload),
    });

    const agentResultJson = await agentRes.json();
    
    let chatLogEntry;

    // New agent handlers return { from: "...", content: "...", timestamp: ... } directly on success
    // or { from: "...", content: "Error message...", timestamp: ...} on handled error
    if (agentResultJson && typeof agentResultJson.from === 'string' && typeof agentResultJson.content === 'string') {
      chatLogEntry = agentResultJson;
    } else if (agentRes.ok && agentResultJson && typeof agentResultJson.reply === 'string') { 
      // This case is for the immediate {reply: "..."} if agents don't return full chatlog entry yet
      // This might be redundant if agent handlers are updated to return the full entry
      chatLogEntry = {
        from: agentIdentifier,
        content: agentResultJson.reply,
        timestamp: Date.now(),
      };
    } else { // Agent call failed (non-2xx) or unexpected response format
      console.error(`[DispatchInstruction] Agent ${agentType} call failed or returned error. Status: ${agentRes.status}. Response:`, agentResultJson);
      const errorContent = agentResultJson?.content || agentResultJson?.error || agentResultJson?.details || JSON.stringify(agentResultJson) || 'Unknown error from agent.';
      chatLogEntry = {
        from: agentIdentifier, 
        content: `Error interacting with ${agentType} agent (Status: ${agentRes.status}): ${String(errorContent).slice(0, 500)}`,
        timestamp: Date.now(),
      };
    }
    
    console.log('[InstructionDispatch] Interaction Log:', {
      requestTimestamp: new Date().toISOString(),
      agentType,
      instructionSummary: String(instruction).slice(0,100) + '...',
      contextProvided: !!agentPayload.context,
      agentResponseForChat: chatLogEntry 
    });

    return NextResponse.json({ result: { chatLog: [chatLogEntry] } });

  } catch (error: any) {
    console.error(`[DispatchInstruction] Error calling agent ${agentType} at ${agentFullUrl}:`, error);
    const systemError = {
        from: 'system',
        content: `Internal Server Error during agent dispatch: ${error.message || String(error)}`,
        timestamp: Date.now()
    };
    return NextResponse.json({ result: { chatLog: [systemError] } }, { status: 500 });
  }
}
