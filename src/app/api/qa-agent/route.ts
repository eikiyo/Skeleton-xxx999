
import { type NextRequest, NextResponse } from 'next/server';

const QA_API_URL = process.env.QA_AGENT_API_URL;
const QA_API_KEY = process.env.QA_AGENT_API_KEY;
const QA_GUARDRAIL_PROMPT = process.env.QA_GUARDRAIL_PROMPT;

export async function POST(req: NextRequest) {
  if (!QA_API_URL || !QA_API_KEY || !QA_GUARDRAIL_PROMPT) {
    console.error('[QAAgent] Missing required environment variables (QA_AGENT_API_URL, QA_AGENT_API_KEY, QA_GUARDRAIL_PROMPT)');
    const errorResponse = {
      from: "qa",
      content: 'Server configuration error: Missing required QA agent environment variables.',
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[QAAgent] Invalid JSON body:', error);
    const errorResponse = {
      from: "qa",
      content: 'Invalid JSON body received by QA Agent.',
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { files, developerResult, featureRequest } = body; // featureRequest might be passed by dispatcher

  // QA agent might expect 'developerResult' or 'featureRequest' (instruction)
  // Based on dispatcher, 'featureRequest' holds the instruction.
  // We prioritize 'developerResult' if available, otherwise use 'featureRequest'.
  const mainInput = developerResult || featureRequest;

  if (!mainInput) {
    const errorResponse = {
      from: "qa",
      content: 'developerResult or featureRequest (instruction) is required in the request body for QA Agent.',
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }
  if (!files && developerResult) { // Files might be optional if it's just a general query to QA
     console.warn('[QAAgent] Files (project context) are not provided, but developerResult is. QA might need context.');
  }

  const prompt = `
${QA_GUARDRAIL_PROMPT}
${files ? `Project Files: ${JSON.stringify(files).slice(0, 2000)}` : 'No specific project files provided.'}
Developer Agent Output / User Instruction: ${typeof mainInput === 'string' ? mainInput : JSON.stringify(mainInput)}
`;

  try {
    const llmResponse = await fetch(QA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[QAAgent] QA LLM call failed with status ${llmResponse.status}:`, errorText);
      const errorResponse = {
        from: "qa",
        content: `QA Agent: LLM call failed. Status: ${llmResponse.status}. Details: ${errorText.slice(0,500)}`,
        timestamp: Date.now(),
      };
      return NextResponse.json(errorResponse, { status: llmResponse.status });
    }

    const llmCallResult = await llmResponse.json();
    let extractedContent: string;

    if (typeof llmCallResult === 'string') {
      extractedContent = llmCallResult;
    } else if (llmCallResult && typeof llmCallResult.text === 'string') {
      extractedContent = llmCallResult.text;
    } else if (llmCallResult && typeof llmCallResult.response === 'string') {
      extractedContent = llmCallResult.response;
    } else if (llmCallResult && llmCallResult.choices && Array.isArray(llmCallResult.choices) && llmCallResult.choices[0] && typeof llmCallResult.choices[0].message?.content === 'string') {
      extractedContent = llmCallResult.choices[0].message.content; // OpenAI-like
    } else if (llmCallResult && llmCallResult.choices && Array.isArray(llmCallResult.choices) && llmCallResult.choices[0] && typeof llmCallResult.choices[0].text === 'string') {
      extractedContent = llmCallResult.choices[0].text; // Older OpenAI-like
    } else if (llmCallResult && llmCallResult.candidates && Array.isArray(llmCallResult.candidates) && llmCallResult.candidates[0]?.content?.parts?.[0]?.text) {
      extractedContent = llmCallResult.candidates[0].content.parts[0].text; // Gemini-like
    } else if (llmCallResult && typeof llmCallResult.result === 'string'){
      extractedContent = llmCallResult.result;
    } else if (llmCallResult && typeof llmCallResult.result === 'object' && typeof llmCallResult.result.text === 'string'){
      extractedContent = llmCallResult.result.text;
    }
     else {
      extractedContent = JSON.stringify(llmCallResult);
    }
    
    const agentResponseMessage = {
      from: "qa",
      content: extractedContent,
      timestamp: Date.now(),
    };

    console.log('[QAAgent] Interaction Log:', {
      requestBody: { filesCount: files ? Object.keys(files).length : 0, mainInputSummary: String(mainInput).slice(0,100) + '...' },
      composedPromptLength: prompt.length,
      llmRawResponse: llmCallResult,
      formattedAgentResponse: agentResponseMessage
    });

    return NextResponse.json(agentResponseMessage);

  } catch (error: any) {
    console.error('[QAAgent] Unexpected error:', error);
    const errorResponse = {
      from: "qa",
      content: `QA Agent: Internal Server Error. Details: ${error.message || String(error)}`,
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
