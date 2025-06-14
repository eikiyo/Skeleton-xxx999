
import { type NextRequest, NextResponse } from 'next/server';

const OPEN_SOURCE_LLM_API_URL = process.env.DEVELOPER_API_URL;
const LLM_API_KEY = process.env.DEVELOPER_API_KEY;
const GUARDRAIL_PROMPT = process.env.DEVELOPER_GUARDRAIL_PROMPT;

export async function POST(req: NextRequest) {
  if (!OPEN_SOURCE_LLM_API_URL || !LLM_API_KEY || !GUARDRAIL_PROMPT) {
    console.error('[DeveloperAgent] Missing required environment variables (DEVELOPER_API_URL, DEVELOPER_API_KEY, DEVELOPER_GUARDRAIL_PROMPT)');
    const errorResponse = {
      from: "developer",
      content: 'Server configuration error: Missing required environment variables for Developer Agent.',
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[DeveloperAgent] Invalid JSON body:', error);
    const errorResponse = {
      from: "developer",
      content: 'Invalid JSON body received by Developer Agent.',
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { featureRequest, files, language, framework } = body;

  if (!featureRequest) {
    const errorResponse = {
      from: "developer",
      content: 'featureRequest is required in the request body for Developer Agent.',
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const prompt = `
${GUARDRAIL_PROMPT}
User Feature Request: ${featureRequest}
${files ? `\nExisting Project Context:\n${JSON.stringify(files).slice(0, 2000)}` : ''}
${language ? `\nPreferred Language: ${language}` : ''}
${framework ? `\nFramework: ${framework}` : ''}
`;

  try {
    const llmResponse = await fetch(OPEN_SOURCE_LLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[DeveloperAgent] LLM call failed with status ${llmResponse.status}:`, errorText);
      const errorResponse = {
        from: "developer",
        content: `Developer Agent: LLM call failed. Status: ${llmResponse.status}. Details: ${errorText.slice(0,500)}`,
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
      from: "developer",
      content: extractedContent,
      timestamp: Date.now(),
    };

    console.log('[DeveloperAgent] Interaction Log:', {
      requestBody: { featureRequest, language, framework, filesCount: files ? Object.keys(files).length : 0 },
      composedPromptLength: prompt.length,
      llmRawResponse: llmCallResult,
      formattedAgentResponse: agentResponseMessage
    });

    return NextResponse.json(agentResponseMessage);

  } catch (error: any) {
    console.error('[DeveloperAgent] Unexpected error:', error);
    const errorResponse = {
      from: "developer",
      content: `Developer Agent: Internal Server Error. Details: ${error.message || String(error)}`,
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
