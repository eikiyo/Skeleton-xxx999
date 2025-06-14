
// /src/app/api/dispatch-instruction/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import type { LogEntry } from '@/context/LogContext'; // Assuming LogEntry is defined here or in types

export async function POST(req: NextRequest) {
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (error) {
    console.error('[DispatchInstruction] Invalid JSON body:', error);
    const systemErrorLog: LogEntry[] = [{ 
        from: 'system', // 'from' should match LogEntry's source type
        content: 'Error: Invalid JSON body provided to dispatcher.', 
        timestamp: Date.now(),
        id: Date.now().toString() + Math.random().toString() // Add id for LogEntry
    }];
    return NextResponse.json({ result: { chatLog: systemErrorLog }}, { status: 400 });
  }

  const { agentType, instruction, files, chatLog: incomingChatLog = [] } = requestBody;
  // 'instruction' from frontend is the 'prompt' for agents.
  // 'files' from frontend is the 'context' for agents.

  if (!agentType || !instruction) {
    console.error('[DispatchInstruction] Missing agentType or instruction');
    const systemErrorLog: LogEntry[] = [{ 
        from: 'system', 
        content: 'Error: Missing agentType or instruction in dispatch request.', 
        timestamp: Date.now(),
        id: Date.now().toString() + Math.random().toString() 
    }];
    return NextResponse.json({ result: { chatLog: systemErrorLog }}, { status: 400 });
  }

  let agentEndpointPath = '';
  let agentIdentifier: LogEntry['source'] = 'system'; // Default, will be overridden

  if (agentType === 'developer') {
    agentEndpointPath = '/api/developer-agent';
    agentIdentifier = 'developer';
  } else if (agentType === 'qa') {
    agentEndpointPath = '/api/qa-agent';
    agentIdentifier = 'qa';
  } else {
    console.error(`[DispatchInstruction] Invalid agent type: ${agentType}`);
    const systemErrorLog: LogEntry[] = [{ 
        from: 'system', 
        content: `Error: Invalid agent type '${agentType}'.`, 
        timestamp: Date.now(),
        id: Date.now().toString() + Math.random().toString()
    }];
    return NextResponse.json({ result: { chatLog: systemErrorLog }}, { status: 400 });
  }

  const currentUrl = new URL(req.url);
  const agentFullUrl = `${currentUrl.origin}${agentEndpointPath}`;

  const agentPayload = {
    prompt: instruction, // User's instruction becomes the agent's prompt
    context: files ? JSON.stringify(files).slice(0, 5000) : undefined, // Pass files as stringified context, limit size
  };

  // Initialize newLog with a copy of incomingChatLog and the user's new message
  const newLog: Omit<LogEntry, 'id'>[] = [ // Use Omit as id will be added by LogContext or frontend
    ...incomingChatLog, // Spread previous log entries
    { 
      from: "user", 
      content: instruction, 
      timestamp: Date.now() 
    }
  ];


  try {
    console.log(`[DispatchInstruction] Calling ${agentIdentifier} agent at ${agentFullUrl} with prompt: "${instruction.substring(0,50)}..."`);
    const agentRes = await fetch(agentFullUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentPayload),
    });

    const agentResponseData = await agentRes.json();
    
    let agentReplyContent = "No reply from agent or error.";
    if (agentRes.ok && agentResponseData && typeof agentResponseData.reply === 'string') {
      agentReplyContent = agentResponseData.reply;
    } else if (!agentRes.ok && agentResponseData && typeof agentResponseData.reply === 'string') { // Agent returned an error with a reply field
      agentReplyContent = `Error from ${agentIdentifier} (Status: ${agentRes.status}): ${agentResponseData.reply}`;
      console.error(`[DispatchInstruction] Agent ${agentIdentifier} call failed. Status: ${agentRes.status}. Response:`, agentResponseData.reply);
    } else { // Other types of errors or unexpected responses
      const errorDetails = JSON.stringify(agentResponseData).slice(0, 200);
      agentReplyContent = `Error interacting with ${agentIdentifier} agent (Status: ${agentRes.status}). Details: ${errorDetails}`;
      console.error(`[DispatchInstruction] Agent ${agentIdentifier} call failed or returned unexpected response. Status: ${agentRes.status}. Response:`, agentResponseData);
    }
    
    // Add agent's response to the newLog
    newLog.push({
      from: agentIdentifier,
      content: agentReplyContent,
      timestamp: Date.now(),
    });
    
    console.log(`[DispatchInstruction] ${agentIdentifier} agent replied. Total log entries: ${newLog.length}`);

    // The frontend InstructionChat expects an array of LogEntry, each with an id.
    // The LogContext on the frontend will typically handle adding IDs when logs are added.
    // Here, we are constructing the full log to send back.
    // For compatibility with InstructionChat, ensure entries from here match its expected structure
    // or let InstructionChat handle ID generation when it receives this log.
    // For now, we assume InstructionChat will handle IDs or the LogContext handles it.
    // Let's make sure returned logs have 'id' for direct use in frontend if it expects it.
     const finalLogForFrontend = newLog.map(entry => ({
      ...entry,
      id: (entry as any).id || (Date.now().toString() + Math.random().toString()) // Ensure ID exists
    }));


    return NextResponse.json({ result: { chatLog: finalLogForFrontend } });

  } catch (error: any) {
    console.error(`[DispatchInstruction] Error calling agent ${agentType} at ${agentFullUrl}:`, error);
    // Add system error to the log and return
    newLog.push({
        from: 'system',
        content: `Internal Server Error during agent dispatch: ${error.message || String(error)}`,
        timestamp: Date.now()
    });
     const finalLogForFrontendOnError = newLog.map(entry => ({
      ...entry,
      id: (entry as any).id || (Date.now().toString() + Math.random().toString())
    }));
    return NextResponse.json({ result: { chatLog: finalLogForFrontendOnError } }, { status: 500 });
  }
}
