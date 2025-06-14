
// /src/app/api/dispatch-instruction/route.ts

import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (error) {
    console.error('[DispatchInstruction] Invalid JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentType, instruction, files, language, framework } = requestBody;

  if (!agentType || !instruction) {
    return NextResponse.json({ error: 'Missing agentType or instruction' }, { status: 400 });
  }

  let agentUrlPath = '';
  if (agentType === 'developer') {
    agentUrlPath = '/api/developer-agent';
  } else if (agentType === 'qa') {
    agentUrlPath = '/api/qa-agent';
  } else {
    console.error(`[DispatchInstruction] Invalid agent type: ${agentType}`);
    return NextResponse.json({ error: 'Invalid agent type' }, { status: 400 });
  }

  // Construct the full URL for the internal fetch
  // req.url gives the full URL of the current request, e.g., http://localhost:9002/api/dispatch-instruction
  // We need to replace the path part with the target agent's path.
  const currentUrl = new URL(req.url);
  const agentFullUrl = `${currentUrl.origin}${agentUrlPath}`;

  const agentPayload: Record<string, any> = {
    featureRequest: instruction, // For Developer Agent
    files,
    language,
    framework,
  };

  // For QA Agent, the original example for qa-agent API expects 'developerResult'
  // but the dispatch example sends 'featureRequest'.
  // We are sticking to the dispatch example, so QA agent will receive 'featureRequest'.
  // If the QA agent specifically needs 'developerResult', it might need an update,
  // or the dispatcher logic here would need to be more complex to map fields.
  // For now, sending 'featureRequest' as 'instruction' to QA agent as well.
  if (agentType === 'qa') {
    // If QA agent strictly needs 'developerResult', this should be:
    // agentPayload.developerResult = instruction;
    // delete agentPayload.featureRequest; 
    // However, sticking to the provided dispatcher example which sends 'featureRequest'
    // to both.
  }


  try {
    const agentRes = await fetch(agentFullUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Potentially forward other relevant headers if needed
      },
      body: JSON.stringify(agentPayload),
    });

    const resultText = await agentRes.text(); // Read response text first for better error reporting
    let result;
    try {
        result = JSON.parse(resultText);
    } catch (e) {
        console.error(`[DispatchInstruction] Agent ${agentType} response is not valid JSON:`, resultText);
        return NextResponse.json({ error: `Agent ${agentType} call failed: Non-JSON response`, details: resultText }, { status: 502 }); // Bad Gateway
    }

    if (!agentRes.ok) {
      console.error(`[DispatchInstruction] Agent ${agentType} call failed with status ${agentRes.status}:`, result);
      return NextResponse.json({ error: `Agent ${agentType} call failed`, details: result }, { status: agentRes.status });
    }

    // Log all interactions
    console.log('[InstructionDispatch] Interaction Log:', {
      requestTimestamp: new Date().toISOString(),
      agentType,
      instruction,
      filesCount: files ? Object.keys(files).length : 0, // Avoid logging potentially large 'files' content
      language,
      framework,
      agentResult: result // Consider summarizing or truncating if very large
    });

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error(`[DispatchInstruction] Error calling agent ${agentType} at ${agentFullUrl}:`, error);
    return NextResponse.json({ error: 'Internal Server Error during agent dispatch', details: error.message || String(error) }, { status: 500 });
  }
}
