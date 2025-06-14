
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

  const { agentType, instruction, files, language, framework } = requestBody;

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

  const agentPayload: Record<string, any> = {
    featureRequest: instruction, // Common field for instruction
    files,
    language,
    framework,
    // If QA agent needs specific 'developerResult', it should be handled here or by QA agent looking at 'featureRequest'
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

    // The agent (developer-agent or qa-agent) is now expected to return:
    // { from: "developer" | "qa", content: "...", timestamp: number }
    // If it doesn't, we wrap its response or error.
    
    let chatLogEntry;
    if (agentRes.ok && agentResultJson && typeof agentResultJson.from === 'string' && typeof agentResultJson.content === 'string') {
      chatLogEntry = agentResultJson;
    } else if (agentRes.ok && agentResultJson) { // Agent returned 200 but not in expected chat format
      console.warn(`[DispatchInstruction] Agent ${agentType} responded with 200 but unexpected format:`, agentResultJson);
      chatLogEntry = {
        from: agentIdentifier,
        content: `Agent responded with an unexpected format: ${JSON.stringify(agentResultJson).slice(0, 500)}`,
        timestamp: Date.now(),
      };
    } 
    else { // Agent call failed or returned error
      console.error(`[DispatchInstruction] Agent ${agentType} call failed or returned error. Status: ${agentRes.status}. Response:`, agentResultJson);
      const errorContent = agentResultJson?.content || agentResultJson?.error || JSON.stringify(agentResultJson) || 'Unknown error from agent.';
      chatLogEntry = {
        from: agentIdentifier, // Use agentIdentifier if available, otherwise system
        content: `Error interacting with ${agentType} agent (Status: ${agentRes.status}): ${String(errorContent).slice(0, 500)}`,
        timestamp: Date.now(),
      };
    }
    
    console.log('[InstructionDispatch] Interaction Log:', {
      requestTimestamp: new Date().toISOString(),
      agentType,
      instructionSummary: String(instruction).slice(0,100) + '...',
      filesCount: files ? Object.keys(files).length : 0,
      language,
      framework,
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
